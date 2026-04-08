"use client";

import { useApplications, useUpdateStatus, useStates } from "@/hooks/use-career-ops";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  Trophy,
  Send,
  Users,
  Zap,
  ExternalLink,
  ArrowUpDown,
  Search as SearchIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Application } from "@/lib/types";

const filterTabs = [
  { key: "all", label: "All" },
  { key: "Evaluated", label: "Evaluated" },
  { key: "Applied", label: "Applied" },
  { key: "Interview", label: "Interview" },
  { key: "top", label: "Top ≥4.0" },
  { key: "SKIP", label: "Skip" },
];

type SortKey = "num" | "date" | "score" | "company" | "status";

export default function Home() {
  const { data, isLoading } = useApplications();
  const { data: statesData } = useStates();
  const updateStatus = useUpdateStatus();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("num");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editingStatus, setEditingStatus] = useState<number | null>(null);

  const apps = data?.data || [];
  const metrics = data?.metrics;
  const states = statesData?.data || [];

  const filtered = useMemo(() => {
    let list = apps;
    if (filter === "top") {
      list = list.filter((a: Application) => a.score !== null && a.score >= 4.0);
    } else if (filter !== "all") {
      list = list.filter((a: Application) => a.status === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a: Application) =>
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.notes.toLowerCase().includes(q)
      );
    }
    return list;
  }, [apps, filter, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a: Application, b: Application) => {
      let cmp = 0;
      switch (sortBy) {
        case "num": cmp = a.num - b.num; break;
        case "date": cmp = a.date.localeCompare(b.date); break;
        case "score": cmp = (a.score ?? 0) - (b.score ?? 0); break;
        case "company": cmp = a.company.localeCompare(b.company); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const handleStatusChange = (num: number, newStatus: string) => {
    updateStatus.mutate({ num, status: newStatus }, {
      onSuccess: () => { toast.success(`Status updated to ${newStatus}`); setEditingStatus(null); },
    });
  };

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: apps.length, top: 0 };
    for (const a of apps) {
      counts[a.status] = (counts[a.status] || 0) + 1;
      if (a.score !== null && a.score >= 4.0) counts.top++;
    }
    return counts;
  }, [apps]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-24 rounded-xl" />))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your job search pipeline</p>
      </div>

      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard icon={BarChart3} label="Total" value={metrics.total} color="text-gray-700" />
          <MetricCard icon={TrendingUp} label="Avg Score" value={metrics.avgScore > 0 ? `${metrics.avgScore.toFixed(1)}/5` : "—"} color="text-blue-600" />
          <MetricCard icon={Trophy} label="Top Score" value={metrics.topScore > 0 ? `${metrics.topScore.toFixed(1)}/5` : "—"} color="text-emerald-600" />
          <MetricCard icon={Send} label="Applied" value={metrics.byStatus["Applied"] || 0} color="text-blue-600" />
          <MetricCard icon={Users} label="Interviews" value={(metrics.byStatus["Interview"] || 0) + (metrics.byStatus["Offer"] || 0)} color="text-emerald-600" />
          <MetricCard icon={Zap} label="Actionable" value={metrics.actionable} color="text-amber-600" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {filterTabs.map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === tab.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {tab.label}
              {tabCounts[tab.key] != null && <span className="ml-1.5 text-[10px] opacity-75">{tabCounts[tab.key]}</span>}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search company or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/75">
                  <SortableHeader label="#" sortKey="num" currentSort={sortBy} dir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Date" sortKey="date" currentSort={sortBy} dir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Company" sortKey="company" currentSort={sortBy} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                  <SortableHeader label="Score" sortKey="score" currentSort={sortBy} dir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Status" sortKey="status" currentSort={sortBy} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-center font-medium text-gray-500">PDF</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Notes</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    {apps.length === 0 ? "No applications yet. Go to Evaluate to get started." : "No matches for current filters."}
                  </td></tr>
                ) : sorted.map((app: Application) => (
                  <tr key={app.num} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{app.num}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{app.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{app.company}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{app.role}</td>
                    <td className="px-4 py-3"><ScoreBadge score={app.score} raw={app.scoreRaw} /></td>
                    <td className="px-4 py-3">
                      {editingStatus === app.num ? (
                        <Select defaultValue={app.status} onValueChange={(v) => { if (v) handleStatusChange(app.num, v); }}
                          onOpenChange={(open) => { if (!open) setEditingStatus(null); }}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{states.map((s) => (<SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>))}</SelectContent>
                        </Select>
                      ) : (
                        <button onClick={() => setEditingStatus(app.num)}><StatusBadge status={app.status} /></button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{app.hasPDF ? <span className="text-green-600">✓</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{app.notes}</td>
                    <td className="px-4 py-3 text-center">
                      {app.reportPath && <Link href={`/reports/${app.reportNumber || app.num}`} className="text-gray-400 hover:text-gray-600"><ExternalLink className="h-3.5 w-3.5" /></Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sorted.length > 0 && <div className="border-t px-4 py-2 text-xs text-gray-400">Showing {sorted.length} of {apps.length}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg bg-gray-50 p-2 ${color}`}><Icon className="h-4 w-4" /></div>
        <div><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-semibold text-gray-900">{value}</p></div>
      </CardContent>
    </Card>
  );
}

function SortableHeader({ label, sortKey, currentSort, dir, onSort }: { label: string; sortKey: SortKey; currentSort: SortKey; dir: "asc" | "desc"; onSort: (key: SortKey) => void }) {
  return (
    <th className="px-4 py-3 text-left font-medium text-gray-500">
      <button className="flex items-center gap-1 hover:text-gray-900" onClick={() => onSort(sortKey)}>
        {label}<ArrowUpDown className={`h-3 w-3 ${currentSort === sortKey ? "text-gray-900" : "text-gray-300"}`} />
      </button>
    </th>
  );
}
