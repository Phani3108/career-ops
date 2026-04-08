import { NextRequest } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import { paths } from "@/lib/paths";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { jdText, url } = body;

  if (!jdText && !url) {
    return new Response(JSON.stringify({ error: "jdText or url required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check that claude CLI is available
  const claudeAvailable = await new Promise<boolean>((resolve) => {
    const proc = spawn("which", ["claude"]);
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });

  if (!claudeAvailable) {
    return new Response(
      JSON.stringify({
        error: "Claude CLI not found. Install from https://claude.ai/download and run `claude login`.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build the prompt
  const parts: string[] = [];

  // Load context files
  const contextFiles = [
    { path: paths.sharedMd, label: "_shared.md" },
    { path: paths.profileMd, label: "_profile.md" },
    { path: paths.cv, label: "cv.md" },
    { path: paths.profileYml, label: "profile.yml" },
    { path: paths.articleDigest, label: "article-digest.md" },
  ];

  for (const cf of contextFiles) {
    if (fs.existsSync(cf.path)) {
      const content = fs.readFileSync(cf.path, "utf-8");
      parts.push(`<file name="${cf.label}">\n${content}\n</file>`);
    }
  }

  // Load auto-pipeline mode
  const modePath = `${paths.modesDir}/auto-pipeline.md`;
  if (fs.existsSync(modePath)) {
    const mode = fs.readFileSync(modePath, "utf-8");
    parts.push(`<file name="auto-pipeline.md">\n${mode}\n</file>`);
  }

  // Add the JD
  if (url) {
    parts.push(`\nEvaluate this job offer: ${url}\n`);
  } else {
    parts.push(`\nEvaluate this job description:\n\n${jdText}\n`);
  }

  const prompt = parts.join("\n\n");

  // Stream response via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn("claude", ["-p", "--no-input"], {
        cwd: paths.root,
        env: { ...process.env },
      });

      proc.stdin.write(prompt);
      proc.stdin.end();

      proc.stdout.on("data", (data) => {
        const text = data.toString();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", text })}\n\n`));
      });

      proc.stderr.on("data", (data) => {
        const text = data.toString();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "stderr", text })}\n\n`));
      });

      proc.on("close", (code) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done", exitCode: code })}\n\n`)
        );
        controller.close();
      });

      proc.on("error", (err) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", text: err.message })}\n\n`)
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
