import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const safeName = path.basename(slug);
  const filePath = path.join(paths.interviewPrepDir, `${safeName}.md`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return NextResponse.json({ data: { slug: safeName, content } });
}
