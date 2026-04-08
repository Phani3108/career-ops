import { NextResponse } from "next/server";
import { parseStates } from "@/lib/parsers";

export async function GET() {
  const states = parseStates();
  return NextResponse.json({ data: states });
}
