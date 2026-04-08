import path from "path";

const ROOT = path.resolve(
  process.env.CAREER_OPS_ROOT || path.join(process.cwd(), "..")
);

export const paths = {
  root: ROOT,
  cv: path.join(ROOT, "cv.md"),
  articleDigest: path.join(ROOT, "article-digest.md"),
  profileYml: path.join(ROOT, "config", "profile.yml"),
  profileExample: path.join(ROOT, "config", "profile.example.yml"),
  profileMd: path.join(ROOT, "modes", "_profile.md"),
  profileTemplate: path.join(ROOT, "modes", "_profile.template.md"),
  sharedMd: path.join(ROOT, "modes", "_shared.md"),
  portalsYml: path.join(ROOT, "portals.yml"),
  portalsExample: path.join(ROOT, "templates", "portals.example.yml"),
  statesYml: path.join(ROOT, "templates", "states.yml"),
  cvTemplate: path.join(ROOT, "templates", "cv-template.html"),
  applicationsMd: path.join(ROOT, "data", "applications.md"),
  pipelineMd: path.join(ROOT, "data", "pipeline.md"),
  scanHistory: path.join(ROOT, "data", "scan-history.tsv"),
  storyBank: path.join(ROOT, "interview-prep", "story-bank.md"),
  reportsDir: path.join(ROOT, "reports"),
  outputDir: path.join(ROOT, "output"),
  jdsDir: path.join(ROOT, "jds"),
  interviewPrepDir: path.join(ROOT, "interview-prep"),
  batchDir: path.join(ROOT, "batch"),
  batchInput: path.join(ROOT, "batch", "batch-input.tsv"),
  batchState: path.join(ROOT, "batch", "batch-state.tsv"),
  batchPrompt: path.join(ROOT, "batch", "batch-prompt.md"),
  trackerAdditions: path.join(ROOT, "batch", "tracker-additions"),
  modesDir: path.join(ROOT, "modes"),
  fontsDir: path.join(ROOT, "fonts"),
  dataDir: path.join(ROOT, "data"),
  version: path.join(ROOT, "VERSION"),
  // Scripts
  scripts: {
    generatePdf: path.join(ROOT, "generate-pdf.mjs"),
    mergeTracker: path.join(ROOT, "merge-tracker.mjs"),
    verifyPipeline: path.join(ROOT, "verify-pipeline.mjs"),
    normalizeStatuses: path.join(ROOT, "normalize-statuses.mjs"),
    dedupTracker: path.join(ROOT, "dedup-tracker.mjs"),
    cvSyncCheck: path.join(ROOT, "cv-sync-check.mjs"),
    doctor: path.join(ROOT, "doctor.mjs"),
    updateSystem: path.join(ROOT, "update-system.mjs"),
    checkLiveness: path.join(ROOT, "check-liveness.mjs"),
  },
} as const;
