import { NextResponse } from "next/server";
import fs from "fs";
import { paths } from "@/lib/paths";
import type { BatchEntry } from "@/lib/types";

export async function GET() {
  // Parse batch state
  let entries: BatchEntry[] = [];
  if (fs.existsSync(paths.batchState)) {
    const content = fs.readFileSync(paths.batchState, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    const startIdx = lines[0]?.startsWith("id") ? 1 : 0;
    entries = lines.slice(startIdx).map((line) => {
      const cols = line.split("\t");
      return {
        id: cols[0] || "",
        url: cols[1] || "",
        status: (cols[2] || "pending") as BatchEntry["status"],
        startedAt: cols[3] || undefined,
        completedAt: cols[4] || undefined,
        reportNum: cols[5] || undefined,
        score: cols[6] || undefined,
        error: cols[7] || undefined,
        retries: cols[8] ? parseInt(cols[8], 10) : undefined,
      };
    });
  }

  // Check for pending tracker additions
  let pendingMerge = 0;
  if (fs.existsSync(paths.trackerAdditions)) {
    pendingMerge = fs.readdirSync(paths.trackerAdditions).filter((f) => f.endsWith(".tsv")).length;
  }

  return NextResponse.json({ data: { entries, pendingMerge } });
}
