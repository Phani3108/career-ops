import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";

export async function GET() {
  if (!fs.existsSync(paths.outputDir)) {
    return NextResponse.json({ data: [] });
  }
  const files = fs.readdirSync(paths.outputDir)
    .filter((f) => f.endsWith(".pdf"))
    .map((f) => ({
      filename: f,
      size: fs.statSync(path.join(paths.outputDir, f)).size,
      modified: fs.statSync(path.join(paths.outputDir, f)).mtime.toISOString(),
    }))
    .sort((a, b) => b.modified.localeCompare(a.modified));

  return NextResponse.json({ data: files });
}
