// ── Application tracker row ──
export interface Application {
  num: number;
  date: string;
  company: string;
  role: string;
  score: number | null;
  scoreRaw: string;
  status: string;
  hasPDF: boolean;
  reportPath: string;
  reportNumber: string;
  notes: string;
  jobURL?: string;
  // Enriched from report
  archetype?: string;
  tldr?: string;
  remote?: string;
  compEstimate?: string;
}

// ── Pipeline items ──
export interface PipelineItem {
  url: string;
  status: "pending" | "processed";
  metadata?: string; // For processed: "# | Company | Role | Score | PDF"
  rawLine: string;
  lineIndex: number;
}

// ── Report metadata ──
export interface ReportMeta {
  id: string;
  filename: string;
  company: string;
  role: string;
  date: string;
  score: number | null;
  scoreRaw: string;
  url?: string;
  archetype?: string;
  tldr?: string;
  remote?: string;
  compEstimate?: string;
}

export interface ReportFull extends ReportMeta {
  markdown: string;
}

// ── Profile (config/profile.yml) ──
export interface Profile {
  candidate: {
    full_name: string;
    email: string;
    phone?: string;
    location: string;
    linkedin?: string;
    portfolio_url?: string;
    github?: string;
    twitter?: string;
    canva_resume_design_id?: string;
  };
  target_roles: {
    primary: string[];
    archetypes: Array<{
      name: string;
      level: string;
      fit: "primary" | "secondary" | "adjacent";
    }>;
  };
  narrative: {
    headline: string;
    exit_story: string;
    superpowers: string[];
    proof_points: Array<{
      name: string;
      url?: string;
      hero_metric: string;
    }>;
    dashboard?: {
      url: string;
      password?: string;
    };
  };
  compensation: {
    target_range: string;
    currency: string;
    minimum: string;
    location_flexibility?: string;
  };
  location: {
    country: string;
    city: string;
    timezone: string;
    visa_status?: string;
    onsite_availability?: string;
  };
  language?: {
    modes_dir?: string;
  };
}

// ── Canonical states ──
export interface CanonicalState {
  id: string;
  label: string;
  aliases: string[];
  description: string;
  dashboard_group: string;
}

// ── Portals config ──
export interface PortalsConfig {
  title_filter: {
    positive: string[];
    negative: string[];
    seniority_boost?: string[];
  };
  search_queries: Array<{
    name: string;
    url: string;
    type?: string;
  }>;
  tracked_companies: Array<{
    name: string;
    careers_url: string;
    type?: string;
  }>;
}

// ── Metrics ──
export interface PipelineMetrics {
  total: number;
  byStatus: Record<string, number>;
  avgScore: number;
  topScore: number;
  withPDF: number;
  actionable: number;
}

// ── Scan history ──
export interface ScanHistoryEntry {
  url: string;
  firstSeen: string;
  portal: string;
  title: string;
  company: string;
  status: string;
}

// ── Story bank ──
export interface StoryBankEntry {
  source: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  bestFor: string[];
}

// ── Batch state ──
export interface BatchEntry {
  id: string;
  url: string;
  status: "pending" | "running" | "done" | "failed";
  startedAt?: string;
  completedAt?: string;
  reportNum?: string;
  score?: string;
  error?: string;
  retries?: number;
}

// ── API response wrappers ──
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface ScriptResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
