import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";

export async function GET() {
  if (!fs.existsSync(paths.interviewPrepDir)) {
    return NextResponse.json({ data: [] });
  }

  const files = fs.readdirSync(paths.interviewPrepDir)
    .filter((f) => f.endsWith(".md") && f !== "story-bank.md")
    .map((f) => {
      const content = fs.readFileSync(path.join(paths.interviewPrepDir, f), "utf-8");
      const h1 = content.match(/^#\s+(.+)$/m);
      return {
        slug: f.replace(".md", ""),
        filename: f,
        title: h1 ? h1[1] : f.replace(".md", "").replace(/-/g, " "),
      };
    });

  return NextResponse.json({ data: files });
}
