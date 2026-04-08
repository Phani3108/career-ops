"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Rocket, Play, Square, Search, Sparkles, FileText, Send, AlertTriangle,
  CheckCircle2, Loader2, ExternalLink, Download, Eye, XCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { SearchControlPanel } from "@/components/search/SearchControlPanel";
import { useSearchConfig, useSaveSearchConfig, useAuthStatus, useLogin } from "@/hooks/use-career-ops";
import type { SearchConfig, ScanResult, AutoApplyJob } from "@/lib/types";

const SOURCE_COLORS: Record<string, string> = {
  linkedin: "bg-blue-100 text-blue-700",
  indeed: "bg-purple-100 text-purple-700",
  glassdoor: "bg-green-100 text-green-700",
  greenhouse: "bg-teal-100 text-teal-700",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  discovered: { label: "Discovered", color: "bg-gray-100 text-gray-600", icon: Search },
  evaluating: { label: "Evaluating", color: "bg-amber-100 text-amber-700", icon: Loader2 },
  scored: { label: "Scored", color: "bg-blue-100 text-blue-700", icon: Sparkles },
  tailoring: { label: "Tailoring", color: "bg-amber-100 text-amber-700", icon: Loader2 },
  tailored: { label: "PDF Ready", color: "bg-indigo-100 text-indigo-700", icon: FileText },
  preparing: { label: "Preparing", color: "bg-amber-100 text-amber-700", icon: Loader2 },
  ready: { label: "Ready", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  applied: { label: "Applied", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  manual: { label: "Manual", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  skipped: { label: "Skipped", color: "bg-gray-100 text-gray-400", icon: XCircle },
  failed: { label: "Failed", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function AutoApplyPage() {
  const { data: configData } = useSearchConfig();
  const saveConfig = useSaveSearchConfig();
  const { data: authData } = useAuthStatus();
  const login = useLogin();

  const [config, setConfig] = useState<SearchConfig | null>(null);
  const [jobs, setJobs] = useState<AutoApplyJob[]>([]);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [showConfig, setShowConfig] = useState(true);
  const [scoreThreshold, setScoreThreshold] = useState(4.0);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const abortRef = useRef(false);

  // Use saved config or API data
  const activeConfig = config || configData?.data;

  const handleConfigChange = useCallback((newConfig: SearchConfig) => {
    setConfig(newConfig);
    saveConfig.mutate(newConfig);
  }, [saveConfig]);

  const handleLogin = useCallback((platform: string) => {
    login.mutate(platform, {
      onSuccess: (res) => {
        if (res.error) toast.error(res.error);
        else toast.success(`${platform} connected`);
      },
      onError: () => toast.error("Login failed"),
    });
  }, [login]);

  // === SCAN ===
  const runScan = useCallback(async () => {
    if (!activeConfig) return;
    setStage("Scanning job boards...");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: activeConfig }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return [];
      }
      const scanResults: ScanResult[] = data.data?.results || [];
      const newJobs: AutoApplyJob[] = scanResults.map((r, i) => ({
        id: `job-${Date.now()}-${i}`,
        url: r.url,
        company: r.company,
        title: r.title,
        source: r.source,
        score: null,
        applyMode: "prepare",
        status: "discovered",
      }));
      setJobs(newJobs);
      toast.success(`Found ${newJobs.length} jobs across ${Object.entries(data.data?.sources || {}).filter(([, v]) => (v as number) > 0).length} sources`);
      return newJobs;
    } catch {
      toast.error("Scan failed");
      return [];
    }
  }, [activeConfig]);

  // === EVALUATE ===
  const runEvaluate = useCallback(async (jobsToEval: AutoApplyJob[]) => {
    const toEval = jobsToEval.filter((j) => j.status === "discovered");
    if (toEval.length === 0) return;

    setStage(`Evaluating ${toEval.length} jobs...`);

    // Mark as evaluating
    setJobs((prev) =>
      prev.map((j) =>
        toEval.find((e) => e.id === j.id) ? { ...j, status: "evaluating" as const } : j
      )
    );

    try {
      const res = await fetch("/api/batch/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: toEval.map((j) => ({ url: j.url, title: j.title, company: j.company })),
        }),
      });
      const data = await res.json();

      if (data.data?.results) {
        setJobs((prev) =>
          prev.map((j) => {
            const result = data.data.results.find((r: { url: string }) => r.url === j.url);
            if (!result) return j;
            const scoreNum = result.score ? parseFloat(result.score) : null;
            return {
              ...j,
              status: result.status === "scored" ? "scored" as const : "failed" as const,
              score: scoreNum,
              scoreRaw: result.score,
              reportPath: result.reportPath,
              error: result.error,
              applyMode: scoreNum && scoreNum >= 4.5 ? "auto" : scoreNum && scoreNum >= scoreThreshold ? "prepare" : "skip",
            };
          })
        );
      }
    } catch {
      toast.error("Evaluation failed");
      setJobs((prev) =>
        prev.map((j) =>
          j.status === "evaluating" ? { ...j, status: "failed" as const, error: "Request failed" } : j
        )
      );
    }
  }, [scoreThreshold]);

  // === TAILOR ===
  const runTailor = useCallback(async (jobsToTailor: AutoApplyJob[]) => {
    const toTailor = jobsToTailor.filter(
      (j) => j.status === "scored" && j.score !== null && j.score >= scoreThreshold && j.applyMode !== "skip"
    );
    if (toTailor.length === 0) return;

    setStage(`Tailoring CVs for ${toTailor.length} jobs...`);

    for (const job of toTailor) {
      if (abortRef.current) break;

      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "tailoring" as const } : j))
      );

      try {
        const res = await fetch("/api/cv/tailor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportPath: job.reportPath,
            company: job.company,
            title: job.title,
          }),
        });
        const data = await res.json();
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? { ...j, status: "tailored" as const, tailoredPdfPath: data.data?.pdfPath }
              : j
          )
        );
      } catch {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: "failed" as const, error: "Tailoring failed" } : j
          )
        );
      }
    }
  }, [scoreThreshold]);

  // === FULL PIPELINE ===
  const runFullPipeline = useCallback(async () => {
    setRunning(true);
    abortRef.current = false;
    setShowConfig(false);

    const scannedJobs = await runScan();
    if (!scannedJobs || scannedJobs.length === 0 || abortRef.current) {
      setRunning(false);
      setStage("");
      return;
    }

    await runEvaluate(scannedJobs);
    if (abortRef.current) {
      setRunning(false);
      setStage("");
      return;
    }

    // Re-read jobs state for tailoring
    setJobs((currentJobs) => {
      runTailor(currentJobs);
      return currentJobs;
    });

    setStage("Pipeline complete — review results below");
    setRunning(false);
  }, [runScan, runEvaluate, runTailor]);

  const handleStop = () => {
    abortRef.current = true;
    setRunning(false);
    setStage("Stopped");
  };

  const toggleSelect = (id: string) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedJobs(new Set(jobs.map((j) => j.id)));
  };

  const scoredAboveThreshold = jobs.filter((j) => j.score !== null && j.score >= scoreThreshold).length;
  const totalScored = jobs.filter((j) => j.score !== null).length;
  const totalApplied = jobs.filter((j) => j.status === "applied").length;
  const totalFailed = jobs.filter((j) => j.status === "failed").length;

  if (!activeConfig) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Rocket className="h-6 w-6" /> Auto Apply
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Scan → Evaluate → Tailor → Apply — all in one click
          </p>
        </div>
        <div className="flex gap-2">
          {running ? (
            <Button variant="outline" onClick={handleStop} className="gap-2">
              <Square className="h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button onClick={runFullPipeline} className="gap-2 bg-gray-900 hover:bg-gray-800">
              <Play className="h-4 w-4" /> Run Full Pipeline
            </Button>
          )}
        </div>
      </div>

      {/* Auth Status Bar */}
      {authData?.data && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">Sources:</span>
          {(["linkedin", "indeed", "glassdoor", "greenhouse"] as const).map((src) => {
            const auth = authData.data[src];
            return (
              <div key={src} className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${auth?.authenticated ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span className="capitalize">{src}</span>
                {!auth?.authenticated && src !== "greenhouse" && (
                  <button
                    onClick={() => handleLogin(src)}
                    className="text-blue-600 hover:underline text-[10px]"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Status Bar */}
      {stage && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2">
          {running && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
          <span className="text-sm text-blue-700">{stage}</span>
        </div>
      )}

      {/* Metrics */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MetricCard label="Discovered" value={jobs.length} />
          <MetricCard label="Scored" value={totalScored} />
          <MetricCard label="Above Threshold" value={scoredAboveThreshold} color="text-emerald-600" />
          <MetricCard label="Applied" value={totalApplied} color="text-blue-600" />
          <MetricCard label="Failed" value={totalFailed} color="text-red-500" />
        </div>
      )}

      {/* Search Config (collapsible) */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowConfig((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Search Configuration
              <Badge variant="secondary" className="text-[10px]">
                {activeConfig.roles.length} roles · {activeConfig.locations.length} locations
              </Badge>
            </CardTitle>
            {showConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showConfig && (
          <CardContent className="pt-0">
            <SearchControlPanel
              config={activeConfig}
              onChange={handleConfigChange}
              authStatus={authData?.data}
              onLogin={handleLogin}
            />
            <Separator className="my-4" />
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Score threshold:</span>
              <Slider
                value={[scoreThreshold]}
                onValueChange={(v) => setScoreThreshold(Array.isArray(v) ? v[0] : v)}
                min={1}
                max={5}
                step={0.1}
                className="flex-1 max-w-xs"
              />
              <span className="text-sm font-medium">{scoreThreshold.toFixed(1)}/5</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Table */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pipeline Results ({jobs.length})</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll} className="text-xs">
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedJobs(new Set())} className="text-xs">
                  Clear
                </Button>
                {selectedJobs.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1"
                      onClick={() => {
                        const sel = jobs.filter((j) => selectedJobs.has(j.id));
                        runEvaluate(sel);
                      }}
                      disabled={running}
                    >
                      <Sparkles className="h-3 w-3" /> Evaluate ({selectedJobs.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1"
                      onClick={() => {
                        const sel = jobs.filter((j) => selectedJobs.has(j.id));
                        runTailor(sel);
                      }}
                      disabled={running}
                    >
                      <FileText className="h-3 w-3" /> Tailor ({selectedJobs.size})
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">
                      <input
                        type="checkbox"
                        checked={selectedJobs.size === jobs.length && jobs.length > 0}
                        onChange={(e) => e.target.checked ? selectAll() : setSelectedJobs(new Set())}
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Company</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Title</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Source</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Score</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Mode</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.discovered;
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedJobs.has(job.id)}
                            onChange={() => toggleSelect(job.id)}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900 max-w-[140px] truncate">
                          {job.company}
                        </td>
                        <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{job.title}</td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className={`text-[10px] ${SOURCE_COLORS[job.source] || ""}`}>
                            {job.source}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          {job.score !== null ? (
                            <span className={`font-mono text-xs font-medium ${
                              job.score >= 4.2 ? "text-emerald-600" :
                              job.score >= scoreThreshold ? "text-amber-600" :
                              "text-gray-400"
                            }`}>
                              {job.score.toFixed(1)}/5
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.color}`}>
                            <StatusIcon className={`h-3 w-3 ${job.status === "evaluating" || job.status === "tailoring" || job.status === "preparing" ? "animate-spin" : ""}`} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={job.applyMode}
                            onChange={(e) => {
                              const mode = e.target.value as "auto" | "prepare" | "skip";
                              setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, applyMode: mode } : j));
                            }}
                            className="text-[10px] border rounded px-1 py-0.5 bg-white"
                          >
                            <option value="auto">Auto-submit</option>
                            <option value="prepare">Prepare only</option>
                            <option value="skip">Skip</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <a href={job.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            {job.reportPath && (
                              <a href={`/reports/${job.reportPath.replace("reports/", "").replace(".md", "")}`}
                                className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                                <Eye className="h-3 w-3" />
                              </a>
                            )}
                            {job.tailoredPdfPath && (
                              <a href={`/api/outputs/${job.tailoredPdfPath.replace("output/", "")}`}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                                <Download className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Manual Apply Bucket */}
      {jobs.filter((j) => j.status === "manual" || j.status === "failed").length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-4 w-4" /> Manual Review Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobs.filter((j) => j.status === "manual" || j.status === "failed").map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded border border-orange-100 p-2">
                  <div>
                    <p className="text-sm font-medium">{job.company} — {job.title}</p>
                    <p className="text-xs text-gray-500">{job.error || "Requires manual application"}</p>
                  </div>
                  <div className="flex gap-2">
                    {job.tailoredPdfPath && (
                      <a href={`/api/outputs/${job.tailoredPdfPath.replace("output/", "")}`}
                        className="text-xs text-blue-600 hover:underline">
                        Download PDF
                      </a>
                    )}
                    <a href={job.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline">
                      Apply manually
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {jobs.length === 0 && !running && (
        <Card>
          <CardContent className="py-16 text-center">
            <Rocket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600">Ready to go</h3>
            <p className="text-sm text-gray-400 mt-1">
              Configure your search above and click "Run Full Pipeline" to start
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 text-center">
        <p className={`text-2xl font-bold ${color || "text-gray-900"}`}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </CardContent>
    </Card>
  );
}
