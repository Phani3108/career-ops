import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";
import { loadPlaywright } from "@/lib/playwright";
import type { SearchConfig, ScanResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { config } = (await request.json()) as { config: SearchConfig };
    if (!config) {
      return NextResponse.json({ error: "config required" }, { status: 400 });
    }

    // Build search keywords from config
    const keywords = [
      ...config.roles,
      ...config.keywords,
      ...config.seniority.map((s) => `${s}`),
    ];
    const excludeSet = new Set(config.excludeKeywords.map((k) => k.toLowerCase()));

    // Load dedup sets
    const seenUrls = new Set<string>();
    if (fs.existsSync(paths.scanHistory)) {
      const lines = fs.readFileSync(paths.scanHistory, "utf-8").split("\n");
      for (const line of lines) {
        const url = line.split("\t")[0];
        if (url && url.startsWith("http")) seenUrls.add(url);
      }
    }
    if (fs.existsSync(paths.applicationsMd)) {
      const content = fs.readFileSync(paths.applicationsMd, "utf-8");
      const urlMatches = content.match(/https?:\/\/[^\s)]+/g);
      if (urlMatches) urlMatches.forEach((u) => seenUrls.add(u));
    }

    const results: ScanResult[] = [];
    const errors: string[] = [];

    // --- Greenhouse API scanning ---
    if (config.sources.greenhouse) {
      try {
        // Load portals config for greenhouse companies
        let portalsPath = paths.portalsYml;
        if (!fs.existsSync(portalsPath)) portalsPath = paths.portalsExample;
        if (fs.existsSync(portalsPath)) {
          const yaml = (await import("js-yaml")).default;
          const portals = yaml.load(fs.readFileSync(portalsPath, "utf-8")) as {
            tracked_companies?: Array<{ name: string; careers_url: string; greenhouse_slug?: string }>;
          };

          const companies = portals.tracked_companies || [];
          for (const company of companies) {
            // Extract greenhouse slug from URL or explicit field
            let slug = company.greenhouse_slug;
            if (!slug) {
              const m = company.careers_url?.match(/boards\.greenhouse\.io\/(\w+)/);
              if (m) slug = m[1];
            }
            if (!slug) continue;

            try {
              const resp = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, {
                signal: AbortSignal.timeout(10000),
              });
              if (!resp.ok) continue;
              const data = (await resp.json()) as { jobs: Array<{ title: string; absolute_url: string; location?: { name: string }; updated_at?: string }> };

              for (const job of data.jobs || []) {
                const titleLower = job.title.toLowerCase();
                // Check keyword match
                const matches = keywords.some((kw) => titleLower.includes(kw.toLowerCase()));
                if (!matches) continue;
                // Check exclude
                const excluded = Array.from(excludeSet).some((ex) => titleLower.includes(ex));
                if (excluded) continue;
                // Dedup
                if (seenUrls.has(job.absolute_url)) continue;

                results.push({
                  company: company.name,
                  title: job.title,
                  url: job.absolute_url,
                  source: "greenhouse",
                  postedDate: job.updated_at?.split("T")[0],
                  location: job.location?.name,
                });
                seenUrls.add(job.absolute_url);
              }
            } catch {
              // Skip individual company failures
            }
          }
        }
      } catch (err) {
        errors.push(`Greenhouse: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    // --- LinkedIn job search (scraping) ---
    if (config.sources.linkedin) {
      try {
        const authDir = path.join(paths.root, "config", ".auth");
        const cookiePath = path.join(authDir, "linkedin-cookies.json");
        const hasAuth = fs.existsSync(cookiePath);

        // Build LinkedIn search URL
        const query = encodeURIComponent(config.roles.join(" OR "));
        const location = encodeURIComponent(config.locations[0] || "");
        const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${location}&f_TPR=r604800`;

        let pw;
        pw = await loadPlaywright();
        if (!pw) {
          errors.push("LinkedIn: Playwright not installed");
        }

        if (pw) {
          const browser = await pw.chromium.launch({ headless: true });
          const context = hasAuth
            ? await browser.newContext({
                storageState: JSON.parse(fs.readFileSync(cookiePath, "utf-8")),
                userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
              })
            : await browser.newContext({
                userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
              });

          const page = await context.newPage();
          try {
            await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
            await page.waitForTimeout(2000);

            // Scrape job cards
            const jobs = await page.evaluate(() => {
              const cards = document.querySelectorAll(".base-card, .job-search-card, [data-entity-urn]");
              return Array.from(cards).slice(0, 25).map((card) => {
                const titleEl = card.querySelector(".base-search-card__title, .job-search-card__title, h3");
                const companyEl = card.querySelector(".base-search-card__subtitle, .job-search-card__company-name, h4");
                const linkEl = card.querySelector("a[href*='/jobs/']") as HTMLAnchorElement;
                const locEl = card.querySelector(".job-search-card__location, .base-search-card__metadata span");
                return {
                  title: titleEl?.textContent?.trim() || "",
                  company: companyEl?.textContent?.trim() || "",
                  url: linkEl?.href || "",
                  location: locEl?.textContent?.trim() || "",
                };
              }).filter((j) => j.title && j.url);
            });

            for (const job of jobs) {
              const titleLower = job.title.toLowerCase();
              const excluded = Array.from(excludeSet).some((ex) => titleLower.includes(ex));
              if (excluded || seenUrls.has(job.url)) continue;

              results.push({
                company: job.company,
                title: job.title,
                url: job.url,
                source: "linkedin",
                location: job.location,
              });
              seenUrls.add(job.url);
            }
          } catch {
            errors.push("LinkedIn: scraping failed (may be rate-limited)");
          } finally {
            await browser.close();
          }
        }
      } catch (err) {
        errors.push(`LinkedIn: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    // --- Indeed job search ---
    if (config.sources.indeed) {
      try {
        const query = encodeURIComponent(config.roles.join(" "));
        const location = encodeURIComponent(config.locations[0] || "");
        const searchUrl = `https://www.indeed.com/jobs?q=${query}&l=${location}&fromage=7`;

        let pw;
        pw = await loadPlaywright();
        if (!pw) {
          errors.push("Indeed: Playwright not installed");
        }

        if (pw) {
          const browser = await pw.chromium.launch({ headless: true });
          const context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          });
          const page = await context.newPage();
          try {
            await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
            await page.waitForTimeout(2000);

            const jobs = await page.evaluate(() => {
              const cards = document.querySelectorAll(".job_seen_beacon, .jobsearch-ResultsList > li, .result");
              return Array.from(cards).slice(0, 25).map((card) => {
                const titleEl = card.querySelector(".jobTitle a, h2 a, [data-jk] a") as HTMLAnchorElement;
                const companyEl = card.querySelector(".companyName, [data-testid='company-name'], .company");
                const locEl = card.querySelector(".companyLocation, [data-testid='text-location']");
                return {
                  title: titleEl?.textContent?.trim() || "",
                  company: companyEl?.textContent?.trim() || "",
                  url: titleEl?.href ? new URL(titleEl.href, "https://www.indeed.com").href : "",
                  location: locEl?.textContent?.trim() || "",
                };
              }).filter((j) => j.title && j.url);
            });

            for (const job of jobs) {
              const titleLower = job.title.toLowerCase();
              const excluded = Array.from(excludeSet).some((ex) => titleLower.includes(ex));
              if (excluded || seenUrls.has(job.url)) continue;

              results.push({
                company: job.company,
                title: job.title,
                url: job.url,
                source: "indeed",
                location: job.location,
              });
              seenUrls.add(job.url);
            }
          } catch {
            errors.push("Indeed: scraping failed (may be blocked)");
          } finally {
            await browser.close();
          }
        }
      } catch (err) {
        errors.push(`Indeed: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    // --- Glassdoor job search ---
    if (config.sources.glassdoor) {
      try {
        const query = encodeURIComponent(config.roles.join(" "));
        const searchUrl = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${query}`;

        let pw;
        pw = await loadPlaywright();
        if (!pw) {
          errors.push("Glassdoor: Playwright not installed");
        }

        if (pw) {
          const browser = await pw.chromium.launch({ headless: true });
          const context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          });
          const page = await context.newPage();
          try {
            await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
            await page.waitForTimeout(2000);

            const jobs = await page.evaluate(() => {
              const cards = document.querySelectorAll("[data-test='jobListing'], .react-job-listing, li[data-id]");
              return Array.from(cards).slice(0, 25).map((card) => {
                const titleEl = card.querySelector("a[data-test='job-link'], .jobLink, a.jobTitle") as HTMLAnchorElement;
                const companyEl = card.querySelector("[data-test='emp-name'], .jobEmpolyerName, .employerName");
                const locEl = card.querySelector("[data-test='emp-location'], .loc, .jobLocation");
                return {
                  title: titleEl?.textContent?.trim() || "",
                  company: companyEl?.textContent?.trim() || "",
                  url: titleEl?.href || "",
                  location: locEl?.textContent?.trim() || "",
                };
              }).filter((j) => j.title && j.url);
            });

            for (const job of jobs) {
              const titleLower = job.title.toLowerCase();
              const excluded = Array.from(excludeSet).some((ex) => titleLower.includes(ex));
              if (excluded || seenUrls.has(job.url)) continue;

              results.push({
                company: job.company,
                title: job.title,
                url: job.url,
                source: "glassdoor",
                location: job.location,
              });
              seenUrls.add(job.url);
            }
          } catch {
            errors.push("Glassdoor: scraping failed (may be blocked)");
          } finally {
            await browser.close();
          }
        }
      } catch (err) {
        errors.push(`Glassdoor: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    // --- Append new results to pipeline.md and scan-history.tsv ---
    if (results.length > 0) {
      // Append to pipeline.md
      const pipelinePath = paths.pipelineMd;
      let pipelineContent = "";
      if (fs.existsSync(pipelinePath)) {
        pipelineContent = fs.readFileSync(pipelinePath, "utf-8");
      } else {
        pipelineContent = "# Pipeline\n\n## Pending\n";
      }

      const newLines = results.map((r) => `- [ ] ${r.url}`).join("\n");
      // Insert before "## Processed" if it exists, otherwise append
      const processedIdx = pipelineContent.indexOf("## Processed");
      if (processedIdx > 0) {
        pipelineContent =
          pipelineContent.slice(0, processedIdx) + newLines + "\n\n" + pipelineContent.slice(processedIdx);
      } else {
        pipelineContent += "\n" + newLines + "\n";
      }
      fs.writeFileSync(pipelinePath, pipelineContent, "utf-8");

      // Append to scan-history.tsv
      const historyPath = paths.scanHistory;
      const now = new Date().toISOString().split("T")[0];
      const historyLines = results
        .map((r) => `${r.url}\t${now}\t${r.source}\t${r.title}\t${r.company}\tpending`)
        .join("\n");
      if (fs.existsSync(historyPath)) {
        fs.appendFileSync(historyPath, "\n" + historyLines, "utf-8");
      } else {
        fs.writeFileSync(
          historyPath,
          "url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n" + historyLines,
          "utf-8"
        );
      }
    }

    return NextResponse.json({
      data: {
        results,
        total: results.length,
        errors: errors.length > 0 ? errors : undefined,
        sources: {
          greenhouse: results.filter((r) => r.source === "greenhouse").length,
          linkedin: results.filter((r) => r.source === "linkedin").length,
          indeed: results.filter((r) => r.source === "indeed").length,
          glassdoor: results.filter((r) => r.source === "glassdoor").length,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
