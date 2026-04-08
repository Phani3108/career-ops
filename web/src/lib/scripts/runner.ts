import { spawn } from "child_process";
import { paths } from "../paths";
import type { ScriptResult } from "../types";

export function runScript(scriptPath: string, args: string[] = []): Promise<ScriptResult> {
  return new Promise((resolve) => {
    const proc = spawn("node", [scriptPath, ...args], {
      cwd: paths.root,
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });

    proc.on("error", (err) => {
      resolve({ stdout, stderr: err.message, exitCode: 1 });
    });
  });
}

export function runScriptStream(
  scriptPath: string,
  args: string[] = [],
  onData: (chunk: string) => void,
  onError?: (chunk: string) => void
): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn("node", [scriptPath, ...args], {
      cwd: paths.root,
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });

    proc.stdout.on("data", (data) => onData(data.toString()));
    proc.stderr.on("data", (data) => onError?.(data.toString()));
    proc.on("close", (code) => resolve(code ?? 1));
    proc.on("error", () => resolve(1));
  });
}

export async function checkClaudeCLI(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("which", ["claude"]);
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}
