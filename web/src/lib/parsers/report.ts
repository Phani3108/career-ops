import fs from "fs";
import path from "path";
import { paths } from "../paths";
import type { ReportMeta, ReportFull } from "../types";

const reArchetype = /\*\*(?:Archetype|Arquetipo|Archetyp|Archétype)\s*[:：]\*\*\s*(.+)/i;
const reTlDr = /\*\*TL;DR\s*[:：]\*\*\s*(.+)/i;
const reRemote = /\*\*(?:Remote|Remoto|Trabajo remoto|Télétravail)\s*[:：]\*\*\s*(.+)/i;
const reComp = /\*\*(?:Comp|Compensation|Compensación|Rémunération|Vergütung)\s*(?:estimate|estimada|estimée)?\s*[:：]\*\*\s*(.+)/i;
const reScore = /\*\*(?:Score|Puntuación|Note|Bewertung)\s*[:：]\*\*\s*(\d+\.?\d*)\/5/i;
const reURL = /\*\*URL\s*[:：]\*\*\s*(https?:\/\/[^\s]+)/i;
const reReportFilename = /^(\d{3})-(.+)-(\d{4}-\d{2}-\d{2})\.md$/;

export function parseReportFilename(filename: string): { num: string; slug: string; date: string } | null {
  const m = filename.match(reReportFilename);
  if (!m) return null;
  return { num: m[1], slug: m[2], date: m[3] };
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractField(content: string, re: RegExp): string | undefined {
  const m = content.match(re);
  return m ? m[1].trim() : undefined;
}

export function parseReportMeta(filename: string, content: string): ReportMeta {
  const parsed = parseReportFilename(filename);
  const first200Lines = content.split("\n").slice(0, 200).join("\n");

  const scoreRaw = extractField(first200Lines, reScore);
  const score = scoreRaw ? parseFloat(scoreRaw) : null;

  // Try to extract company and role from H1 heading
  const h1Match = content.match(/^#\s+(.+?)(?:\s*[—–-]\s*(.+))?$/m);
  let company = parsed ? slugToName(parsed.slug) : "";
  let role = "";
  if (h1Match) {
    company = h1Match[1].trim();
    role = h1Match[2]?.trim() || "";
  }

  return {
    id: parsed?.num || filename.replace(".md", ""),
    filename,
    company,
    role,
    date: parsed?.date || "",
    score,
    scoreRaw: scoreRaw ? `${scoreRaw}/5` : "N/A",
    url: extractField(first200Lines, reURL),
    archetype: extractField(first200Lines, reArchetype),
    tldr: extractField(first200Lines, reTlDr),
    remote: extractField(first200Lines, reRemote),
    compEstimate: extractField(first200Lines, reComp),
  };
}

export function listReports(): ReportMeta[] {
  if (!fs.existsSync(paths.reportsDir)) return [];

  const files = fs.readdirSync(paths.reportsDir).filter((f) => f.endsWith(".md")).sort();
  return files.map((f) => {
    const content = fs.readFileSync(path.join(paths.reportsDir, f), "utf-8");
    return parseReportMeta(f, content);
  });
}

export function getReport(id: string): ReportFull | null {
  if (!fs.existsSync(paths.reportsDir)) return null;

  const files = fs.readdirSync(paths.reportsDir).filter((f) => f.endsWith(".md"));
  const file = files.find((f) => f.startsWith(id.padStart(3, "0")));
  if (!file) return null;

  const content = fs.readFileSync(path.join(paths.reportsDir, file), "utf-8");
  const meta = parseReportMeta(file, content);
  return { ...meta, markdown: content };
}
