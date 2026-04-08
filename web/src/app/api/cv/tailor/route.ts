import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";

export async function POST(request: NextRequest) {
  try {
    const { reportPath, company, title } = await request.json();
    if (!reportPath || !company) {
      return NextResponse.json({ error: "reportPath and company required" }, { status: 400 });
    }

    // Read the report to get evaluation context
    const fullReportPath = path.join(paths.root, reportPath);
    if (!fs.existsSync(fullReportPath)) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const reportContent = fs.readFileSync(fullReportPath, "utf-8");

    // Read base CV
    if (!fs.existsSync(paths.cv)) {
      return NextResponse.json({ error: "cv.md not found. Upload a resume first." }, { status: 400 });
    }
    const baseCv = fs.readFileSync(paths.cv, "utf-8");

    // Check claude CLI
    const claudeAvailable = await new Promise<boolean>((resolve) => {
      const proc = spawn("which", ["claude"]);
      proc.on("close", (code) => resolve(code === 0));
      proc.on("error", () => resolve(false));
    });

    if (!claudeAvailable) {
      return NextResponse.json({
        error: "Claude CLI not found",
      }, { status: 503 });
    }

    // Generate tailored CV
    const prompt = `You are an expert ATS-optimized resume writer. Given the base CV and the evaluation report for a specific role, create a tailored version of the CV.

RULES:
- NEVER invent skills, experiences, or metrics the candidate doesn't have
- Reorder bullet points to prioritize the most relevant ones for this role
- Inject relevant keywords from the job description into the summary and existing bullets
- Adjust the summary/headline to align with this specific role
- Keep all dates, companies, and facts unchanged
- Output ONLY the tailored markdown CV, no commentary

<base_cv>
${baseCv}
</base_cv>

<evaluation_report>
${reportContent}
</evaluation_report>

Target role: ${title} at ${company}

Output the tailored CV in markdown:`;

    const tailoredMd = await new Promise<string>((resolve, reject) => {
      const proc = spawn("claude", ["-p", "--no-input"], {
        cwd: paths.root,
        env: { ...process.env },
      });
      let stdout = "";
      let stderr = "";
      proc.stdin.write(prompt);
      proc.stdin.end();
      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0 && stdout.trim()) resolve(stdout.trim());
        else reject(new Error(stderr || `Exit code ${code}`));
      });
      proc.on("error", reject);
    });

    // Write tailored markdown
    const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    const tailoredMdPath = path.join(paths.outputDir, `${slug}-tailored-cv.md`);
    if (!fs.existsSync(paths.outputDir)) fs.mkdirSync(paths.outputDir, { recursive: true });
    fs.writeFileSync(tailoredMdPath, tailoredMd, "utf-8");

    // Generate PDF using generate-pdf.mjs
    // First write to temp HTML using the template
    let pdfPath: string | null = null;
    const pdfFilename = `${slug}-tailored.pdf`;
    const fullPdfPath = path.join(paths.outputDir, pdfFilename);

    try {
      // Use the existing template
      if (fs.existsSync(paths.cvTemplate)) {
        const template = fs.readFileSync(paths.cvTemplate, "utf-8");
        // Simple markdown-to-html: replace the content placeholder
        const htmlContent = template.replace(
          /{{CONTENT}}/g,
          tailoredMd
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>")
        );
        const tempHtmlPath = path.join(paths.outputDir, `${slug}-temp.html`);
        fs.writeFileSync(tempHtmlPath, htmlContent, "utf-8");

        await new Promise<void>((resolve, reject) => {
          const proc = spawn("node", [paths.scripts.generatePdf, tempHtmlPath, fullPdfPath], {
            cwd: paths.root,
          });
          proc.on("close", (code) => {
            // Clean up temp HTML
            try { fs.unlinkSync(tempHtmlPath); } catch {}
            if (code === 0) resolve();
            else reject(new Error(`PDF generation exited with code ${code}`));
          });
          proc.on("error", reject);
        });
        pdfPath = `output/${pdfFilename}`;
      }
    } catch {
      // PDF generation is nice-to-have; tailored markdown is the main output
    }

    return NextResponse.json({
      data: {
        tailoredMdPath: `output/${slug}-tailored-cv.md`,
        pdfPath,
        company,
        title,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tailoring failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
