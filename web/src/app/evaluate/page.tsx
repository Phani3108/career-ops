"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function EvaluatePage() {
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [jdText, setJdText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const canSubmit = mode === "url" ? url.trim().length > 0 : jdText.trim().length > 0;

  const handleEvaluate = async () => {
    setStreaming(true);
    setOutput("");
    setError("");
    setDone(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "url" ? { url } : { jdText }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to start evaluation");
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setError("No response stream");
        setStreaming(false);
        return;
      }

      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "content") {
              setOutput((prev) => prev + data.text);
            } else if (data.type === "error") {
              setError(data.text);
            } else if (data.type === "done") {
              setDone(true);
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message);
      }
    } finally {
      setStreaming(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Evaluate Offer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste a job URL or description to get a full A-F evaluation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "text")}>
            <TabsList>
              <TabsTrigger value="url">Job URL</TabsTrigger>
              <TabsTrigger value="text">Paste JD</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="mt-3">
              <Input
                placeholder="https://boards.greenhouse.io/company/jobs/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={streaming}
              />
            </TabsContent>
            <TabsContent value="text" className="mt-3">
              <Textarea
                placeholder="Paste the full job description here..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="min-h-[200px]"
                disabled={streaming}
              />
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button
              onClick={handleEvaluate}
              disabled={!canSubmit || streaming}
              className="gap-2"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {streaming ? "Evaluating..." : "Evaluate"}
            </Button>
            {streaming && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {(output || streaming) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              {done ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Evaluation Complete
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Streaming output...
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownRenderer content={output} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
