"use client";

import { usePipeline, useAddPipelineUrl } from "@/hooks/use-career-ops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Inbox, Plus, ExternalLink, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

export default function PipelinePage() {
  const { data, isLoading } = usePipeline();
  const addUrl = useAddPipelineUrl();
  const [newUrl, setNewUrl] = useState("");

  const pending = data?.data?.pending || [];
  const processed = data?.data?.processed || [];

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    addUrl.mutate(newUrl.trim(), {
      onSuccess: () => {
        toast.success("URL added to pipeline");
        setNewUrl("");
      },
      onError: () => toast.error("Failed to add URL"),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <p className="text-sm text-gray-500 mt-1">
          URL inbox — add offers to evaluate
        </p>
      </div>

      {/* Add URL */}
      <Card>
        <CardContent className="flex gap-2 py-4">
          <Input
            placeholder="https://boards.greenhouse.io/company/jobs/..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={!newUrl.trim() || addUrl.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Pending
            <Badge variant="secondary" className="ml-1">{pending.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No pending URLs. Add one above or run a scan.
            </p>
          ) : (
            <div className="space-y-2">
              {pending.map((item: { url: string; lineIndex: number }, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                  <Inbox className="h-4 w-4 text-gray-400 shrink-0" />
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate flex-1"
                  >
                    {item.url}
                  </a>
                  <Link href={`/evaluate?url=${encodeURIComponent(item.url)}`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      Evaluate
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Processed
            <Badge variant="secondary" className="ml-1">{processed.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processed.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No processed URLs yet.</p>
          ) : (
            <div className="space-y-2">
              {processed.map((item: { url: string; metadata?: string }, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 bg-gray-50/50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-gray-600 truncate flex-1">
                    {item.metadata || item.url}
                  </span>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
