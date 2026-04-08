import { NextRequest, NextResponse } from "next/server";
import { parsePipeline } from "@/lib/parsers";
import { addPipelineUrl, removePipelineUrl } from "@/lib/writers";

export async function GET() {
  const pipeline = parsePipeline();
  return NextResponse.json({ data: pipeline });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }
  addPipelineUrl(url);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lineIndex = parseInt(searchParams.get("lineIndex") || "", 10);
  if (isNaN(lineIndex)) {
    return NextResponse.json({ error: "lineIndex is required" }, { status: 400 });
  }
  removePipelineUrl(lineIndex);
  return NextResponse.json({ success: true });
}
