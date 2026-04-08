"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  Evaluated: "bg-amber-50 text-amber-700 border-amber-200",
  Applied: "bg-blue-50 text-blue-700 border-blue-200",
  Responded: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Interview: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Offer: "bg-green-50 text-green-700 border-green-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Discarded: "bg-gray-50 text-gray-500 border-gray-200",
  SKIP: "bg-slate-50 text-slate-500 border-slate-200",
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", color)}>
      {status}
    </Badge>
  );
}
