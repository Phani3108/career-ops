import type { Application, PipelineMetrics } from "./types";

export function computeMetrics(apps: Application[]): PipelineMetrics {
  const byStatus: Record<string, number> = {};
  let scoreSum = 0;
  let scoreCount = 0;
  let topScore = 0;
  let withPDF = 0;
  let actionable = 0;

  for (const app of apps) {
    const s = app.status || "Unknown";
    byStatus[s] = (byStatus[s] || 0) + 1;

    if (app.score !== null) {
      scoreSum += app.score;
      scoreCount++;
      if (app.score > topScore) topScore = app.score;
    }

    if (app.hasPDF) withPDF++;

    // Actionable: Evaluated with score >= 4.0
    if (app.status === "Evaluated" && app.score !== null && app.score >= 4.0) {
      actionable++;
    }
  }

  return {
    total: apps.length,
    byStatus,
    avgScore: scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 100) / 100 : 0,
    topScore,
    withPDF,
    actionable,
  };
}
