import { NextRequest, NextResponse } from "next/server";
import { parseProfile } from "@/lib/parsers";
import { writeProfile } from "@/lib/writers";
import type { Profile } from "@/lib/types";

export async function GET() {
  const profile = parseProfile();
  return NextResponse.json({ data: profile });
}

export async function PUT(request: NextRequest) {
  const body = await request.json() as Profile;
  writeProfile(body);
  return NextResponse.json({ success: true });
}
