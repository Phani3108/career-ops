"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

export function TerminalOutput({
  output,
  maxHeight = "400px",
}: {
  output: string;
  maxHeight?: string;
}) {
  return (
    <ScrollArea className="rounded-lg border bg-gray-950 p-4" style={{ maxHeight }}>
      <pre className="whitespace-pre-wrap font-mono text-xs text-gray-200 leading-relaxed">
        {output || "No output yet..."}
      </pre>
    </ScrollArea>
  );
}
