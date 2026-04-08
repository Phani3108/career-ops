"use client";

import { usePortals, useScanHistory } from "@/hooks/use-career-ops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Building2, Globe, History } from "lucide-react";

export default function ScannerPage() {
  const { data: portalsData, isLoading: portalsLoading } = usePortals();
  const { data: historyData, isLoading: historyLoading } = useScanHistory();

  const portals = portalsData?.data;
  const history = historyData?.data || [];

  if (portalsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scanner</h1>
          <p className="text-sm text-gray-500 mt-1">
            Scan job portals for new opportunities
          </p>
        </div>
        <Button className="gap-2" disabled>
          <Search className="h-4 w-4" /> Run Scan
          <Badge variant="secondary" className="text-[10px]">Requires Claude CLI</Badge>
        </Button>
      </div>

      {/* Title Filters */}
      {portals && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Positive Keywords (must match)</p>
              <div className="flex flex-wrap gap-1.5">
                {(portals.title_filter?.positive || []).map((kw: string) => (
                  <Badge key={kw} variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">{kw}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Negative Keywords (exclude)</p>
              <div className="flex flex-wrap gap-1.5">
                {(portals.title_filter?.negative || []).map((kw: string) => (
                  <Badge key={kw} variant="secondary" className="text-xs bg-red-50 text-red-700">{kw}</Badge>
                ))}
              </div>
            </div>
            {portals.title_filter?.seniority_boost && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Seniority Boost</p>
                <div className="flex flex-wrap gap-1.5">
                  {portals.title_filter.seniority_boost.map((kw: string) => (
                    <Badge key={kw} variant="secondary" className="text-xs bg-blue-50 text-blue-700">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tracked Companies */}
      {portals?.tracked_companies && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Tracked Companies
              <Badge variant="secondary">{portals.tracked_companies.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {portals.tracked_companies.map((c: { name: string; careers_url: string }) => (
                <div key={c.name} className="flex items-center gap-2 rounded border p-2">
                  <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">{c.name}</span>
                  <a href={c.careers_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Scan History
            <Badge variant="secondary">{history.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No scan history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Company</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Title</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Portal</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 50).map((entry: { url: string; firstSeen: string; company: string; title: string; portal: string; status: string }, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-500">{entry.firstSeen}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{entry.company}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 max-w-[200px] truncate">{entry.title}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{entry.portal}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="text-[10px]">{entry.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
