"use client";

import { useCv, useSaveCv, useOutputs } from "@/hooks/use-career-ops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, FileDown, File } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function CvPage() {
  const { data: cvData, isLoading } = useCv();
  const { data: outputsData } = useOutputs();
  const saveCv = useSaveCv();
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const outputs = outputsData?.data || [];

  useEffect(() => {
    if (cvData?.data !== undefined) {
      setContent(cvData.data);
      setIsDirty(false);
    }
  }, [cvData?.data]);

  const handleSave = () => {
    saveCv.mutate(content, {
      onSuccess: () => {
        toast.success("CV saved");
        setIsDirty(false);
      },
      onError: () => toast.error("Failed to save CV"),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CV & PDF</h1>
          <p className="text-sm text-gray-500 mt-1">Edit your CV and manage generated PDFs</p>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || saveCv.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {saveCv.isPending ? "Saving..." : "Save CV"}
        </Button>
      </div>

      <Tabs defaultValue="editor">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="pdfs">Generated PDFs ({outputs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setIsDirty(true);
                }}
                className="min-h-[600px] border-0 rounded-xl font-mono text-sm resize-none focus-visible:ring-0"
                placeholder="# Your Name\n\n## Summary\n..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {content ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p className="text-gray-400 text-center py-12">
                  No CV content. Start writing in the editor tab.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdfs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {outputs.length === 0 ? (
                <p className="text-gray-400 text-center py-12">
                  No PDFs generated yet. Evaluate an offer to generate a tailored CV.
                </p>
              ) : (
                <div className="divide-y">
                  {outputs.map((pdf: { filename: string; size: number; modified: string }) => (
                    <div key={pdf.filename} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      <File className="h-4 w-4 text-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{pdf.filename}</p>
                        <p className="text-xs text-gray-400">
                          {(pdf.size / 1024).toFixed(0)} KB · {new Date(pdf.modified).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={`/api/outputs/${pdf.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        <FileDown className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
