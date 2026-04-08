import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";
import type { QAEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { url, tailoredPdfPath } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    // Load Playwright
    const { loadPlaywright } = await import("@/lib/playwright");
    const pw = await loadPlaywright();
    if (!pw) {
      return NextResponse.json(
        { error: "Playwright not installed. Run: npm install playwright && npx playwright install chromium" },
        { status: 503 }
      );
    }

    // Load profile for auto-fill
    let profile: Record<string, string> = {};
    if (fs.existsSync(paths.profileYml)) {
      const yaml = (await import("js-yaml")).default;
      const raw = yaml.load(fs.readFileSync(paths.profileYml, "utf-8")) as Record<string, unknown>;
      const candidate = raw.candidate as Record<string, string> | undefined;
      if (candidate) {
        profile = {
          name: candidate.full_name || "",
          email: candidate.email || "",
          phone: candidate.phone || "",
          linkedin: candidate.linkedin || "",
          location: candidate.location || "",
          github: candidate.github || "",
          portfolio: candidate.portfolio_url || "",
        };
      }
    }

    // Load Q&A store for smart answering
    const qaPath = path.join(paths.root, "data", "qa-store.json");
    let qaEntries: QAEntry[] = [];
    if (fs.existsSync(qaPath)) {
      try {
        qaEntries = JSON.parse(fs.readFileSync(qaPath, "utf-8")).questions || [];
      } catch {}
    }

    // Launch browser
    const browser = await pw.chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000);

      // Detect form fields
      const fields = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
        return inputs.map((el) => {
          const input = el as HTMLInputElement;
          return {
            type: input.type || el.tagName.toLowerCase(),
            name: input.name || input.id || "",
            label: (() => {
              // Try to find associated label
              const id = input.id;
              if (id) {
                const label = document.querySelector(`label[for="${id}"]`);
                if (label) return label.textContent?.trim() || "";
              }
              const parent = input.closest("label, .field, .form-group, [class*='field']");
              if (parent) {
                const labelEl = parent.querySelector("label, .label, span");
                if (labelEl) return labelEl.textContent?.trim() || "";
              }
              return input.placeholder || input.name || "";
            })(),
            placeholder: input.placeholder || "",
            required: input.required,
            value: input.value,
          };
        }).filter((f) => f.name || f.label);
      });

      // Auto-fill known fields
      const fillResults: Array<{ name: string; label: string; value: string; source: string; confidence: number }> = [];

      for (const field of fields) {
        const labelLower = (field.label + " " + field.name + " " + field.placeholder).toLowerCase();
        let value = "";
        let source = "empty";
        let confidence = 0;

        // First check profile fields
        if (labelLower.match(/\b(name|full.?name|your.?name)\b/)) {
          value = profile.name || "";
          source = "profile";
          confidence = 0.95;
        } else if (labelLower.match(/\b(email|e-mail)\b/)) {
          value = profile.email || "";
          source = "profile";
          confidence = 0.95;
        } else if (labelLower.match(/\b(phone|tel|mobile)\b/)) {
          value = profile.phone || "";
          source = "profile";
          confidence = 0.95;
        } else if (labelLower.match(/\b(linkedin)\b/)) {
          value = profile.linkedin || "";
          source = "profile";
          confidence = 0.95;
        } else if (labelLower.match(/\b(github)\b/)) {
          value = profile.github || "";
          source = "profile";
          confidence = 0.9;
        } else if (labelLower.match(/\b(portfolio|website|url)\b/) && !labelLower.match(/\b(job|company)\b/)) {
          value = profile.portfolio || "";
          source = "profile";
          confidence = 0.85;
        } else if (labelLower.match(/\b(location|city|address)\b/)) {
          value = profile.location || "";
          source = "profile";
          confidence = 0.8;
        }

        // Then check Q&A store
        if (!value) {
          const match = findBestQAMatch(field.label || field.name, qaEntries);
          if (match) {
            value = match.answer;
            source = "qa-store";
            confidence = match.confidence;
          }
        }

        // Fill the field if we have a value
        if (value && field.type !== "file") {
          try {
            const selector = field.name
              ? `[name="${field.name}"], [id="${field.name}"]`
              : `[placeholder="${field.placeholder}"]`;
            await page.fill(selector, value);
          } catch {
            // Field fill failed — still record the intended value
          }
        }

        fillResults.push({
          name: field.name,
          label: field.label,
          value,
          source,
          confidence,
        });
      }

      // Attach resume PDF if file input exists
      let resumeAttached = false;
      if (tailoredPdfPath) {
        const fullPdfPath = path.join(paths.root, tailoredPdfPath);
        if (fs.existsSync(fullPdfPath)) {
          try {
            const fileInput = await page.$("input[type='file']");
            if (fileInput) {
              await fileInput.setInputFiles(fullPdfPath);
              resumeAttached = true;
            }
          } catch {}
        }
      }

      // Take screenshot
      const screenshotDir = path.join(paths.outputDir, "screenshots");
      if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
      const screenshotFilename = `apply-${Date.now()}.png`;
      const screenshotPath = path.join(screenshotDir, screenshotFilename);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Find the submit button (but DON'T click it)
      const submitSelector = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button[type='submit'], input[type='submit'], button"));
        const submit = btns.find((b) => {
          const text = b.textContent?.toLowerCase() || "";
          return text.match(/\b(submit|apply|send|post)\b/);
        });
        return submit ? (submit as HTMLElement).outerHTML : null;
      });

      await browser.close();

      return NextResponse.json({
        data: {
          url,
          fields: fillResults,
          screenshotPath: `output/screenshots/${screenshotFilename}`,
          resumeAttached,
          submitButtonFound: !!submitSelector,
          unansweredQuestions: fillResults
            .filter((f) => !f.value && f.label)
            .map((f) => ({ question: f.label, name: f.name })),
        },
      });
    } catch (err) {
      await browser.close();
      throw err;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Prepare failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function findBestQAMatch(
  question: string,
  entries: QAEntry[]
): { answer: string; confidence: number } | null {
  if (!question || entries.length === 0) return null;
  const qLower = question.toLowerCase();
  const qWords = new Set(qLower.split(/\W+/).filter((w) => w.length > 2));

  let bestMatch: { answer: string; confidence: number } | null = null;

  for (const entry of entries) {
    const pLower = entry.pattern.toLowerCase();

    // Exact match
    if (pLower === qLower) {
      return { answer: entry.answer, confidence: 1.0 };
    }

    // Word overlap (Jaccard)
    const pWords = new Set(pLower.split(/\W+/).filter((w) => w.length > 2));
    const intersection = new Set([...qWords].filter((w) => pWords.has(w)));
    const union = new Set([...qWords, ...pWords]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;

    if (jaccard > 0.5 && (!bestMatch || jaccard > bestMatch.confidence)) {
      bestMatch = { answer: entry.answer, confidence: jaccard };
    }
  }

  return bestMatch;
}
