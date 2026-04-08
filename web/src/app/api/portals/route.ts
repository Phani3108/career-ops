import { NextRequest, NextResponse } from "next/server";
import { parsePortals } from "@/lib/parsers";
import { writePortals } from "@/lib/writers";
import type { PortalsConfig } from "@/lib/types";

export async function GET() {
  const portals = parsePortals();
  return NextResponse.json({ data: portals });
}

export async function PUT(request: NextRequest) {
  const body = await request.json() as PortalsConfig;
  writePortals(body);
  return NextResponse.json({ success: true });
}
