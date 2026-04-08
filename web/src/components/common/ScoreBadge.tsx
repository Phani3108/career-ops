"use client";

import { cn } from "@/lib/utils";

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 4.2) return "text-emerald-600";
  if (score >= 3.8) return "text-amber-600";
  if (score >= 3.0) return "text-gray-600";
  return "text-red-600";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-gray-50";
  if (score >= 4.2) return "bg-emerald-50";
  if (score >= 3.8) return "bg-amber-50";
  if (score >= 3.0) return "bg-gray-50";
  return "bg-red-50";
}

export function ScoreBadge({
  score,
  raw,
  size = "sm",
}: {
  score: number | null;
  raw?: string;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-semibold",
        scoreColor(score),
        scoreBg(score),
        size === "lg" ? "px-3 py-1.5 text-lg" : "px-2 py-0.5 text-xs"
      )}
    >
      {raw || (score !== null ? `${score.toFixed(1)}/5` : "N/A")}
    </span>
  );
}
