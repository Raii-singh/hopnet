# HOPNet — Graph Intelligence Platform

A graph-based human connection intelligence system that visualizes relationship networks using small-world graph theory, trust-aware pathfinding, and interactive force-directed visualization.

---

## Overview

HOPNet is not a social network. It is a **graph intelligence engine** over human relationships.

The system is built around a core insight from small-world network research: most people are connected through surprisingly short chains of relationships. HOPNet makes those chains visible, measurable, and navigable — surfacing optimal introduction paths, quantifying connection strength, and identifying the most strategically positioned nodes in any network.

Key capabilities:

- **Multi-provider graph architecture** — switch between distinct network datasets (College Graph, IMDB co-appearance network) at runtime
- **Trust-aware traversal** — Dijkstra pathfinding weighted by trust score, interaction frequency, and relationship type
- **Hop-depth subgraph expansion** — progressive 1–3 hop exploration from any root node
- **Constraint-enforced integrity** — the REAL→DEMO→REAL traversal path is blocked at the algorithm level to prevent synthetic reachability
- **Live API with offline fallback** — auto-detects backend availability and falls back to embedded demo data

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (Turbopack), React 19, TypeScript |
| Styling | TailwindCSS v4, Glassmorphism dark system |
| Visualization | React Force Graph 2D, Three.js, Vanta.js |
| Animation | Framer Motion |
| Backend | Node.js, Express v5, TypeScript |
| Database | PostgreSQL, Prisma ORM v6 |
| Graph Engine | Custom BFS + Dijkstra (shared module) |
| State | Zustand |

---

## Project Structure

```
hopnet/
├── frontend/                   # Next.js application
│   ├── app/                    # Pages (App Router)
│   │   ├── page.tsx            # Graph Explorer (/)
│   │   ├── personal/           # Personal Database (/personal)
│   │   ├── database/           # Universal Database (/database)
│   │   ├── connectors/         # Integrations (/connectors)
│   │   └── profile/[publicId]/ # Node Profile (/profile/:id)
│   └── src/
│       ├── components/
│       │   ├── graph/          # GraphCanvas, Controls, Pathfinder, Workspace
│       │   ├── layout/         # Navbar, AtmosphericBackground
│       │   ├── modals/         # NodeProfile, EdgeEditor, MergeEditor, NodeCreate
│       │   └── ui/             # BottomInfoBar, NodeTooltip, EdgeTooltip
│       ├── providers/          # Graph provider registry and capability definitions
│       ├── services/           # API client
│       ├── store/              # Zustand graph store
│       └── shared-engine/      # Mirrored graph algorithms (synced from shared/)
│
├── backend/                    # Express API
│   └── src/
│       ├── graph/              # BFS, Dijkstra, centrality, constraint enforcement
│       ├── graph-providers/    # Data source adapters (IMDB, etc.)
│       ├── routes/             # API route handlers
│       ├── controllers/        # Request controllers
│       ├── services/           # Business logic
│       └── prisma/             # Schema and migrations
│
├── shared/
│   └── graph-engine/           # Canonical BFS, Dijkstra, centrality, types
│                               # Shared between frontend (via copy-engine) and backend
│
└── database/
    └── graph-providers/
        ├── college/            # College social graph dataset
        └── imdb/               # IMDB co-appearance network (processed)
```

---

## Getting Started

### Prerequisites

- Node.js v18+
