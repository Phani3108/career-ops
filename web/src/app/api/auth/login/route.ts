import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";

const AUTH_DIR = path.join(paths.root, "config", ".auth");

export async function GET() {
  try {
    const platforms = ["linkedin", "indeed", "glassdoor"];
    const status: Record<string, { authenticated: boolean; lastLogin?: string }> = {};

    for (const p of platforms) {
      const cookiePath = path.join(AUTH_DIR, `${p}-cookies.json`);
      if (fs.existsSync(cookiePath)) {
        const stat = fs.statSync(cookiePath);
        status[p] = { authenticated: true, lastLogin: stat.mtime.toISOString() };
      } else {
        status[p] = { authenticated: false };
      }
    }

    // Greenhouse is API-based, always available
    status.greenhouse = { authenticated: true, lastLogin: "API-based" };

    return NextResponse.json({ data: status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check auth status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { platform } = await request.json();
    if (!["linkedin", "indeed", "glassdoor"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // Launch headed Playwright browser for user to log in
    const { loadPlaywright } = await import("@/lib/playwright");
    const pw = await loadPlaywright();
    if (!pw) {
      return NextResponse.json(
        { error: "Playwright not installed. Run: npm install playwright && npx playwright install chromium" },
        { status: 503 }
      );
    }
    const chromium = pw.chromium;

    const loginUrls: Record<string, string> = {
      linkedin: "https://www.linkedin.com/login",
      indeed: "https://secure.indeed.com/auth",
      glassdoor: "https://www.glassdoor.com/profile/login_input.htm",
    };

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    await page.goto(loginUrls[platform], { waitUntil: "domcontentloaded" });

    // Wait for user to complete login (detect navigation away from login page)
    const successPatterns: Record<string, string> = {
      linkedin: "**/feed**",
      indeed: "**/mysearches**",
      glassdoor: "**/member/**",
    };

    try {
      await page.waitForURL(successPatterns[platform], { timeout: 120000 });
    } catch {
      // User might navigate elsewhere; check if cookies exist
    }

    // Save cookies
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    const storageState = await context.storageState();
    const cookiePath = path.join(AUTH_DIR, `${platform}-cookies.json`);
    fs.writeFileSync(cookiePath, JSON.stringify(storageState, null, 2), "utf-8");

    await browser.close();

    return NextResponse.json({
      data: { platform, authenticated: true, message: `${platform} login saved` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
