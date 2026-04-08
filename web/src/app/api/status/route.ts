import { NextResponse } from "next/server";
import fs from "fs";
import { paths } from "@/lib/paths";
import { checkClaudeCLI } from "@/lib/scripts/runner";

export async function GET() {
  const checks: Record<string, boolean> = {};

  checks.cvExists = fs.existsSync(paths.cv);
  checks.profileExists = fs.existsSync(paths.profileYml);
  checks.profileMdExists = fs.existsSync(paths.profileMd);
  checks.portalsExists = fs.existsSync(paths.portalsYml);
  checks.applicationsMdExists = fs.existsSync(paths.applicationsMd);
  checks.pipelineMdExists = fs.existsSync(paths.pipelineMd);
  checks.statesYmlExists = fs.existsSync(paths.statesYml);
  checks.reportsDir = fs.existsSync(paths.reportsDir);
  checks.outputDir = fs.existsSync(paths.outputDir);
  checks.claudeCLI = await checkClaudeCLI();

  let version = "";
  if (fs.existsSync(paths.version)) {
    version = fs.readFileSync(paths.version, "utf-8").trim();
  }

  return NextResponse.json({ data: { checks, version } });
}
