"use client";

import { useBatch, useRunScript } from "@/hooks/use-career-ops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TerminalOutput } from "@/components/common/TerminalOutput";
import { Layers, Play, GitMerge, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function BatchPage() {
  const { data, isLoading } = useBatch();
  const runScript = useRunScript();
  const [mergeOutput, setMergeOutput] = useState("");

  const entries = data?.data?.entries || [];
  const pendingMerge = data?.data?.pendingMerge || 0;

  const handleMerge = () => {
    runScript.mutate(
      { name: "merge" },
      {
        onSuccess: (result) => {
          setMergeOutput(result.data?.stdout || result.data?.stderr || "Done");
          toast.success("Merge completed");
        },
      }
    );
  };

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Processing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Process multiple offers in parallel
          </p>
        </div>
        <div className="flex gap-2">
          {pendingMerge > 0 && (
            <Button onClick={handleMerge} disabled={runScript.isPending} variant="outline" className="gap-2">
              <GitMerge className="h-4 w-4" />
              Merge ({pendingMerge} pending)
            </Button>
          )}
        </div>
      </div>

      {/* Batch State */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" /> Batch State
            <Badge variant="secondary">{entries.length} entries</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-gray-400 space-y-3">
              <p>No batch jobs. Create <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">batch/batch-input.tsv</code> and run:</p>
              <code className="text-xs bg-gray-100 px-3 py-1.5 rounded block max-w-md mx-auto">
                ./batch/batch-runner.sh --parallel 3
              </code>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">URL</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Score</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry: { id: string; url: string; status: string; score?: string; reportNum?: string; error?: string }) => (
                    <tr key={entry.id} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-xs font-mono text-gray-500">{entry.id}</td>
                      <td className="px-3 py-2 text-xs text-blue-600 truncate max-w-[300px]">
                        <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.url}</a>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${
                            entry.status === "done" ? "bg-emerald-50 text-emerald-700" :
                            entry.status === "failed" ? "bg-red-50 text-red-700" :
                            entry.status === "running" ? "bg-blue-50 text-blue-700" :
                            "bg-gray-50 text-gray-500"
                          }`}
                        >
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center text-xs">{entry.score || "—"}</td>
                      <td className="px-3 py-2 text-center text-xs">{entry.reportNum || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {mergeOutput && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Merge Output</CardTitle>
          </CardHeader>
          <CardContent>
            <TerminalOutput output={mergeOutput} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
