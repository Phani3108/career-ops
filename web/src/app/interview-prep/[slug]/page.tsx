"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function InterviewPrepDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/interview-prep/${slug}`)
      .then((r) => r.json())
      .then((d) => setContent(d.data?.content || null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-6">
      <Link href="/interview-prep" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Interview Prep
      </Link>
      <Card>
        <CardContent className="p-6">
          {content ? <MarkdownRenderer content={content} /> : <p className="text-gray-400 text-center py-12">File not found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
