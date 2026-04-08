import { NextResponse } from "next/server";
import { parseApplications } from "@/lib/parsers";
import { computeMetrics } from "@/lib/metrics";

export async function GET() {
  const apps = parseApplications();
  const metrics = computeMetrics(apps);
  return NextResponse.json({ data: apps, metrics });
}
