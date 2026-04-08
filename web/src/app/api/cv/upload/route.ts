import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "A PDF file is required" },
        { status: 400 }
      );
    }

    // Read PDF buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save original PDF as backup
    const outputDir = paths.outputDir;
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const backupPath = path.join(outputDir, "original-resume.pdf");
    fs.writeFileSync(backupPath, buffer);

    // Extract text from PDF
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(buffer);
    const rawText = parsed.text;

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract meaningful text from the PDF. The file may be image-based." },
        { status: 422 }
      );
    }

    // Use Claude CLI to convert raw text to structured markdown
    const { spawn } = await import("child_process");
    const claudeAvailable = await new Promise<boolean>((resolve) => {
      const proc = spawn("which", ["claude"]);
      proc.on("close", (code) => resolve(code === 0));
      proc.on("error", () => resolve(false));
    });

    let markdown: string;

    if (claudeAvailable) {
      const prompt = `Convert the following raw text extracted from a PDF resume into clean, well-structured Markdown. Use these sections: # Name, ## Summary, ## Experience (each role as ### Company — Title with dates and bullets), ## Projects (if any), ## Education, ## Skills. Preserve ALL facts, metrics, dates, and details exactly. Do NOT invent anything. Output ONLY the markdown, no commentary.\n\n---\n\n${rawText}`;

      markdown = await new Promise<string>((resolve, reject) => {
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
          if (code === 0 && stdout.trim()) {
            resolve(stdout.trim());
          } else {
            reject(new Error(stderr || "Claude CLI failed to process resume"));
          }
        });
        proc.on("error", reject);
      });
    } else {
      // Fallback: basic structure from raw text (no AI)
      markdown = `# Resume\n\n${rawText.split(/\n{2,}/).map((block: string) => block.trim()).filter(Boolean).join("\n\n")}`;
    }

    // Write cv.md
    fs.writeFileSync(paths.cv, markdown, "utf-8");

    return NextResponse.json({
      data: {
        markdown,
        rawTextLength: rawText.length,
        backupPath: "output/original-resume.pdf",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
