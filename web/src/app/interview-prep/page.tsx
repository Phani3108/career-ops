"use client";

import { useInterviewPreps, useStoryBank } from "@/hooks/use-career-ops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, BookOpen } from "lucide-react";
import Link from "next/link";

export default function InterviewPrepPage() {
  const { data: prepsData, isLoading: prepsLoading } = useInterviewPreps();
  const { data: storyData, isLoading: storyLoading } = useStoryBank();

  const preps = prepsData?.data || [];
  const storyBankContent = storyData?.data || "";

  if (prepsLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Interview Prep</h1>
        <p className="text-sm text-gray-500 mt-1">
          Company-specific prep files and your STAR+R story bank
        </p>
      </div>

      <Tabs defaultValue="preps">
        <TabsList>
          <TabsTrigger value="preps" className="gap-1.5">
            <Mic className="h-3.5 w-3.5" /> Company Prep ({preps.length})
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Story Bank
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preps" className="mt-4">
          {preps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                No interview prep files yet. Generate one from a report page.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {preps.map((prep: { slug: string; title: string }) => (
                <Link key={prep.slug} href={`/interview-prep/${prep.slug}`}>
                  <Card className="hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-gray-400 shrink-0" />
                        <p className="text-sm font-medium text-gray-700 truncate">{prep.title}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stories" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {storyBankContent ? (
                <MarkdownRenderer content={storyBankContent} />
              ) : (
                <p className="text-gray-400 text-center py-12">
                  Story bank is empty. Stories accumulate as you evaluate offers.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
