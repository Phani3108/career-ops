#!/usr/bin/env bash
# career-ops — One-command setup
# Usage: curl -sL <repo>/setup.sh | bash   OR   bash setup.sh
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}ℹ${NC}  $1"; }
ok()    { echo -e "${GREEN}✓${NC}  $1"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $1"; }
fail()  { echo -e "${RED}✗${NC}  $1"; }
step()  { echo -e "\n${BOLD}[$1/$TOTAL] $2${NC}"; }

TOTAL=7

echo -e "\n${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       career-ops setup wizard        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}\n"

# ── Step 1: Node.js ──
step 1 "Checking Node.js"
if command -v node &>/dev/null; then
  NODE_V=$(node -v)
  ok "Node.js $NODE_V found"
  MAJOR=$(echo "$NODE_V" | sed 's/v//' | cut -d. -f1)
  if [ "$MAJOR" -lt 18 ]; then
    fail "Node.js 18+ required (you have $NODE_V)"
    exit 1
  fi
else
  fail "Node.js not found. Install from https://nodejs.org"
  exit 1
fi

# ── Step 2: Root dependencies ──
step 2 "Installing root dependencies"
if [ -f package.json ]; then
  npm install --no-audit --no-fund 2>/dev/null
  ok "Root npm packages installed"
else
  warn "No root package.json found — skipping"
fi

# ── Step 3: Web frontend ──
step 3 "Installing web frontend"
if [ -d web ]; then
  cd web
  npm install --no-audit --no-fund 2>/dev/null
  ok "Web frontend packages installed"
  cd ..
else
  fail "web/ directory not found. Is this the career-ops root?"
  exit 1
fi

# ── Step 4: Playwright ──
step 4 "Installing Playwright (for PDF + scraping)"
if npx playwright --version &>/dev/null 2>&1; then
  ok "Playwright already installed"
else
  info "Installing Playwright chromium..."
  npx playwright install chromium 2>/dev/null
  ok "Playwright chromium installed"
fi

# ── Step 5: Directory structure ──
step 5 "Creating directories & data files"
mkdir -p data reports output jds batch/tracker-additions batch/logs config interview-prep fonts

# Create data files if missing
if [ ! -f data/applications.md ]; then
  cat > data/applications.md << 'EOF'
# Applications Tracker

| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|------|---------|------|-------|--------|-----|--------|-------|
EOF
  ok "Created data/applications.md"
else
  ok "data/applications.md exists"
fi

if [ ! -f data/pipeline.md ]; then
  cat > data/pipeline.md << 'EOF'
# Pipeline — Pending URLs

<!-- Add URLs below, one per line. Format: URL or URL | source label -->
EOF
  ok "Created data/pipeline.md"
else
  ok "data/pipeline.md exists"
fi

if [ ! -f data/scan-history.tsv ]; then
  echo -e "date\turl\ttitle\tcompany\tsource" > data/scan-history.tsv
  ok "Created data/scan-history.tsv"
else
  ok "data/scan-history.tsv exists"
fi

# ── Step 6: Config templates ──
step 6 "Setting up configuration"

if [ ! -f config/profile.yml ] && [ -f config/profile.example.yml ]; then
  cp config/profile.example.yml config/profile.yml
  ok "Created config/profile.yml (edit with your details)"
else
  ok "config/profile.yml exists"
fi

if [ ! -f modes/_profile.md ] && [ -f modes/_profile.template.md ]; then
  cp modes/_profile.template.md modes/_profile.md
  ok "Created modes/_profile.md"
else
  ok "modes/_profile.md exists"
fi

if [ ! -f portals.yml ] && [ -f templates/portals.example.yml ]; then
  cp templates/portals.example.yml portals.yml
  ok "Created portals.yml"
else
  ok "portals.yml exists"
fi

if [ ! -f web/.env.local ]; then
  echo "CAREER_OPS_ROOT=.." > web/.env.local
  ok "Created web/.env.local"
else
  ok "web/.env.local exists"
fi

# ── Step 7: Verification ──
step 7 "Verifying setup"

MISSING=0
for f in cv.md config/profile.yml modes/_profile.md portals.yml; do
  if [ -f "$f" ]; then
    ok "$f"
  else
    if [ "$f" = "cv.md" ]; then
      warn "$f — not found (add your CV via the web UI or create manually)"
    else
      warn "$f — not found"
    fi
    MISSING=$((MISSING+1))
  fi
done

echo ""
if [ "$MISSING" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}Setup complete!${NC}"
else
  echo -e "${YELLOW}${BOLD}Setup complete with $MISSING optional file(s) to configure.${NC}"
fi

echo ""
echo -e "${BOLD}Next steps:${NC}"
echo -e "  1. ${CYAN}cd web && npm run dev${NC}     → Start the web UI at http://localhost:3000"
echo -e "  2. Open ${CYAN}http://localhost:3000/setup${NC} to finish configuration"
echo -e "  3. Upload your CV and fill in your profile"
echo ""
echo -e "  Or use Claude Code: ${CYAN}claude${NC} → then paste a job URL"
echo ""
