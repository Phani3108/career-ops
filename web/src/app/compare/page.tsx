"use client";

import { useApplications } from "@/hooks/use-career-ops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Columns3 } from "lucide-react";
import { useState, useMemo } from "react";
import type { Application } from "@/lib/types";

const DIMENSIONS = [
  { key: "match", label: "CV Match", weight: 15 },
  { key: "northstar", label: "North Star Fit", weight: 25 },
  { key: "seniority", label: "Seniority", weight: 15 },
  { key: "comp", label: "Compensation", weight: 10 },
  { key: "growth", label: "Growth Trajectory", weight: 10 },
  { key: "remote", label: "Remote Quality", weight: 5 },
  { key: "reputation", label: "Company Rep", weight: 5 },
  { key: "stack", label: "Tech Stack", weight: 5 },
  { key: "speed", label: "Time-to-Offer", weight: 5 },
  { key: "culture", label: "Culture Signals", weight: 5 },
];

export default function ComparePage() {
  const { data, isLoading } = useApplications();
  const [selected, setSelected] = useState<number[]>([]);

  const apps = data?.data || [];
  const scored = useMemo(
    () => apps.filter((a: Application) => a.score !== null).sort((a: Application, b: Application) => (b.score ?? 0) - (a.score ?? 0)),
    [apps]
  );

  const toggle = (num: number) => {
    setSelected((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const compareApps = useMemo(
    () => scored.filter((a: Application) => selected.includes(a.num)),
    [scored, selected]
  );

  if (isLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compare Offers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select 2+ offers to compare side by side
        </p>
      </div>

      {/* Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Offers ({selected.length} selected)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {scored.map((app: Application) => (
              <button
                key={app.num}
                onClick={() => toggle(app.num)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  selected.includes(app.num)
                    ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{app.company}</p>
                  <p className="text-xs text-gray-500 truncate">{app.role}</p>
                </div>
                <ScoreBadge score={app.score} />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {compareApps.length >= 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Columns3 className="h-4 w-4" /> Comparison Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Dimension</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500 text-xs">Weight</th>
                    {compareApps.map((app: Application) => (
                      <th key={app.num} className="px-4 py-3 text-center font-medium text-gray-700">
                        <div className="text-xs">{app.company}</div>
                        <div className="text-[10px] text-gray-400">{app.role}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DIMENSIONS.map((dim) => (
                    <tr key={dim.key} className="border-b border-gray-50">
                      <td className="px-4 py-2 text-gray-700">{dim.label}</td>
                      <td className="px-4 py-2 text-center text-xs text-gray-400">{dim.weight}%</td>
                      {compareApps.map((app: Application) => (
                        <td key={app.num} className="px-4 py-2 text-center">
                          <span className="text-gray-400 text-xs">—</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t-2 bg-gray-50 font-semibold">
                    <td className="px-4 py-3 text-gray-900">Global Score</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">100%</td>
                    {compareApps.map((app: Application) => (
                      <td key={app.num} className="px-4 py-3 text-center">
                        <ScoreBadge score={app.score} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Dimension scores require a full comparison evaluation via Claude CLI.
              Global scores shown are from individual evaluations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
