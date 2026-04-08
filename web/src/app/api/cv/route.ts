import { NextRequest, NextResponse } from "next/server";
import { readCv, writeCv } from "@/lib/writers";

export async function GET() {
  const content = readCv();
  return NextResponse.json({ data: content });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  writeCv(body.content);
  return NextResponse.json({ success: true });
}
