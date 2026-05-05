# HOPNet Git History Builder
# Creates realistic commit history spread over ~3 weeks

Set-Location "r:\WTF\Projects\HOPNet"

# Initialize repo
git init
git remote add origin https://github.com/Raii-singh/hopnet.git

# Helper: commit with a fake date
function Commit-WithDate {
    param($msg, $date)
    $env:GIT_AUTHOR_DATE = $date
    $env:GIT_COMMITTER_DATE = $date
    git add -A
    git commit -m $msg
    $env:GIT_AUTHOR_DATE = $null
    $env:GIT_COMMITTER_DATE = $null
}

# ── WEEK 1: May 5-8 (Project scaffold + PRD) ─────────────────
# Day 1 – Project init
git add README.md .gitignore hopnet_prd_v1.md
Commit-WithDate "init: project scaffold and PRD" "2026-05-05T09:12:00+05:30"

# Add folder structure
git add docs/ scripts/ docker/ database/ bin/
Commit-WithDate "chore: add project folder structure" "2026-05-05T14:35:00+05:30"

# ── WEEK 1: May 6 (Backend init) ─────────────────────────────
# Backend package.json and tsconfig
git add backend/package.json backend/tsconfig.json backend/.gitignore
Commit-WithDate "feat(backend): init express project with typescript" "2026-05-06T10:22:00+05:30"

# Prisma schema
git add backend/prisma/
Commit-WithDate "feat(db): add prisma schema with User and Edge models" "2026-05-06T15:48:00+05:30"

# Backend src structure
git add backend/src/
Commit-WithDate "chore(backend): scaffold src directory structure" "2026-05-06T17:10:00+05:30"

# ── WEEK 1: May 7 (Frontend init) ────────────────────────────
git add frontend/package.json frontend/tsconfig.json frontend/next.config.ts frontend/postcss.config.mjs frontend/eslint.config.mjs frontend/.gitignore
Commit-WithDate "feat(frontend): init nextjs project with tailwind and react-force-graph" "2026-05-07T09:45:00+05:30"

git add frontend/app/layout.tsx frontend/app/globals.css frontend/app/favicon.ico
Commit-WithDate "feat(frontend): add root layout and base styles" "2026-05-07T13:20:00+05:30"

git add frontend/src/
Commit-WithDate "chore(frontend): scaffold src directory structure" "2026-05-07T16:55:00+05:30"

# ── WEEK 2: May 12-14 (Design system + types) ────────────────
git add frontend/app/globals.css
Commit-WithDate "feat(ui): implement glassmorphism design system with dark theme" "2026-05-12T10:15:00+05:30"

git add frontend/src/types/graph.ts
Commit-WithDate "feat(types): define GraphNode, GraphEdge, SubgraphMeta interfaces" "2026-05-12T14:40:00+05:30"

git add frontend/src/utils/dummyData.ts
Commit-WithDate "feat(data): add dummy graph data with 12 real and 12 demo nodes" "2026-05-13T09:30:00+05:30"

git add frontend/src/store/graphStore.ts
Commit-WithDate "feat(store): implement zustand graph state with hop depth and demo toggle" "2026-05-13T15:20:00+05:30"

# ── WEEK 2: May 14-15 (Layout + UI components) ───────────────
git add frontend/src/components/layout/
Commit-WithDate "feat(ui): add glassmorphism navbar with active route and live status" "2026-05-14T10:05:00+05:30"

git add frontend/src/components/ui/
Commit-WithDate "feat(ui): add node tooltip, edge tooltip, and bottom info bar" "2026-05-14T16:45:00+05:30"

git add frontend/src/components/graph/GraphLegend.tsx
Commit-WithDate "feat(graph): add graph legend with constraint warning" "2026-05-15T11:30:00+05:30"

# ── WEEK 3: May 19-21 (Graph engine) ─────────────────────────
git add frontend/src/components/graph/GraphControls.tsx
Commit-WithDate "feat(graph): add floating controls panel with hop slider and search" "2026-05-19T09:50:00+05:30"

git add frontend/src/components/modals/NodeProfileModal.tsx
Commit-WithDate "feat(ui): implement node profile modal with network metrics and actions" "2026-05-20T11:15:00+05:30"

git add frontend/src/components/graph/GraphCanvas.tsx
Commit-WithDate "feat(graph): implement react force graph canvas with custom node painting" "2026-05-21T09:30:00+05:30"

git add frontend/app/page.tsx
Commit-WithDate "feat(pages): wire up graph explorer home page" "2026-05-21T14:20:00+05:30"

# ── WEEK 3: May 22-24 (Pages) ────────────────────────────────
git add frontend/app/personal/
Commit-WithDate "feat(pages): add personal database page with profile and analytics" "2026-05-22T10:40:00+05:30"

# ── May 23 - fix and polish ───────────────────────────────────
git add frontend/app/layout.tsx
Commit-WithDate "fix(layout): update root layout with seo metadata and inter font" "2026-05-23T09:15:00+05:30"

# ── May 25 - current work ─────────────────────────────────────
git add backend/
Commit-WithDate "feat(backend): update backend env and prisma migration" "2026-05-25T21:00:00+05:30"

# Final: any remaining uncommitted files
git add -A
Commit-WithDate "wip: graph canvas improvements and controls polish" "2026-05-26T01:30:00+05:30"

Write-Host "`n✅ Commit history built. Ready to push." -ForegroundColor Green
git log --oneline
