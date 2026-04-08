import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { paths } from "@/lib/paths";

type ActionType =
  | "install-root-deps"
  | "install-web-deps"
  | "install-playwright"
  | "create-dirs"
  | "copy-profile"
  | "copy-profile-md"
  | "copy-portals"
  | "create-env-local"
  | "create-applications-md"
  | "create-pipeline-md"
  | "create-scan-history"
  | "save-profile-field"
  | "save-cv"
  | "run-full-setup";

function runCommand(
  cmd: string,
  args: string[],
  cwd: string
): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, timeout: 120000 });
    let out = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (out += d.toString()));
    proc.on("close", (code) => resolve({ ok: code === 0, output: out }));
    proc.on("error", (e) => resolve({ ok: false, output: e.message }));
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action as ActionType;
  const payload = body.payload as Record<string, unknown> | undefined;

  try {
    switch (action) {
      // ── Dependencies ──
      case "install-root-deps": {
        const result = await runCommand("npm", ["install", "--no-audit", "--no-fund"], paths.root);
        return NextResponse.json({ ok: result.ok, message: result.ok ? "Root dependencies installed" : result.output });
      }
      case "install-web-deps": {
        const webDir = path.join(paths.root, "web");
        const result = await runCommand("npm", ["install", "--no-audit", "--no-fund"], webDir);
        return NextResponse.json({ ok: result.ok, message: result.ok ? "Web dependencies installed" : result.output });
      }
      case "install-playwright": {
        const result = await runCommand("npx", ["playwright", "install", "chromium"], paths.root);
        return NextResponse.json({ ok: result.ok, message: result.ok ? "Playwright chromium installed" : result.output });
      }

      // ── Directories ──
      case "create-dirs": {
        const dirsToCreate = [
          "data",
          "reports",
          "output",
          "jds",
          "batch/tracker-additions",
          "batch/logs",
          "config",
          "config/.auth",
          "interview-prep",
          "fonts",
        ];
        for (const d of dirsToCreate) {
          fs.mkdirSync(path.join(paths.root, d), { recursive: true });
        }
        return NextResponse.json({ ok: true, message: "All directories created" });
      }

      // ── Config files ──
      case "copy-profile": {
        if (fs.existsSync(paths.profileYml)) {
          return NextResponse.json({ ok: true, message: "config/profile.yml already exists" });
        }
        if (!fs.existsSync(paths.profileExample)) {
          return NextResponse.json({ ok: false, message: "config/profile.example.yml not found" });
        }
        fs.copyFileSync(paths.profileExample, paths.profileYml);
        return NextResponse.json({ ok: true, message: "Created config/profile.yml from template" });
      }
      case "copy-profile-md": {
        if (fs.existsSync(paths.profileMd)) {
          return NextResponse.json({ ok: true, message: "modes/_profile.md already exists" });
        }
        if (!fs.existsSync(paths.profileTemplate)) {
          return NextResponse.json({ ok: false, message: "modes/_profile.template.md not found" });
        }
        fs.copyFileSync(paths.profileTemplate, paths.profileMd);
        return NextResponse.json({ ok: true, message: "Created modes/_profile.md from template" });
      }
      case "copy-portals": {
        if (fs.existsSync(paths.portalsYml)) {
          return NextResponse.json({ ok: true, message: "portals.yml already exists" });
        }
        if (!fs.existsSync(paths.portalsExample)) {
          return NextResponse.json({ ok: false, message: "templates/portals.example.yml not found" });
        }
        fs.copyFileSync(paths.portalsExample, paths.portalsYml);
        return NextResponse.json({ ok: true, message: "Created portals.yml from template" });
      }
      case "create-env-local": {
        const envPath = path.join(paths.root, "web", ".env.local");
        if (fs.existsSync(envPath)) {
          return NextResponse.json({ ok: true, message: "web/.env.local already exists" });
        }
        fs.writeFileSync(envPath, "CAREER_OPS_ROOT=..\n");
        return NextResponse.json({ ok: true, message: "Created web/.env.local" });
      }

      // ── Data files ──
      case "create-applications-md": {
        if (fs.existsSync(paths.applicationsMd)) {
          return NextResponse.json({ ok: true, message: "data/applications.md already exists" });
        }
        fs.mkdirSync(path.dirname(paths.applicationsMd), { recursive: true });
        fs.writeFileSync(
          paths.applicationsMd,
          "# Applications Tracker\n\n| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n|---|------|---------|------|-------|--------|-----|--------|-------|\n"
        );
        return NextResponse.json({ ok: true, message: "Created data/applications.md" });
      }
      case "create-pipeline-md": {
        if (fs.existsSync(paths.pipelineMd)) {
          return NextResponse.json({ ok: true, message: "data/pipeline.md already exists" });
        }
        fs.mkdirSync(path.dirname(paths.pipelineMd), { recursive: true });
        fs.writeFileSync(
          paths.pipelineMd,
          "# Pipeline — Pending URLs\n\n<!-- Add URLs below, one per line. Format: URL or URL | source label -->\n"
        );
        return NextResponse.json({ ok: true, message: "Created data/pipeline.md" });
      }
      case "create-scan-history": {
        if (fs.existsSync(paths.scanHistory)) {
          return NextResponse.json({ ok: true, message: "data/scan-history.tsv already exists" });
        }
        fs.mkdirSync(path.dirname(paths.scanHistory), { recursive: true });
        fs.writeFileSync(paths.scanHistory, "date\turl\ttitle\tcompany\tsource\n");
        return NextResponse.json({ ok: true, message: "Created data/scan-history.tsv" });
      }

      // ── Save profile field ──
      case "save-profile-field": {
        if (!payload) {
          return NextResponse.json({ ok: false, message: "No payload provided" });
        }
        const yaml = await import("js-yaml");
        let profileData: Record<string, unknown> = {};
        if (fs.existsSync(paths.profileYml)) {
          profileData = yaml.load(fs.readFileSync(paths.profileYml, "utf-8")) as Record<string, unknown> || {};
        }
        // Deep merge the payload into the profile
        const field = payload.field as string;
        const value = payload.value;
        const keys = field.split(".");
        let obj: Record<string, unknown> = profileData;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]] || typeof obj[keys[i]] !== "object") {
            obj[keys[i]] = {};
          }
          obj = obj[keys[i]] as Record<string, unknown>;
        }
        obj[keys[keys.length - 1]] = value;

        fs.writeFileSync(paths.profileYml, yaml.dump(profileData, { lineWidth: -1 }));
        return NextResponse.json({ ok: true, message: `Updated ${field}` });
      }

      // ── Save CV ──
      case "save-cv": {
        const content = payload?.content as string;
        if (!content) {
          return NextResponse.json({ ok: false, message: "No content provided" });
        }
        fs.writeFileSync(paths.cv, content);
        return NextResponse.json({ ok: true, message: "CV saved" });
      }

      // ── Full setup (runs setup.sh equivalent) ──
      case "run-full-setup": {
        // Create dirs
        const dirsToCreate = [
          "data", "reports", "output", "jds",
          "batch/tracker-additions", "batch/logs",
          "config", "config/.auth", "interview-prep", "fonts",
        ];
        for (const d of dirsToCreate) {
          fs.mkdirSync(path.join(paths.root, d), { recursive: true });
        }

        // Copy templates
        if (!fs.existsSync(paths.profileYml) && fs.existsSync(paths.profileExample)) {
          fs.copyFileSync(paths.profileExample, paths.profileYml);
        }
        if (!fs.existsSync(paths.profileMd) && fs.existsSync(paths.profileTemplate)) {
          fs.copyFileSync(paths.profileTemplate, paths.profileMd);
        }
        if (!fs.existsSync(paths.portalsYml) && fs.existsSync(paths.portalsExample)) {
          fs.copyFileSync(paths.portalsExample, paths.portalsYml);
        }

        // Create data files
        if (!fs.existsSync(paths.applicationsMd)) {
          fs.writeFileSync(
            paths.applicationsMd,
            "# Applications Tracker\n\n| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n|---|------|---------|------|-------|--------|-----|--------|-------|\n"
          );
        }
        if (!fs.existsSync(paths.pipelineMd)) {
          fs.writeFileSync(
            paths.pipelineMd,
            "# Pipeline — Pending URLs\n\n<!-- Add URLs below, one per line. Format: URL or URL | source label -->\n"
          );
        }
        if (!fs.existsSync(paths.scanHistory)) {
          fs.writeFileSync(paths.scanHistory, "date\turl\ttitle\tcompany\tsource\n");
        }

        // Env
        const envPath = path.join(paths.root, "web", ".env.local");
        if (!fs.existsSync(envPath)) {
          fs.writeFileSync(envPath, "CAREER_OPS_ROOT=..\n");
        }

        // Install deps
        const rootInstall = await runCommand("npm", ["install", "--no-audit", "--no-fund"], paths.root);
        const webInstall = await runCommand("npm", ["install", "--no-audit", "--no-fund"], path.join(paths.root, "web"));

        // Try installing playwright
        const pwInstall = await runCommand("npx", ["playwright", "install", "chromium"], paths.root);

        return NextResponse.json({
          ok: true,
          message: "Full setup complete",
          details: {
            rootDeps: rootInstall.ok,
            webDeps: webInstall.ok,
            playwright: pwInstall.ok,
          },
        });
      }

      default:
        return NextResponse.json({ ok: false, message: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
