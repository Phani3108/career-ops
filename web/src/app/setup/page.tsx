"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  FolderOpen,
  FileText,
  Globe,
  User,
  Terminal,
  Plug,
  BookOpen,
  ChevronRight,
  Copy,
  RefreshCw,
  Upload,
  AlertTriangle,
  Rocket,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Types ─── */
interface DepStatus {
  installed: boolean;
  version?: string;
}
interface SetupStatus {
  readiness: "ready" | "partial" | "not-started";
  readyCount: number;
  totalRequired: number;
  version: string;
  dependencies: {
    node: DepStatus;
    npm: DepStatus;
    playwright: DepStatus;
    claude: DepStatus;
    rootNodeModules: boolean;
    webNodeModules: boolean;
  };
  files: Record<string, boolean>;
  dirs: Record<string, boolean>;
  integrations: Record<string, { connected: boolean }>;
  profileSummary: { name: string; email: string; location: string } | null;
}

/* ─── Hooks ─── */
function useSetupStatus() {
  const [data, setData] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup/status");
      const json = await res.json();
      setData(json.data);
    } catch {
      toast.error("Failed to fetch setup status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, refresh };
}

function useSetupAction() {
  const [running, setRunning] = useState<string | null>(null);

  const run = useCallback(
    async (action: string, payload?: Record<string, unknown>) => {
      setRunning(action);
      try {
        const res = await fetch("/api/setup/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, payload }),
        });
        const json = await res.json();
        if (json.ok) {
          toast.success(json.message);
        } else {
          toast.error(json.message);
        }
        return json;
      } catch {
        toast.error("Action failed");
        return { ok: false };
      } finally {
        setRunning(null);
      }
    },
    []
  );

  return { run, running };
}

/* ─── Components ─── */
function StatusDot({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
  ) : (
    <XCircle className="h-4 w-4 text-red-400 shrink-0" />
  );
}

function CopyBlock({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 bg-gray-900 text-gray-100 rounded-lg px-4 py-2.5 font-mono text-sm my-2">
      <code className="flex-1 whitespace-pre-wrap break-all">{text}</code>
      <button
        onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied!"); }}
        className="text-gray-400 hover:text-white shrink-0"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

function ActionButton({
  label,
  action,
  running,
  onRun,
  done,
  payload,
}: {
  label: string;
  action: string;
  running: string | null;
  onRun: (action: string, payload?: Record<string, unknown>) => Promise<{ ok: boolean }>;
  done?: boolean;
  payload?: Record<string, unknown>;
}) {
  const isRunning = running === action;
  return (
    <Button
      size="sm"
      variant={done ? "outline" : "default"}
      disabled={isRunning || !!running}
      onClick={async () => {
        await onRun(action, payload);
      }}
      className="gap-1.5"
    >
      {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : null}
      {done ? "Done" : label}
    </Button>
  );
}

/* ─── Page ─── */
export default function SetupPage() {
  const { data: status, loading, refresh } = useSetupStatus();
  const { run, running } = useSetupAction();
  const qc = useQueryClient();
  const [cvText, setCvText] = useState("");
  const [profileFields, setProfileFields] = useState({
    name: "",
    email: "",
    location: "",
    timezone: "",
    role1: "",
    role2: "",
    salaryMin: "",
    salaryMax: "",
  });
  const [uploadingCv, setUploadingCv] = useState(false);

  const handleAction = useCallback(
    async (action: string, payload?: Record<string, unknown>) => {
      const result = await run(action, payload);
      if (result.ok) {
        await refresh();
        qc.invalidateQueries({ queryKey: ["system-status"] });
      }
      return result;
    },
    [run, refresh, qc]
  );

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCv(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cv/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.data) {
        toast.success("CV uploaded and converted!");
        await refresh();
        qc.invalidateQueries({ queryKey: ["cv"] });
      } else {
        toast.error(json.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingCv(false);
    }
  };

  const handleSaveCv = async () => {
    if (!cvText.trim()) return;
    await handleAction("save-cv", { content: cvText });
    setCvText("");
  };

  const handleSaveProfile = async () => {
    const fields = profileFields;
    const actions: Promise<unknown>[] = [];
    if (fields.name) actions.push(handleAction("save-profile-field", { field: "candidate.full_name", value: fields.name }));
    if (fields.email) actions.push(handleAction("save-profile-field", { field: "candidate.email", value: fields.email }));
    if (fields.location) actions.push(handleAction("save-profile-field", { field: "candidate.location", value: fields.location }));
    if (fields.timezone) actions.push(handleAction("save-profile-field", { field: "location.timezone", value: fields.timezone }));
    const roles = [fields.role1, fields.role2].filter(Boolean);
    if (roles.length) actions.push(handleAction("save-profile-field", { field: "target_roles.primary", value: roles }));
    if (fields.salaryMin && fields.salaryMax) {
      actions.push(handleAction("save-profile-field", { field: "compensation.target_range", value: `$${fields.salaryMin}-${fields.salaryMax}` }));
    }
    if (actions.length === 0) {
      toast.error("Fill in at least one field");
      return;
    }
    await Promise.all(actions);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const s = status!;
  const deps = s.dependencies;
  const allDepsOk = deps.node.installed && deps.npm.installed && deps.rootNodeModules && deps.webNodeModules;
  const allFilesOk = s.files.cv && s.files.profile && s.files.profileMd && s.files.portals;
  const allDirsOk = Object.values(s.dirs).every(Boolean);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Setup & Connections</h1>
          <p className="text-sm text-gray-500 mt-1">
            Everything you need to get career-ops running — install, configure, connect
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* ── Readiness Banner ── */}
      <Card className={s.readiness === "ready" ? "border-emerald-200 bg-emerald-50/50" : s.readiness === "partial" ? "border-amber-200 bg-amber-50/50" : "border-red-200 bg-red-50/50"}>
        <CardContent className="py-4 flex items-center gap-3">
          {s.readiness === "ready" ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : s.readiness === "partial" ? (
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          ) : (
            <XCircle className="h-6 w-6 text-red-500" />
          )}
          <div>
            <p className="font-medium text-gray-900">
              {s.readiness === "ready"
                ? "System is ready!"
                : s.readiness === "partial"
                  ? `${s.readyCount}/${s.totalRequired} core files configured`
                  : "Setup not started"}
            </p>
            <p className="text-sm text-gray-500">
              {s.readiness === "ready"
                ? "All core files in place. You can start evaluating offers."
                : "Follow the steps below to complete setup."}
            </p>
          </div>
          {s.readiness !== "ready" && (
            <Button
              className="ml-auto gap-1.5"
              onClick={() => handleAction("run-full-setup")}
              disabled={!!running}
            >
              {running === "run-full-setup" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              Auto-Setup Everything
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs defaultValue="steps">
        <TabsList>
          <TabsTrigger value="steps"><ChevronRight className="h-3.5 w-3.5 mr-1" /> Step-by-Step</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="h-3.5 w-3.5 mr-1" /> Integrations</TabsTrigger>
          <TabsTrigger value="guide"><BookOpen className="h-3.5 w-3.5 mr-1" /> Full Guide</TabsTrigger>
        </TabsList>

        {/* ── TAB: Step-by-Step ── */}
        <TabsContent value="steps" className="mt-4 space-y-4">
          {/* STEP 1: Dependencies */}
          <StepCard
            number={1}
            title="Install Dependencies"
            icon={<Download className="h-5 w-5" />}
            done={allDepsOk && deps.playwright.installed}
          >
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <StatusDot ok={deps.node.installed} />
                  <span className="text-sm">Node.js {deps.node.version ? `v${deps.node.version}` : "(not found)"}</span>
                  {!deps.node.installed && (
                    <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                      Install <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot ok={deps.npm.installed} />
                  <span className="text-sm">npm {deps.npm.version ? `v${deps.npm.version}` : "(not found)"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot ok={deps.rootNodeModules} />
                  <span className="text-sm">Root packages</span>
                  {!deps.rootNodeModules && (
                    <ActionButton label="Install" action="install-root-deps" running={running} onRun={handleAction} done={deps.rootNodeModules} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot ok={deps.webNodeModules} />
                  <span className="text-sm">Web packages</span>
                  {!deps.webNodeModules && (
                    <ActionButton label="Install" action="install-web-deps" running={running} onRun={handleAction} done={deps.webNodeModules} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot ok={deps.playwright.installed} />
                  <span className="text-sm">Playwright {deps.playwright.version ? `v${deps.playwright.version}` : "(not installed)"}</span>
                  {!deps.playwright.installed && (
                    <ActionButton label="Install" action="install-playwright" running={running} onRun={handleAction} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot ok={deps.claude.installed} />
                  <span className="text-sm">Claude CLI {deps.claude.version || "(not found)"}</span>
                  {!deps.claude.installed && (
                    <a href="https://docs.anthropic.com/en/docs/claude-code" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                      Install <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400">Or install everything at once from terminal:</p>
              <CopyBlock text="bash setup.sh" />
            </div>
          </StepCard>

          {/* STEP 2: Directories & Data Files */}
          <StepCard
            number={2}
            title="Create Directories & Data Files"
            icon={<FolderOpen className="h-5 w-5" />}
            done={allDirsOk && s.files.applicationsMd && s.files.pipelineMd && s.files.scanHistory}
          >
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(s.dirs).map(([name, ok]) => (
                  <div key={name} className="flex items-center gap-2">
                    <StatusDot ok={ok} />
                    <span className="text-sm font-mono text-gray-600">{name.replace(/([A-Z])/g, "/$1").toLowerCase()}/</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <StatusDot ok={s.files.applicationsMd} />
                  <span className="text-sm font-mono text-gray-600">data/applications.md</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot ok={s.files.pipelineMd} />
                  <span className="text-sm font-mono text-gray-600">data/pipeline.md</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot ok={s.files.scanHistory} />
                  <span className="text-sm font-mono text-gray-600">data/scan-history.tsv</span>
                </div>
              </div>
              {(!allDirsOk || !s.files.applicationsMd || !s.files.pipelineMd) && (
                <div className="flex gap-2">
                  <ActionButton label="Create All Directories" action="create-dirs" running={running} onRun={handleAction} />
                  <ActionButton label="Create applications.md" action="create-applications-md" running={running} onRun={handleAction} done={s.files.applicationsMd} />
                  <ActionButton label="Create pipeline.md" action="create-pipeline-md" running={running} onRun={handleAction} done={s.files.pipelineMd} />
                </div>
              )}
            </div>
          </StepCard>

          {/* STEP 3: Configuration Files */}
          <StepCard
            number={3}
            title="Configuration Templates"
            icon={<FileText className="h-5 w-5" />}
            done={s.files.profile && s.files.profileMd && s.files.portals && s.files.envLocal}
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot ok={s.files.profile} />
                    <span className="text-sm"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">config/profile.yml</code> — your identity</span>
                  </div>
                  {!s.files.profile && (
                    <ActionButton label="Create from template" action="copy-profile" running={running} onRun={handleAction} />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot ok={s.files.profileMd} />
                    <span className="text-sm"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">modes/_profile.md</code> — your customizations</span>
                  </div>
                  {!s.files.profileMd && (
                    <ActionButton label="Create from template" action="copy-profile-md" running={running} onRun={handleAction} />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot ok={s.files.portals} />
                    <span className="text-sm"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">portals.yml</code> — job scanner config (45+ companies)</span>
                  </div>
                  {!s.files.portals && (
                    <ActionButton label="Create from template" action="copy-portals" running={running} onRun={handleAction} />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot ok={s.files.envLocal} />
                    <span className="text-sm"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">web/.env.local</code> — web app config</span>
                  </div>
                  {!s.files.envLocal && (
                    <ActionButton label="Create" action="create-env-local" running={running} onRun={handleAction} />
                  )}
                </div>
              </div>
            </div>
          </StepCard>

          {/* STEP 4: Your CV */}
          <StepCard
            number={4}
            title="Upload Your CV"
            icon={<Upload className="h-5 w-5" />}
            done={s.files.cv}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <StatusDot ok={s.files.cv} />
                <span className="text-sm">{s.files.cv ? "cv.md exists" : "cv.md not found"}</span>
              </div>
              {!s.files.cv && (
                <>
                  <p className="text-sm text-gray-500">Choose one method:</p>
                  <div className="space-y-3">
                    {/* PDF Upload */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium">Option A: Upload a PDF resume</p>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <div className="px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 flex items-center gap-1.5">
                          {uploadingCv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          Choose PDF
                        </div>
                        <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={uploadingCv} />
                      </label>
                    </div>

                    {/* Paste markdown */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium">Option B: Paste your CV as markdown</p>
                      <textarea
                        className="w-full border rounded-md p-2 text-sm font-mono resize-y min-h-[120px]"
                        placeholder={"# Your Name\n\n## Summary\n...\n\n## Experience\n...\n\n## Education\n..."}
                        value={cvText}
                        onChange={(e) => setCvText(e.target.value)}
                      />
                      <Button size="sm" onClick={handleSaveCv} disabled={!cvText.trim() || !!running}>
                        Save as cv.md
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </StepCard>

          {/* STEP 5: Profile Details */}
          <StepCard
            number={5}
            title="Fill In Your Profile"
            icon={<User className="h-5 w-5" />}
            done={!!s.profileSummary?.name}
          >
            <div className="space-y-3">
              {s.profileSummary?.name ? (
                <div className="text-sm text-gray-600">
                  Currently set: <strong>{s.profileSummary.name}</strong> ({s.profileSummary.email}) — {s.profileSummary.location || "no location"}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Fill these in to personalize evaluations, CVs, and outreach.</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">Full Name</label>
                  <Input placeholder="Jane Smith" value={profileFields.name} onChange={(e) => setProfileFields((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Email</label>
                  <Input placeholder="jane@example.com" type="email" value={profileFields.email} onChange={(e) => setProfileFields((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Location</label>
                  <Input placeholder="San Francisco, CA" value={profileFields.location} onChange={(e) => setProfileFields((p) => ({ ...p, location: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Timezone</label>
                  <Input placeholder="PST" value={profileFields.timezone} onChange={(e) => setProfileFields((p) => ({ ...p, timezone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Target Role 1</label>
                  <Input placeholder="Senior AI Engineer" value={profileFields.role1} onChange={(e) => setProfileFields((p) => ({ ...p, role1: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Target Role 2</label>
                  <Input placeholder="Staff ML Engineer" value={profileFields.role2} onChange={(e) => setProfileFields((p) => ({ ...p, role2: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Salary Min ($)</label>
                  <Input placeholder="120000" value={profileFields.salaryMin} onChange={(e) => setProfileFields((p) => ({ ...p, salaryMin: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Salary Max ($)</label>
                  <Input placeholder="200000" value={profileFields.salaryMax} onChange={(e) => setProfileFields((p) => ({ ...p, salaryMax: e.target.value }))} />
                </div>
              </div>
              <Button size="sm" onClick={handleSaveProfile} disabled={!!running}>
                Save to profile.yml
              </Button>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                For full control, edit <code className="bg-gray-100 px-1 py-0.5 rounded">config/profile.yml</code> directly. This form updates the essential fields.
              </p>
            </div>
          </StepCard>

          {/* STEP 6: Launch */}
          <StepCard
            number={6}
            title="Launch"
            icon={<Rocket className="h-5 w-5" />}
            done={s.readiness === "ready"}
          >
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Start the web UI and begin evaluating offers:</p>
              <CopyBlock text="cd web && npm run dev" />
              <p className="text-sm text-gray-500">
                Then open <a href="http://localhost:3000" className="text-blue-600 hover:underline">http://localhost:3000</a>
              </p>
              <Separator />
              <p className="text-sm text-gray-600">Or use Claude Code directly:</p>
              <CopyBlock text="claude" />
              <p className="text-sm text-gray-400">Paste a job URL and it will auto-evaluate, score, generate a tailored PDF, and track it.</p>
            </div>
          </StepCard>
        </TabsContent>

        {/* ── TAB: Integrations ── */}
        <TabsContent value="integrations" className="mt-4 space-y-4">
          {/* Claude CLI */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Claude CLI
                {deps.claude.installed ? (
                  <Badge className="bg-emerald-50 text-emerald-700 text-xs">Connected</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not Found</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Claude CLI powers offer evaluation, CV tailoring, and interview prep. It&apos;s the AI engine behind career-ops.
              </p>
              {deps.claude.installed ? (
                <p className="text-sm text-emerald-600">Claude CLI v{deps.claude.version} is installed and ready.</p>
              ) : (
                <>
                  <p className="text-sm text-gray-500">Install Claude CLI:</p>
                  <CopyBlock text="npm install -g @anthropic-ai/claude-code" />
                  <p className="text-sm text-gray-500">Then authenticate:</p>
                  <CopyBlock text="claude auth login" />
                  <a href="https://docs.anthropic.com/en/docs/claude-code" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    Full installation docs <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </CardContent>
          </Card>

          {/* Playwright */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Playwright (Browser Automation)
                {deps.playwright.installed ? (
                  <Badge className="bg-emerald-50 text-emerald-700 text-xs">Installed</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not Installed</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Playwright is used for PDF generation, job board scraping (LinkedIn, Indeed, Glassdoor), and the auto-apply form filler.
              </p>
              {deps.playwright.installed ? (
                <p className="text-sm text-emerald-600">Playwright v{deps.playwright.version} is installed.</p>
              ) : (
                <ActionButton label="Install Playwright" action="install-playwright" running={running} onRun={handleAction} />
              )}
            </CardContent>
          </Card>

          {/* Job Board Auth */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plug className="h-4 w-4" />
                Job Board Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Authenticate with job boards to unlock better scanning and auto-apply. Clicking &quot;Connect&quot; opens a real browser where you log in — your session cookies are saved locally.
              </p>
              {!deps.playwright.installed && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-md px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Install Playwright first (see above)
                </div>
              )}
              {["linkedin", "indeed", "glassdoor"].map((platform) => (
                <div key={platform} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <StatusDot ok={s.integrations[platform]?.connected} />
                    <div>
                      <p className="text-sm font-medium capitalize">{platform}</p>
                      <p className="text-xs text-gray-400">
                        {s.integrations[platform]?.connected ? "Session saved" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <PlatformLoginButton
                    platform={platform}
                    connected={s.integrations[platform]?.connected}
                    disabled={!deps.playwright.installed}
                    onDone={refresh}
                  />
                </div>
              ))}
              <p className="text-xs text-gray-400">
                Cookies are stored in <code className="bg-gray-100 px-1 py-0.5 rounded">config/.auth/</code> and never leave your machine.
              </p>
            </CardContent>
          </Card>

          {/* OpenAI / API keys (optional, for future) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Environment Variables (Fallback)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Most configuration is file-based (no API keys needed). If you need custom env vars,
                add them to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">web/.env.local</code>:
              </p>
              <CopyBlock text={`# web/.env.local\nCAREER_OPS_ROOT=..          # Path to career-ops root (required)\n# ANTHROPIC_API_KEY=sk-...  # Only if using API directly instead of Claude CLI`} />
              <div className="flex items-center gap-2">
                <StatusDot ok={s.files.envLocal} />
                <span className="text-sm">{s.files.envLocal ? "web/.env.local exists" : "web/.env.local not found"}</span>
                {!s.files.envLocal && (
                  <ActionButton label="Create" action="create-env-local" running={running} onRun={handleAction} />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Full Guide ── */}
        <TabsContent value="guide" className="mt-4 space-y-4">
          <GuideContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Platform Login Button ─── */
function PlatformLoginButton({
  platform,
  connected,
  disabled,
  onDone,
}: {
  platform: string;
  connected: boolean;
  disabled: boolean;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`${platform} connected!`);
        onDone();
      } else {
        toast.error(json.error || "Login failed");
      }
    } catch {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant={connected ? "outline" : "default"}
      disabled={disabled || loading}
      onClick={handleLogin}
      className="gap-1.5"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : connected ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Globe className="h-3.5 w-3.5" />
      )}
      {connected ? "Reconnect" : "Connect"}
    </Button>
  );
}

/* ─── Step Card Wrapper ─── */
function StepCard({
  number,
  title,
  icon,
  done,
  children,
}: {
  number: number;
  title: string;
  icon: React.ReactNode;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={done ? "border-emerald-100" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-3">
          <span
            className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
              done ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {done ? <CheckCircle2 className="h-4 w-4" /> : number}
          </span>
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          {done && <Badge className="bg-emerald-50 text-emerald-700 text-xs ml-auto">Complete</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/* ─── Full Guide (static content) ─── */
function GuideContent() {
  return (
    <div className="prose prose-sm prose-gray max-w-none">
      <h2>Career-Ops — Complete Setup Guide</h2>

      <h3>What is career-ops?</h3>
      <p>
        AI-powered job search automation: evaluate offers against your profile, generate tailored ATS-optimized CVs, scan 45+ company portals, batch process multiple offers, and track your entire pipeline — all from one place.
      </p>

      <h3>Prerequisites</h3>
      <table>
        <thead>
          <tr><th>Tool</th><th>Required?</th><th>What for</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Node.js 18+</strong></td><td>Required</td><td>Core runtime for all scripts and web frontend</td></tr>
          <tr><td><strong>npm</strong></td><td>Required</td><td>Package manager (comes with Node.js)</td></tr>
          <tr><td><strong>Claude CLI</strong></td><td>Required</td><td>AI engine — evaluates offers, tailors CVs, generates interview prep</td></tr>
          <tr><td><strong>Playwright</strong></td><td>Recommended</td><td>PDF generation, job board scraping, auto-apply form filling</td></tr>
          <tr><td><strong>Go 1.21+</strong></td><td>Optional</td><td>Terminal dashboard (TUI) — alternative to web frontend</td></tr>
        </tbody>
      </table>

      <h3>Quick Start</h3>
      <ol>
        <li>
          <strong>Clone & setup:</strong>
          <pre><code>{`git clone https://github.com/Phani3108/career-ops.git
cd career-ops
bash setup.sh`}</code></pre>
        </li>
        <li>
          <strong>Start the web UI:</strong>
          <pre><code>{`cd web && npm run dev`}</code></pre>
        </li>
        <li>
          <strong>Open</strong> <a href="http://localhost:3000/setup">http://localhost:3000/setup</a> and follow the interactive steps
        </li>
      </ol>

      <h3>File Structure</h3>
      <table>
        <thead>
          <tr><th>File/Directory</th><th>Purpose</th><th>Who creates it</th></tr>
        </thead>
        <tbody>
          <tr><td><code>cv.md</code></td><td>Your canonical CV in markdown</td><td>You (upload PDF or paste)</td></tr>
          <tr><td><code>config/profile.yml</code></td><td>Your identity: name, email, target roles, salary, narrative</td><td>You (setup wizard)</td></tr>
          <tr><td><code>modes/_profile.md</code></td><td>Your customizations: archetypes, framing, proof points</td><td>Auto-created from template</td></tr>
          <tr><td><code>portals.yml</code></td><td>Job scanner config: companies, keywords, filters</td><td>Auto-created from template</td></tr>
          <tr><td><code>data/applications.md</code></td><td>Application tracker (markdown table)</td><td>Auto-created</td></tr>
          <tr><td><code>data/pipeline.md</code></td><td>Inbox of pending job URLs</td><td>Auto-created</td></tr>
          <tr><td><code>reports/</code></td><td>Evaluation reports with A-F scoring</td><td>Generated by evaluations</td></tr>
          <tr><td><code>output/</code></td><td>Generated PDFs and HTML</td><td>Generated by PDF builder</td></tr>
          <tr><td><code>web/.env.local</code></td><td>Web app env vars</td><td>Auto-created</td></tr>
        </tbody>
      </table>

      <h3>Integrations</h3>

      <h4>Claude CLI (Required)</h4>
      <p>This is the core AI engine. Install it globally:</p>
      <pre><code>{`npm install -g @anthropic-ai/claude-code
claude auth login`}</code></pre>
      <p>
        Claude CLI reads your CV, profile, and the job description, then produces structured evaluations, tailored CVs, and interview prep materials. All processing happens locally via the CLI — no API keys needed in the web app.
      </p>

      <h4>Playwright (Recommended)</h4>
      <p>Used for three things:</p>
      <ul>
        <li><strong>PDF generation</strong> — converts the HTML CV template to a pixel-perfect PDF</li>
        <li><strong>Job board scraping</strong> — scans LinkedIn, Indeed, Glassdoor for new offers</li>
        <li><strong>Auto-apply</strong> — fills application forms and detects form fields</li>
      </ul>
      <pre><code>{`npm install playwright
npx playwright install chromium`}</code></pre>

      <h4>Job Board Authentication</h4>
      <p>
        For better scanning results and auto-apply, you can authenticate with job boards.
        Go to the <strong>Integrations</strong> tab and click &quot;Connect&quot; for each platform.
        This opens a real browser window where you log in normally. Your session cookies are saved locally to{" "}
        <code>config/.auth/</code> and never leave your machine.
      </p>
      <p>Supported platforms:</p>
      <ul>
        <li><strong>LinkedIn</strong> — enables authenticated job search + Easy Apply</li>
        <li><strong>Indeed</strong> — enables authenticated search with better results</li>
        <li><strong>Glassdoor</strong> — enables search behind login wall</li>
      </ul>

      <h3>How the Pipeline Works</h3>
      <ol>
        <li><strong>Scan</strong> — The scanner checks Greenhouse APIs + scrapes LinkedIn/Indeed/Glassdoor for jobs matching your search config (roles, experience, location, salary)</li>
        <li><strong>Evaluate</strong> — Each job is evaluated against your CV and profile. Produces an A-F scored report with 10 dimensions</li>
        <li><strong>Tailor</strong> — Your CV is customized for each role above the score threshold, emphasizing relevant projects and skills</li>
        <li><strong>Apply</strong> — The auto-apply engine navigates to the application page, detects form fields, and pre-fills from your profile + Q&A learning store</li>
        <li><strong>Track</strong> — Everything is logged in <code>data/applications.md</code></li>
      </ol>

      <h3>Q&A Learning Store</h3>
      <p>
        The system learns from your answers. Every time you fill in an application question, the answer is saved to <code>data/qa-store.json</code> with fuzzy pattern matching. Next time a similar question appears, it auto-fills. Over time, this becomes a comprehensive answer bank that makes applications nearly autonomous.
      </p>

      <h3>Customization</h3>
      <table>
        <thead>
          <tr><th>Want to change...</th><th>Edit this file</th></tr>
        </thead>
        <tbody>
          <tr><td>Target roles / archetypes</td><td><code>modes/_profile.md</code> or <code>modes/_shared.md</code></td></tr>
          <tr><td>Your professional narrative</td><td><code>config/profile.yml</code> (narrative section)</td></tr>
          <tr><td>Company scanner list</td><td><code>portals.yml</code></td></tr>
          <tr><td>CV template design</td><td><code>templates/cv-template.html</code></td></tr>
          <tr><td>Salary negotiation scripts</td><td><code>modes/_shared.md</code> or <code>modes/_profile.md</code></td></tr>
          <tr><td>Search keywords / filters</td><td>Web UI → Auto Apply → Search Config</td></tr>
          <tr><td>Application answers</td><td>Web UI → Auto Apply (answers are learned automatically)</td></tr>
        </tbody>
      </table>

      <h3>Utility Scripts</h3>
      <table>
        <thead>
          <tr><th>Command</th><th>What it does</th></tr>
        </thead>
        <tbody>
          <tr><td><code>bash setup.sh</code></td><td>Full one-command setup</td></tr>
          <tr><td><code>cd web &amp;&amp; npm run dev</code></td><td>Start the web frontend</td></tr>
          <tr><td><code>npm run doctor</code></td><td>Validate your setup</td></tr>
          <tr><td><code>npm run verify</code></td><td>Check pipeline integrity</td></tr>
          <tr><td><code>npm run merge</code></td><td>Merge batch tracker additions</td></tr>
          <tr><td><code>npm run dedup</code></td><td>Remove duplicate tracker entries</td></tr>
          <tr><td><code>npm run normalize</code></td><td>Normalize status aliases</td></tr>
          <tr><td><code>npm run pdf</code></td><td>Generate a PDF from HTML</td></tr>
          <tr><td><code>npm run liveness</code></td><td>Check if tracked URLs are still live</td></tr>
        </tbody>
      </table>

      <h3>Sharing This Tool</h3>
      <p>
        To give this to someone else, they just need to:
      </p>
      <ol>
        <li>Clone the repo</li>
        <li>Run <code>bash setup.sh</code></li>
        <li>Start the web UI: <code>cd web &amp;&amp; npm run dev</code></li>
        <li>Open <a href="http://localhost:3000/setup">localhost:3000/setup</a> and follow the wizard</li>
      </ol>
      <p>
        That&apos;s it. The setup wizard handles everything: installs packages, creates directories, copies config templates, and guides them through profile setup — all from the browser.
      </p>
    </div>
  );
}
