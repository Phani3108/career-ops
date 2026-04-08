"use client";

import { useRunScript, useSystemStatus } from "@/hooks/use-career-ops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TerminalOutput } from "@/components/common/TerminalOutput";
import { Stethoscope, ShieldCheck, RefreshCw, Copy, GitMerge, Activity, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

interface ScriptDef {
  name: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const scripts: ScriptDef[] = [
  { name: "doctor", label: "Doctor", description: "Full health check of all files and configuration", icon: <Stethoscope className="h-4 w-4" /> },
  { name: "verify", label: "Verify Pipeline", description: "Validate reports, tracker, and cross-references", icon: <ShieldCheck className="h-4 w-4" /> },
  { name: "normalize", label: "Normalize Statuses", description: "Fix non-canonical statuses in applications.md", icon: <RefreshCw className="h-4 w-4" /> },
  { name: "dedup", label: "Dedup Tracker", description: "Remove duplicate entries from tracker", icon: <Copy className="h-4 w-4" /> },
  { name: "merge", label: "Merge Tracker", description: "Merge batch tracker additions into applications.md", icon: <GitMerge className="h-4 w-4" /> },
  { name: "sync-check", label: "CV Sync Check", description: "Verify cv.md is consistent", icon: <Activity className="h-4 w-4" /> },
];

export default function HealthPage() {
  const runScript = useRunScript();
  const { data: statusData } = useSystemStatus();
  const [outputs, setOutputs] = useState<Record<string, { stdout: string; stderr: string; exitCode: number | null; running: boolean }>>({});
  const version = statusData?.data?.version;

  async function handleRun(name: string) {
    setOutputs(prev => ({ ...prev, [name]: { stdout: "", stderr: "", exitCode: null, running: true } }));
    try {
      const res = await runScript.mutateAsync({ name });
      setOutputs(prev => ({
        ...prev,
        [name]: {
          stdout: res.data?.stdout ?? "",
          stderr: res.data?.stderr ?? "",
          exitCode: res.data?.exitCode ?? 1,
          running: false,
        },
      }));
    } catch {
      setOutputs(prev => ({
        ...prev,
        [name]: { stdout: "", stderr: "Failed to run script", exitCode: 1, running: false },
      }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-sm text-gray-500 mt-1">Run diagnostics and maintenance scripts</p>
        </div>
        {version && <Badge variant="secondary">v{version}</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {scripts.map(s => {
          const output = outputs[s.name];
          return (
            <Card key={s.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {s.icon} {s.label}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRun(s.name)}
                    disabled={output?.running}
                  >
                    {output?.running ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Running</>
                    ) : (
                      "Run"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">{s.description}</p>
              </CardHeader>
              {output && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {output.exitCode !== null && (
                      <div className="flex items-center gap-2">
                        {output.exitCode === 0 ? (
                          <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-xs text-emerald-600">Passed</span></>
                        ) : (
                          <><XCircle className="h-4 w-4 text-red-400" /><span className="text-xs text-red-600">Exit code {output.exitCode}</span></>
                        )}
                      </div>
                    )}
                    {(output.stdout || output.stderr) && (
                      <TerminalOutput output={output.stdout + (output.stderr ? "\n" + output.stderr : "")} maxHeight="200px" />
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
