"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { Lightbulb, Loader2 } from "lucide-react";

export default function ProjectPage() {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Project Eval</h1>
        <p className="text-sm text-gray-500 mt-1">
          Evaluate a portfolio project idea for interview impact
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Project Idea
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe your project idea — what it does, target audience, tech stack, and what you'd demo..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[150px]"
            disabled={streaming}
          />
          <Button disabled={!input.trim() || streaming} className="gap-2">
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
            {streaming ? "Evaluating..." : "Evaluate Project"}
          </Button>
          <p className="text-xs text-gray-400">
            Requires Claude CLI. Evaluates across 6 weighted dimensions: North Star signal (25%), uniqueness (20%), demo-ability (20%), metrics potential (15%), time to MVP (10%), STAR story potential (10%).
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
