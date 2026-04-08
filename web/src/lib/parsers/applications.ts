import fs from "fs";
import { paths } from "../paths";
import type { Application } from "../types";

const reScoreValue = /(\d+\.?\d*)\/5/;
const reReportLink = /\[(\d+)\]\(([^)]+)\)/;

function normalizeStatus(raw: string): string {
  let s = raw.trim();
  // Strip markdown bold
  s = s.replace(/\*\*/g, "");
  // Strip trailing dates
  s = s.replace(/\s*\d{4}-\d{2}-\d{2}\s*$/, "");
  s = s.trim();
  
  const lower = s.toLowerCase();
  const aliasMap: Record<string, string> = {
    evaluated: "Evaluated", evaluada: "Evaluated",
    applied: "Applied", aplicado: "Applied", enviada: "Applied", aplicada: "Applied", sent: "Applied",
    responded: "Responded", respondido: "Responded",
    interview: "Interview", entrevista: "Interview",
    offer: "Offer", oferta: "Offer",
    rejected: "Rejected", rechazado: "Rejected", rechazada: "Rejected",
    discarded: "Discarded", descartado: "Discarded", descartada: "Discarded",
    cerrada: "Discarded", cancelada: "Discarded",
    skip: "SKIP", "no_aplicar": "SKIP", "no aplicar": "SKIP", monitor: "SKIP",
  };
  return aliasMap[lower] || s;
}

export function parseApplications(): Application[] {
  let filePath = paths.applicationsMd;
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const apps: Application[] = [];

  for (const line of lines) {
    // Must be a table row starting with |
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 9) continue;
    // Skip header and separator rows
    if (cells[0] === "#" || cells[0].startsWith("-")) continue;
    if (/^-+$/.test(cells[0])) continue;

    const num = parseInt(cells[0], 10);
    if (isNaN(num)) continue;

    const scoreMatch = cells[4]?.match(reScoreValue);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;

    const reportMatch = cells[7]?.match(reReportLink);

    apps.push({
      num,
      date: cells[1] || "",
      company: cells[2] || "",
      role: cells[3] || "",
      score,
      scoreRaw: cells[4] || "",
      status: normalizeStatus(cells[5] || ""),
      hasPDF: (cells[6] || "").includes("✅"),
      reportPath: reportMatch ? reportMatch[2] : "",
      reportNumber: reportMatch ? reportMatch[1] : "",
      notes: cells[8] || "",
    });
  }

  return apps;
}

export { normalizeStatus };
