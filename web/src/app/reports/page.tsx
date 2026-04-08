"use client";

import { useReports } from "@/hooks/use-career-ops";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, FileText } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";

export default function ReportsPage() {
  const { data, isLoading } = useReports();
  const [search, setSearch] = useState("");
  const reports = data?.data || [];

  const filtered = useMemo(() => {
    if (!search) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r: { company: string; role: string; archetype?: string; tldr?: string }) =>
        r.company.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        (r.archetype || "").toLowerCase().includes(q) ||
        (r.tldr || "").toLowerCase().includes(q)
    );
  }, [reports, search]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">{reports.length} evaluation reports</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <FileText className="mx-auto h-8 w-8 mb-3 text-gray-300" />
            {reports.length === 0
              ? "No reports yet. Evaluate an offer to generate your first report."
              : "No matching reports."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((report: {
            id: string; company: string; role: string; date: string;
            score: number | null; scoreRaw: string; archetype?: string; tldr?: string;
          }) => (
            <Link key={report.id} href={`/reports/${report.id}`}>
              <Card className="hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer h-full">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{report.company}</p>
                      <p className="text-sm text-gray-500 truncate">{report.role}</p>
                    </div>
                    <ScoreBadge score={report.score} raw={report.scoreRaw} />
                  </div>
                  {report.archetype && (
                    <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 inline-block">
                      {report.archetype}
                    </p>
                  )}
                  {report.tldr && (
                    <p className="text-xs text-gray-500 line-clamp-2">{report.tldr}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    #{report.id} · {report.date}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
