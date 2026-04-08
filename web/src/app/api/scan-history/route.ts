import { NextResponse } from "next/server";
import { parseScanHistory } from "@/lib/parsers";

export async function GET() {
  const history = parseScanHistory();
  return NextResponse.json({ data: history });
}
