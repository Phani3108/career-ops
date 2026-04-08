import { NextResponse } from "next/server";
import fs from "fs";
import { spawn } from "child_process";
import { paths } from "@/lib/paths";

interface DepStatus {
  installed: boolean;
  version?: string;
}

function checkCommand(cmd: string, args: string[] = ["--version"]): Promise<DepStatus> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { timeout: 5000 });
    let out = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (out += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) {
        const ver = out.match(/(\d+\.\d+[\.\d]*)/)?.[1];
        resolve({ installed: true, version: ver || "unknown" });
      } else {
        resolve({ installed: false });
      }
    });
    proc.on("error", () => resolve({ installed: false }));
  });
}

export async function GET() {
  // ── 1. Dependencies ──
  const [node, npm, playwright, claude] = await Promise.all([
    checkCommand("node", ["-v"]),
    checkCommand("npm", ["-v"]),
    checkCommand("npx", ["playwright", "--version"]),
    checkCommand("claude", ["--version"]),
  ]);

  const webNodeModules = fs.existsSync(
    paths.root + "/web/node_modules/.package-lock.json"
  ) || fs.existsSync(paths.root + "/web/node_modules");
  const rootNodeModules = fs.existsSync(paths.root + "/node_modules");

  // ── 2. Files & Config ──
  const files = {
    cv: fs.existsSync(paths.cv),
    profile: fs.existsSync(paths.profileYml),
    profileMd: fs.existsSync(paths.profileMd),
    portals: fs.existsSync(paths.portalsYml),
    applicationsMd: fs.existsSync(paths.applicationsMd),
    pipelineMd: fs.existsSync(paths.pipelineMd),
    scanHistory: fs.existsSync(paths.scanHistory),
    storyBank: fs.existsSync(paths.storyBank),
    envLocal: fs.existsSync(paths.root + "/web/.env.local"),
  };

  // ── 3. Directories ──
  const dirs = {
    data: fs.existsSync(paths.dataDir),
    reports: fs.existsSync(paths.reportsDir),
    output: fs.existsSync(paths.outputDir),
    jds: fs.existsSync(paths.jdsDir),
    batchTrackerAdditions: fs.existsSync(paths.trackerAdditions),
    interviewPrep: fs.existsSync(paths.interviewPrepDir),
    fonts: fs.existsSync(paths.fontsDir),
    config: fs.existsSync(paths.root + "/config"),
    configAuth: fs.existsSync(paths.authDir),
  };

  // ── 4. Integrations (auth cookies) ──
  const authPlatforms = ["linkedin", "indeed", "glassdoor"];
  const integrations: Record<string, { connected: boolean }> = {};
  for (const p of authPlatforms) {
    const cookiePath = paths.authDir + `/${p}-cookies.json`;
    integrations[p] = { connected: fs.existsSync(cookiePath) };
  }

  // ── 5. Profile summary (if exists) ──
  let profileSummary: Record<string, string> | null = null;
  if (files.profile) {
    try {
      const yaml = await import("js-yaml");
      const raw = fs.readFileSync(paths.profileYml, "utf-8");
      const parsed = yaml.load(raw) as Record<string, unknown>;
      const c = parsed?.candidate as Record<string, string> | undefined;
      if (c) {
        profileSummary = {
          name: c.full_name || "",
          email: c.email || "",
          location: c.location || "",
        };
      }
    } catch {
      // ignore parse errors
    }
  }

  // ── 6. Version ──
  let version = "";
  if (fs.existsSync(paths.version)) {
    version = fs.readFileSync(paths.version, "utf-8").trim();
  }

  // ── 7. Compute overall readiness ──
  const requiredFiles = [files.cv, files.profile, files.profileMd, files.portals];
  const readyCount = requiredFiles.filter(Boolean).length;
  const readiness = readyCount === requiredFiles.length
    ? "ready"
    : readyCount === 0
      ? "not-started"
      : "partial";

  return NextResponse.json({
    data: {
      readiness,
      readyCount,
      totalRequired: requiredFiles.length,
      version,
      dependencies: {
        node,
        npm,
        playwright,
        claude,
        rootNodeModules,
        webNodeModules,
      },
      files,
      dirs,
      integrations,
      profileSummary,
    },
  });
}
