"use client";

import { useReport } from "@/hooks/use-career-ops";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Download } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useReport(id);
  const report = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] rounded-xl" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <Link href="/reports" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to reports
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            Report not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/reports" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to reports
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{report.company}</h1>
          <p className="text-gray-600">{report.role}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <ScoreBadge score={report.score} raw={report.scoreRaw} size="lg" />
            {report.archetype && (
              <span className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">{report.archetype}</span>
            )}
            {report.remote && (
              <span className="text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">{report.remote}</span>
            )}
            {report.compEstimate && (
              <span className="text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1">{report.compEstimate}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {report.url && (
            <a
              href={report.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-7 gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[0.8rem] font-medium hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Job URL
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          <MarkdownRenderer content={report.markdown} />
        </CardContent>
      </Card>
    </div>
  );
}
