import fs from "fs";
import { paths } from "../paths";
import type { ScanHistoryEntry } from "../types";

export function parseScanHistory(): ScanHistoryEntry[] {
  if (!fs.existsSync(paths.scanHistory)) return [];

  const content = fs.readFileSync(paths.scanHistory, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  // Skip header if present
  const start = lines[0]?.startsWith("url") ? 1 : 0;

  return lines.slice(start).map((line) => {
    const [url, firstSeen, portal, title, company, status] = line.split("\t");
    return {
      url: url || "",
      firstSeen: firstSeen || "",
      portal: portal || "",
      title: title || "",
      company: company || "",
      status: status || "",
    };
  });
}
