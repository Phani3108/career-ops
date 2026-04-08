import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";

const CONFIG_PATH = path.join(paths.root, "config", "search-config.json");

const DEFAULT_CONFIG = {
  roles: ["Engineering", "AI", "Product", "Strategy", "Sales", "Consulting"],
  experienceMin: 7,
  experienceMax: 15,
  roleExperienceMin: 5,
  locations: ["Remote"],
  jobType: ["Full-time"],
  seniority: ["Director", "VP", "Head of", "Principal", "Staff", "Senior"],
  sources: {
    linkedin: true,
    indeed: true,
    glassdoor: true,
    greenhouse: true,
  },
  salaryMin: 150000,
  keywords: [],
  excludeKeywords: [],
};

export async function GET() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      return NextResponse.json({ data: JSON.parse(raw) });
    }
    return NextResponse.json({ data: DEFAULT_CONFIG });
  } catch {
    return NextResponse.json({ data: DEFAULT_CONFIG });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const config = body.config;
    if (!config || typeof config !== "object") {
      return NextResponse.json({ error: "config object required" }, { status: 400 });
    }

    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
    return NextResponse.json({ data: config });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
