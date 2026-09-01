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
- PostgreSQL (running on port 5432)

### 1. Clone and install

```bash
git clone https://github.com/Raii-singh/hopnet.git
cd hopnet
```

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure the backend environment

Create `backend/.env`:

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/hopnet"
PORT=3001
NODE_ENV=development
```

### 3. Set up the database

```bash
cd backend
npx prisma migrate deploy   # apply migrations
npx prisma db seed          # seed demo data
```

### 4. Start the servers

```bash
# Terminal 1 — Backend  (http://localhost:3001)
cd backend && npm run dev

# Terminal 2 — Frontend  (http://localhost:3000)
cd frontend && npm run dev
```

The frontend auto-detects whether the backend is reachable. If not, it falls back to the embedded college graph demo dataset.

---

## Graph Data Model

### Node Types

| Type | Description |
|---|---|
| `REAL` | Actual people with verified relationships |
| `DEMO` | Synthetic nodes used for cold-start, graph density, and visualization |

### Edge Types

| Type | Description |
|---|---|
| `REAL_EDGE` | Verified relationship between real people |
| `DEMO_EDGE` | Synthetic connection |

### Traversal Constraint

The system enforces a hard constraint at the algorithm level:

```
REAL → DEMO → REAL    ✗  BLOCKED
```

This path would create synthetic reachability — making two real people appear connected through a fake intermediary. It is blocked in both the BFS and Dijkstra implementations, not just at the database layer.

Permitted paths:

```
REAL → REAL → REAL    ✓
REAL → DEMO           ✓
DEMO → DEMO → DEMO    ✓
```

---

## Graph Providers

HOPNet uses a provider registry pattern that lets the graph explorer switch data sources at runtime. Each provider declares:

- Display name, icon, accent color
- Which nav sections are available
- Whether workspace (CRUD) mode is enabled
- API endpoint prefix or static dataset path

Current providers:

| Provider | Source | Nodes | Description |
|---|---|---|---|
| College Graph | PostgreSQL / static JSON | ~20 | Small-world college social network — the primary demo |
| IMDB | Processed co-appearance data | ~500+ | Actor co-appearance network derived from IMDB datasets |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/graph` | Full graph (nodes + edges) |
| `GET` | `/api/graph/subgraph` | Subgraph by root node and hop depth |
| `GET` | `/api/graph/path` | Shortest path between two nodes |
| `GET` | `/api/users` | All users |
| `GET` | `/api/users/:id` | User by ID |
| `POST` | `/api/users` | Create node |
| `PUT` | `/api/users/:id` | Update node |
| `DELETE` | `/api/users/:id` | Delete node |
| `POST` | `/api/relationships` | Create edge |
| `PUT` | `/api/relationships/:id` | Update edge |
| `DELETE` | `/api/relationships/:id` | Delete edge |
| `GET` | `/api/imdb/graph` | IMDB co-appearance subgraph |

---

## Algorithms

### BFS — Breadth-First Search
Used for unweighted shortest path and hop-depth subgraph expansion. Respects the REAL→DEMO→REAL constraint at traversal time.

### Dijkstra — Trust-Weighted Pathfinding
Used for finding the strongest introduction path between two nodes. Edge weight is derived from trust score, interaction frequency, and relationship type. Lower weight = stronger/closer relationship.

### Centrality
Approximated betweenness centrality used to rank nodes by their strategic importance as bridge connectors in the network.

---

## License

MIT
