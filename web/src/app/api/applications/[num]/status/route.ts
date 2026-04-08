import { NextRequest, NextResponse } from "next/server";
import { updateApplicationStatus } from "@/lib/writers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ num: string }> }
) {
  const { num } = await params;
  const body = await request.json();
  const { status, notes } = body;

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const ok = updateApplicationStatus(parseInt(num, 10), status, notes);
  if (!ok) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
