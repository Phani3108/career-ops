import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";

export async function POST(request: NextRequest) {
  try {
    const { jobs } = await request.json();
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ error: "jobs array required" }, { status: 400 });
    }

    // Check claude CLI
    const claudeAvailable = await new Promise<boolean>((resolve) => {
      const proc = spawn("which", ["claude"]);
      proc.on("close", (code) => resolve(code === 0));
      proc.on("error", () => resolve(false));
    });

    if (!claudeAvailable) {
      return NextResponse.json({
        error: "Claude CLI not found. Install from https://claude.ai/download",
      }, { status: 503 });
    }

    // Load context files once
    const contextParts: string[] = [];
    const contextFiles = [
      { path: paths.sharedMd, label: "_shared.md" },
      { path: paths.profileMd, label: "_profile.md" },
      { path: paths.cv, label: "cv.md" },
      { path: paths.profileYml, label: "profile.yml" },
      { path: paths.articleDigest, label: "article-digest.md" },
    ];
    for (const cf of contextFiles) {
      if (fs.existsSync(cf.path)) {
        contextParts.push(`<file name="${cf.label}">\n${fs.readFileSync(cf.path, "utf-8")}\n</file>`);
      }
    }
    const modePath = path.join(paths.modesDir, "auto-pipeline.md");
    if (fs.existsSync(modePath)) {
      contextParts.push(`<file name="auto-pipeline.md">\n${fs.readFileSync(modePath, "utf-8")}\n</file>`);
    }
    const contextBlock = contextParts.join("\n\n");

    // Process jobs sequentially
    const results: Array<{
      url: string;
      status: "scored" | "failed";
      score?: string;
      reportPath?: string;
      error?: string;
    }> = [];

    for (const job of jobs) {
      const { url, title, company } = job;
      try {
        const prompt = `${contextBlock}\n\nEvaluate this job offer: ${url}\nTitle: ${title}\nCompany: ${company}`;

        const output = await new Promise<string>((resolve, reject) => {
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

        // Extract score from output
        const scoreMatch = output.match(/(?:Score|Puntuación|Nota)[:\s]*(\d+\.?\d*)\/5/i);
        const score = scoreMatch ? scoreMatch[1] : undefined;

        // Determine report number
        let maxNum = 0;
        if (fs.existsSync(paths.reportsDir)) {
          const files = fs.readdirSync(paths.reportsDir);
          for (const f of files) {
            const m = f.match(/^(\d+)/);
            if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
          }
        }
        const num = String(maxNum + 1).padStart(3, "0");
        const slug = (company || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
        const date = new Date().toISOString().split("T")[0];
        const reportFilename = `${num}-${slug}-${date}.md`;
        const reportPath = path.join(paths.reportsDir, reportFilename);

        // Write report
        if (!fs.existsSync(paths.reportsDir)) fs.mkdirSync(paths.reportsDir, { recursive: true });
        fs.writeFileSync(reportPath, output, "utf-8");

        // Write tracker TSV
        const additionsDir = paths.trackerAdditions;
        if (!fs.existsSync(additionsDir)) fs.mkdirSync(additionsDir, { recursive: true });
        const tsvLine = `${parseInt(num)}\t${date}\t${company || "Unknown"}\t${title || "Unknown"}\tEvaluated\t${score || "?"}\/5\t❌\t[${num}](reports/${reportFilename})\tAuto-evaluated`;
        fs.writeFileSync(path.join(additionsDir, `${num}-${slug}.tsv`), tsvLine, "utf-8");

        results.push({
          url,
          status: "scored",
          score: score ? `${score}/5` : undefined,
          reportPath: `reports/${reportFilename}`,
        });
      } catch (err) {
        results.push({
          url,
          status: "failed",
          error: err instanceof Error ? err.message : "Evaluation failed",
        });
      }
    }

    // Run merge-tracker
    try {
      await new Promise<void>((resolve) => {
        const proc = spawn("node", [paths.scripts.mergeTracker], { cwd: paths.root });
        proc.on("close", () => resolve());
        proc.on("error", () => resolve());
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({ data: { results, total: results.length } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Batch evaluate failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
