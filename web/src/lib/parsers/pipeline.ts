import fs from "fs";
import { paths } from "../paths";
import type { PipelineItem } from "../types";

export function parsePipeline(): { pending: PipelineItem[]; processed: PipelineItem[] } {
  if (!fs.existsSync(paths.pipelineMd)) {
    return { pending: [], processed: [] };
  }

  const content = fs.readFileSync(paths.pipelineMd, "utf-8");
  const lines = content.split("\n");
  const pending: PipelineItem[] = [];
  const processed: PipelineItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const pendingMatch = line.match(/^- \[ \]\s+(.+)/);
    if (pendingMatch) {
      const url = pendingMatch[1].trim();
      pending.push({
        url,
        status: "pending",
        rawLine: line,
        lineIndex: i,
      });
      continue;
    }

    const processedMatch = line.match(/^- \[x\]\s+(.+)/i);
    if (processedMatch) {
      const metadata = processedMatch[1].trim();
      // Extract URL from metadata (first URL-like string)
      const urlMatch = metadata.match(/(https?:\/\/[^\s|]+)/);
      processed.push({
        url: urlMatch ? urlMatch[1] : metadata,
        status: "processed",
        metadata,
        rawLine: line,
        lineIndex: i,
      });
    }
  }

  return { pending, processed };
}
