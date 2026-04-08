"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { GraduationCap, Loader2 } from "lucide-react";

export default function TrainingPage() {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Training Eval</h1>
        <p className="text-sm text-gray-500 mt-1">
          Evaluate if a course or certification is worth your time
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Course / Certification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste the course URL, name, or full description here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[120px]"
            disabled={streaming}
          />
          <Button disabled={!input.trim() || streaming} className="gap-2">
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
            {streaming ? "Evaluating..." : "Evaluate Training"}
          </Button>
          <p className="text-xs text-gray-400">
            Requires Claude CLI. Evaluates across 6 dimensions: North Star alignment, recruiter signal, time/effort, opportunity cost, content quality, and portfolio deliverable potential.
          </p>
        </CardContent>
      </Card>

      {output && (
        <Card>
          <CardContent className="p-6">
            <MarkdownRenderer content={output} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
