import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Application, PipelineMetrics, CanonicalState, SearchConfig, AuthStatus } from "@/lib/types";

// ── Applications + Metrics ──
export function useApplications() {
  return useQuery<{ data: Application[]; metrics: PipelineMetrics }>({
    queryKey: ["applications"],
    queryFn: () => fetch("/api/applications").then((r) => r.json()),
  });
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ num, status, notes }: { num: number; status: string; notes?: string }) =>
      fetch(`/api/applications/${num}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });
}

// ── States ──
export function useStates() {
  return useQuery<{ data: CanonicalState[] }>({
    queryKey: ["states"],
    queryFn: () => fetch("/api/states").then((r) => r.json()),
    staleTime: Infinity,
  });
}

// ── Reports ──
export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => fetch("/api/reports").then((r) => r.json()),
  });
}

export function useReport(id: string | null) {
  return useQuery({
    queryKey: ["report", id],
    queryFn: () => fetch(`/api/reports/${id}`).then((r) => r.json()),
    enabled: !!id,
  });
}

// ── Pipeline ──
export function usePipeline() {
  return useQuery({
    queryKey: ["pipeline"],
    queryFn: () => fetch("/api/pipeline").then((r) => r.json()),
  });
}

export function useAddPipelineUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) =>
      fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline"] }),
  });
}

// ── Profile ──
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
  });
}

// ── CV ──
export function useCv() {
  return useQuery<{ data: string }>({
    queryKey: ["cv"],
    queryFn: () => fetch("/api/cv").then((r) => r.json()),
  });
}

export function useSaveCv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      fetch("/api/cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cv"] }),
  });
}

// ── Portals ──
export function usePortals() {
  return useQuery({
    queryKey: ["portals"],
    queryFn: () => fetch("/api/portals").then((r) => r.json()),
  });
}

// ── Outputs (PDFs) ──
export function useOutputs() {
  return useQuery({
    queryKey: ["outputs"],
    queryFn: () => fetch("/api/outputs").then((r) => r.json()),
  });
}

// ── Scan History ──
export function useScanHistory() {
  return useQuery({
    queryKey: ["scan-history"],
    queryFn: () => fetch("/api/scan-history").then((r) => r.json()),
  });
}

// ── Interview Prep ──
export function useInterviewPreps() {
  return useQuery({
    queryKey: ["interview-preps"],
    queryFn: () => fetch("/api/interview-prep").then((r) => r.json()),
  });
}

// ── Story Bank ──
export function useStoryBank() {
  return useQuery<{ data: string }>({
    queryKey: ["story-bank"],
    queryFn: () => fetch("/api/story-bank").then((r) => r.json()),
  });
}

// ── Batch ──
export function useBatch() {
  return useQuery({
    queryKey: ["batch"],
    queryFn: () => fetch("/api/batch").then((r) => r.json()),
  });
}

// ── System Status ──
export function useSystemStatus() {
  return useQuery({
    queryKey: ["system-status"],
    queryFn: () => fetch("/api/status").then((r) => r.json()),
  });
}

// ── Run Script ──
export function useRunScript() {
  return useMutation({
    mutationFn: ({ name, args }: { name: string; args?: string[] }) =>
      fetch(`/api/scripts/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ args }),
      }).then((r) => r.json()),
  });
}

// ── PDF Upload ──
export function useUploadResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return fetch("/api/cv/upload", { method: "POST", body: fd }).then((r) => r.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cv"] }),
  });
}

// ── Search Config ──
export function useSearchConfig() {
  return useQuery<{ data: SearchConfig }>({
    queryKey: ["search-config"],
    queryFn: () => fetch("/api/search-config").then((r) => r.json()),
  });
}

export function useSaveSearchConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: SearchConfig) =>
      fetch("/api/search-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["search-config"] }),
  });
}

// ── Auth Status ──
export function useAuthStatus() {
  return useQuery<{ data: AuthStatus }>({
    queryKey: ["auth-status"],
    queryFn: () => fetch("/api/auth/login").then((r) => r.json()),
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (platform: string) =>
      fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth-status"] }),
  });
}

// ── Q&A Store ──
export function useQAStore() {
  return useQuery({
    queryKey: ["qa-store"],
    queryFn: () => fetch("/api/qa-store").then((r) => r.json()),
  });
}

export function useSaveQA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry: { pattern: string; answer: string; context?: string }) =>
      fetch("/api/qa-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa-store"] }),
  });
}
