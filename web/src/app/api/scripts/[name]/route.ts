import { NextRequest, NextResponse } from "next/server";
import { runScript } from "@/lib/scripts/runner";
import { paths } from "@/lib/paths";

const ALLOWED_SCRIPTS: Record<string, string> = {
  doctor: paths.scripts.doctor,
  verify: paths.scripts.verifyPipeline,
  normalize: paths.scripts.normalizeStatuses,
  dedup: paths.scripts.dedupTracker,
  merge: paths.scripts.mergeTracker,
  "sync-check": paths.scripts.cvSyncCheck,
  liveness: paths.scripts.checkLiveness,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const scriptPath = ALLOWED_SCRIPTS[name];
  if (!scriptPath) {
    return NextResponse.json(
      { error: `Unknown script: ${name}. Allowed: ${Object.keys(ALLOWED_SCRIPTS).join(", ")}` },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const args: string[] = body.args || [];
  // Only allow known safe flags
  const safeArgs = args.filter((a: string) => /^--[\w-]+$/.test(a));

  const result = await runScript(scriptPath, safeArgs);
  return NextResponse.json({ data: result });
}
