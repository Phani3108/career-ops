import { NextResponse } from "next/server";
import { listReports } from "@/lib/parsers";

export async function GET() {
  const reports = listReports();
  return NextResponse.json({ data: reports });
}
