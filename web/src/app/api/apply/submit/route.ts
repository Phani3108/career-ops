import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";

export async function POST(request: NextRequest) {
  try {
    const { url, fields } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    const { loadPlaywright } = await import("@/lib/playwright");
    const pw = await loadPlaywright();
    if (!pw) {
      return NextResponse.json(
        { error: "Playwright not installed" },
        { status: 503 }
      );
    }

    const browser = await pw.chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000);

      // Re-fill all fields with user-approved values
      if (Array.isArray(fields)) {
        for (const field of fields) {
          if (field.value && field.name && field.type !== "file") {
            try {
              const selector = `[name="${field.name}"], [id="${field.name}"]`;
              await page.fill(selector, field.value);
            } catch {
              // Skip fields that can't be filled
            }
          }
        }
      }

      // Try to click submit
      const submitted = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button[type='submit'], input[type='submit'], button"));
        const submit = btns.find((b) => {
          const text = b.textContent?.toLowerCase() || "";
          return text.match(/\b(submit|apply|send|post)\b/);
        });
        if (submit) {
          (submit as HTMLElement).click();
          return true;
        }
        return false;
      });

      // Wait for navigation/response
      await page.waitForTimeout(3000);

      // Take confirmation screenshot
      const screenshotDir = path.join(paths.outputDir, "screenshots");
      if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
      const screenshotFilename = `submit-${Date.now()}.png`;
      const screenshotPath = path.join(screenshotDir, screenshotFilename);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      await browser.close();

      // Store any new Q&A from this application
      if (Array.isArray(fields)) {
        const qaPath = path.join(paths.root, "data", "qa-store.json");
        let qaEntries: Array<{ id: string; pattern: string; answer: string; usedCount: number; lastUsed: string }> = [];
        if (fs.existsSync(qaPath)) {
          try {
            qaEntries = JSON.parse(fs.readFileSync(qaPath, "utf-8")).questions || [];
          } catch {}
        }

        let changed = false;
        for (const field of fields) {
          if (field.value && field.label && field.source === "user") {
            const existing = qaEntries.find((e) => e.pattern.toLowerCase() === field.label.toLowerCase());
            if (existing) {
              existing.answer = field.value;
              existing.usedCount += 1;
              existing.lastUsed = new Date().toISOString();
            } else {
              qaEntries.push({
                id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                pattern: field.label,
                answer: field.value,
                usedCount: 1,
                lastUsed: new Date().toISOString(),
              });
            }
            changed = true;
          }
        }

        if (changed) {
          const dir = path.dirname(qaPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(qaPath, JSON.stringify({ questions: qaEntries }, null, 2), "utf-8");
        }
      }

      return NextResponse.json({
        data: {
          submitted,
          confirmationScreenshot: `output/screenshots/${screenshotFilename}`,
          url,
        },
      });
    } catch (err) {
      await browser.close();
      throw err;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
