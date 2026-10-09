# HOPNet — Complete Project Brief
*Written by: Junior Dev (AI) | Updated: September 2026*
*Audience: CEO, new Senior Devs, future team joiners — technical or not*

---

## What is this document?

This is the single source of truth for understanding HOPNet. It covers:
- What the product is and why it exists
- How the code is physically organized on disk
- What technologies are used and why
- What the database looks like
- What parts are messy or need attention
- Where the product is heading (the roadmap, in plain English)

Read it top to bottom once. You will understand the project.

---

## 1. What Is HOPNet? (Plain English)

HOPNet is a **relationship intelligence tool**. It is NOT a social network like Instagram or LinkedIn. It is a tool that helps you **understand your network** — the web of people you know, and how those people connect to each other.

The core idea comes from a famous concept called **"Six Degrees of Separation"** — the theory that any two people on Earth are connected through a chain of no more than 6 mutual relationships. HOPNet makes that visible and interactive.

**What it actually does:**

- You import your contacts (from LinkedIn, Gmail, Google, Outlook, etc.) or add people manually
- The system draws your network as a beautiful, interactive web/graph on screen — nodes (circles) are people, lines between them are relationships
- You can ask: *"What is the shortest chain of connections between me and Person X?"* — the system finds it and highlights the path
- It scores people by how "important" they are in your network (centrality/influence score)
- It lets you manage, edit, and explore your contact network visually

**Think of it like:** Google Maps, but for your relationships instead of streets. You can find the fastest route between two people, discover hidden connectors, and see who holds your network together.

---

## 2. Technology Stack (What it's built with)

A "stack" is just the list of tools/languages used to build the product. Here's HOPNet's:

| What it does | Tool | Version | Plain English explanation |
|---|---|---|---|
| **Frontend framework** | Next.js (App Router) | 16.2.6 | The engine that serves the website pages |
| **UI library** | React | 19.2.4 | How we build interactive components (buttons, panels, etc.) |
| **Language (frontend)** | TypeScript | ^5 | JavaScript with extra safety checks — catches bugs early |
| **Language (backend)** | TypeScript | ^6 | Same, but bleeding-edge version on the server side |
| **Styling** | TailwindCSS v4 | ^4 | Utility-first CSS — makes things look good quickly |
| **Graph visualization** | react-force-graph-2d | ^1.29.1 | The library that draws the interactive node graph on screen |
| **3D Background** | Three.js + Vanta.js | various | The animated background effect on the landing/graph page |
| **Animation** | Framer Motion | ^12.40.0 | Smooth animations on UI elements |
| **State management** | Zustand | ^5.0.13 | How the frontend "remembers" things: selected node, filters, etc. |
| **Smooth scroll** | @studio-freight/lenis | ^1.0.42 | Makes page scrolling feel buttery |
| **D3 Forces** | d3-force | ^3.0.0 | Physics simulation that makes graph nodes spread out naturally |
| **Backend framework** | Express | ^5.2.1 | The server that handles API requests |
| **Graph database** | Neo4j | local | Stores the actual graph data (nodes and relationships) — the primary data store |
| **Relational database** | PostgreSQL | local, port 5432 | Stores user accounts, import logs, admin credentials |
| **ORM (Postgres)** | Prisma | ^6.19.3 | An abstraction layer that makes talking to PostgreSQL easier |
| **Neo4j driver** | neo4j-driver | ^5.28.3 | The library that lets Node.js talk to Neo4j |
| **Authentication** | JWT + bcrypt | - | Login tokens and password hashing |
| **Dev runner** | ts-node-dev | ^2.0.0 | Lets us run TypeScript backend directly without compiling first |

> [!IMPORTANT]
> **The project has TWO databases running simultaneously:**
> - **Neo4j** — This is the *graph* database. It stores People (nodes) and their Relationships (edges). This is where all the graph intelligence happens: BFS traversal, Dijkstra pathfinding, centrality scoring.
> - **PostgreSQL** — This is the *relational* database. It stores system users (admin accounts), import logs (history of CSV imports), and auth state.
>
> Neo4j is the star of the show. PostgreSQL is the supporting cast.

---

## 3. How the Code is Organized (Annotated Directory Tree)

The project lives at `/home/rai/Projects/HOPNet/`. Here is every important file and folder:

```
HOPNet/                                  ← Project root. No shared package.json — it's a monorepo.
│
├── README.md                            ← Quick setup guide + API reference
├── DECISIONS.md                         ← Dev journal: WHY certain choices were made (good read!)
├── AGENTS.md                            ← AI agent instructions / onboarding doc (what you're reading)
├── CLAUDE.md                            ← Same but for Claude AI assistant (mirror)
├── hopnet_onboarding_report.md          ← Previous onboarding report
├── .gitignore                           ← Tells git what NOT to track (node_modules, .env, etc.)
│
├── live.sh                              ← Convenience script: starts both frontend + backend
├── run-backend.sh                       ← Convenience script: starts backend only
├── run-frontend.sh                      ← Convenience script: starts frontend only
│
├── bin.txt                              ← ⚠️ SCRATCH FILE. Dev notes/prompts. Not code. Ignore.
├── promt.cpp                            ← ⚠️ RANDOM SCRATCH FILE. Not part of the project.
│
├── archive/                             ← Old code that was replaced. Keep for reference, don't edit.
│
├── bin/                                 ← Dev notes, research papers, AI design docs
│   ├── Building HOPNet Graph Intelligence Platform.md ← Long AI design document
│   ├── architecture_audit.md            ← Previous architecture review
│   ├── notes.txt                        ← Dev scratch notes
│   └── Small-Word-Problem/              ← Reference material on six degrees theory
│
├── scripts/                             ← Root-level utility scripts
│   └── imdb/                            ← 5-step pipeline to process IMDB actor data
│       ├── 1_filter_actors.js           ← Step 1: filter top actors from raw IMDB TSV files
│       ├── 2_filter_titles.js           ← Step 2: filter relevant movie titles
│       ├── 3_build_edges.js             ← Step 3: build co-appearance edges between actors
│       ├── 4_filter_top_actors.js       ← Step 4: trim to top N actors by connection count
│       ├── 5_generate_graph.js          ← Step 5: output final imdb_graph.json
│       ├── run_pipeline.ps1             ← ⚠️ Windows PowerShell runner — needs Linux equivalent!
│       └── README.md                    ← How to run the IMDB pipeline
│
├── database/                            ← Static dataset storage (NOT the live database)
│   └── graph-providers/
│       └── live/                        ← The "live" graph seed data
│           ├── nodes.json               ← Raw person nodes (⚠️ contains personal network!)
│           ├── edges.json               ← Raw relationship edges (⚠️ contains personal network!)
│           └── seed_live.json           ← Canonical seed file used to populate Neo4j (⚠️ personal!)
│
├── shared/                              ← Code shared between backend AND frontend
│   └── graph-engine/                    ← 🧠 THE BRAIN — pure algorithm library (zero dependencies)
│       ├── package.json
│       ├── tsconfig.json
│       ├── index.js                     ← Compiled CommonJS output (for backend import)
│       └── src/
│           ├── types.ts                 ← Core types: EngineNode, EngineEdge, NodeKind, EdgeKind
│           ├── bfs.ts                   ← BFS algorithm: N-hop subgraph expansion
│           ├── dijkstra.ts              ← Dijkstra: trust-weighted shortest path
│           ├── centrality.ts            ← Degree centrality + influence scoring
│           ├── constraints.ts           ← Traversal rules (e.g. REAL→DEMO→REAL is blocked)
│           └── index.ts                 ← Exports all algorithms
│
├── backend/                             ← Express API server (runs on port 3001)
│   ├── .env                             ← ⚠️ SECRET FILE. DATABASE_URL, JWT_SECRET, PORT, etc.
│   ├── package.json                     ← Backend dependencies and scripts
│   ├── tsconfig.json                    ← TypeScript config for backend
│   │
│   ├── prisma/                          ← PostgreSQL ORM configuration
│   │   ├── schema.prisma                ← PostgreSQL database schema (see Section 4)
│   │   ├── seed.ts                      ← Seeds PostgreSQL from college snapshot JSON
│   │   └── migrations/                  ← Migration history (2 migrations so far)
│   │
│   ├── scripts/                         ← Backend utility and verification scripts
│   │   ├── setup_neo4j.ts               ← Sets up Neo4j constraints and indexes (run once on fresh install)
│   │   ├── seed_admin.ts                ← Creates the admin/SUDO account in PostgreSQL
│   │   ├── seed_college_graph.ts        ← Seeds Neo4j with college graph dataset
│   │   ├── empty_neo4j.ts               ← ⚠️ Wipes ALL Neo4j data (use carefully!)
│   │   ├── verify_crud.ts               ← Tests basic CRUD operations
│   │   ├── verify_step10_decisions.ts   ← Verification script for step 10 of dev
│   │   ├── verify_step11_services.ts    ← Tests service layer
│   │   ├── verify_step12_api.ts         ← Tests API endpoints
│   │   ├── verify_step13_graph.ts       ← Tests graph queries
│   │   ├── verify_step13_path_amendment.ts ← Tests pathfinding with amended rules
│   │   ├── verify_step14_seed.ts        ← Tests seed data loading
│   │   ├── verify_step15_crud.ts        ← Full CRUD regression
│   │   ├── verify_step16_auth.ts        ← Tests authentication
│   │   ├── verify_step19_ingest.ts      ← Tests connector ingest
│   │   └── verify_step19_merge.ts       ← Tests node merge
│   │
│   └── src/                             ← All backend application code
│       ├── server.ts                    ← Entry point — boots Express on PORT 3001
│       ├── app.ts                       ← Express app: registers all routes, CORS, middleware
│       │
│       ├── config/
│       │   ├── neo4j.ts                 ← Neo4j driver singleton (connection pool to graph DB)
│       │   └── prisma.ts                ← Prisma client singleton (connection to PostgreSQL)
│       │
│       ├── domain/                      ← 📋 TYPE DEFINITIONS — what data looks like
│       │   ├── person.ts                ← PersonNode type: all fields a person can have
│       │   ├── relationship.ts          ← Relationship type + computeWeight() formula
│       │   └── graph.ts                 ← GraphData, SubgraphMeta, GraphQueryOptions types
│       │
│       ├── graph/                       ← Thin adapters: bridges Neo4j ↔ shared graph engine
│       │   ├── bfs.ts                   ← Adapter: maps Neo4j data format → shared engine BFS input
│       │   ├── dijkstra.ts              ← Adapter: maps Neo4j data → shared engine Dijkstra
│       │   ├── centrality.ts            ← Adapter: maps Neo4j data → shared engine centrality
│       │   └── constraints.ts           ← Adapter: calls shared engine constraint functions
│       │
│       ├── repositories/                ← 💾 DATABASE ACCESS LAYER — all Neo4j Cypher queries live here
│       │   ├── person.repository.ts     ← CRUD for Person nodes in Neo4j (18KB)
│       │   ├── relationship.repository.ts ← CRUD for Relationships in Neo4j (16KB)
│       │   └── graph.repository.ts      ← Complex graph queries: BFS subgraph, Dijkstra, path (22KB)
│       │
│       ├── services/                    ← 🧮 BUSINESS LOGIC — what the API actually does
│       │   ├── person.service.ts        ← Create/update/delete/merge person logic (12KB)
│       │   ├── relationship.service.ts  ← Relationship CRUD + validation logic (20KB)
│       │   ├── graph.service.ts         ← ⚠️ v1 graph service (Prisma/PostgreSQL, LEGACY) (21KB)
│       │   ├── graph.service.v2.ts      ← ✅ v2 graph service (Neo4j, CURRENT) (25KB)
│       │   ├── connector.service.ts     ← CSV/JSON parsers for LinkedIn/Google/etc. (21KB)
│       │   ├── auth.service.ts          ← Login, JWT token creation/validation (1.2KB)
│       │   └── errors.ts                ← Custom error classes: NotFoundError, ValidationError, etc. (8KB)
│       │
│       ├── controllers/                 ← 🔌 HTTP HANDLERS — receive request, call service, send response
│       │   ├── person.controller.ts     ← Handles /api/v2/persons/* endpoints
│       │   ├── relationship.controller.ts ← Handles /api/v2/relationships/* endpoints
│       │   ├── graph.controller.ts      ← ⚠️ Handles v1 /api/graph/* (LEGACY — Prisma-backed)
│       │   ├── graph.controller.v2.ts   ← ✅ Handles v2 /api/v2/graph/* (CURRENT — Neo4j-backed)
│       │   ├── connector.controller.ts  ← Handles /api/connectors/*
│       │   └── auth.controller.ts       ← Handles /api/v2/auth/login
│       │
│       ├── routes/                      ← 🗺️ URL ROUTING — maps URLs to controllers
│       │   ├── graph.routes.ts          ← ⚠️ v1 graph routes (LEGACY, Prisma-backed)
│       │   ├── users.routes.ts          ← ⚠️ v1 user routes (LEGACY, Prisma-backed)
│       │   ├── connectors.routes.ts     ← Connector import routes (still active)
│       │   └── v2/                      ← ✅ Current v2 routes (Neo4j-backed)
│       │       ├── auth.routes.ts       ← POST /api/v2/auth/login
│       │       ├── persons.routes.ts    ← GET/POST/PUT/DELETE /api/v2/persons
│       │       ├── relationships.routes.ts ← GET/POST/PUT/DELETE /api/v2/relationships
│       │       └── graph.routes.ts      ← GET /api/v2/graph (subgraph, node, path)
│       │
│       └── middleware/
│           ├── errorHandler.ts          ← Global error handler (catches all thrown errors, formats response)
│           └── requireAdmin.ts          ← Auth middleware: blocks non-admin requests with 401
│
└── frontend/                            ← Next.js 16 web application (runs on port 3000)
    ├── .env.local                       ← NEXT_PUBLIC_API_URL=http://localhost:3001/api
    ├── package.json                     ← Frontend dependencies and scripts
    ├── next.config.ts                   ← Next.js configuration
    ├── copy-engine.js                   ← Pre-build script: copies shared/graph-engine → frontend/src/shared-engine
    ├── postcss.config.mjs               ← TailwindCSS v4 PostCSS plugin config
    │
    ├── app/                             ← Next.js App Router pages (URL = folder structure)
    │   ├── layout.tsx                   ← Root layout (wraps ALL pages: Navbar + global styles)
    │   ├── page.tsx                     ← Home page "/" — Graph Explorer (the main canvas)
    │   ├── globals.css                  ← Global CSS variables and base styles
    │   ├── personal/
    │   │   └── page.tsx                 ← "/personal" — Personal Database page
    │   ├── database/
    │   │   └── page.tsx                 ← "/database" — Universal Database / people list
    │   ├── connectors/
    │   │   └── page.tsx                 ← "/connectors" — CSV/contact import page
    │   └── profile/
    │       └── [publicId]/
    │           └── page.tsx             ← Dynamic profile: "/profile/HNP-000001"
    │
    └── src/                             ← Frontend source code (non-page components)
        ├── types/
        │   ├── graph.ts                 ← Frontend types: GraphNode, GraphEdge, SubgraphMeta
        │   └── vanta.d.ts               ← TypeScript type declaration for Vanta.js background
        │
        ├── providers/
        │   └── graphProvider.ts         ← Provider registry: declares college/imdb/live capabilities
        │
        ├── store/
        │   └── graphStore.ts            ← 🗃️ Zustand store — ALL frontend state + actions (~647 lines)
        │                                   (selected node, filters, graph data, pathfinder state, etc.)
        │
        ├── services/
        │   └── api.ts                   ← 🔌 API client — every fetch() call to the backend (732 lines)
        │
        ├── shared-engine/               ← ⚠️ AUTO-GENERATED. DO NOT EDIT. Edits go in shared/graph-engine/src/
        │   └── [mirror of shared/graph-engine/src/]
        │
        ├── utils/
        │   └── dummyData.ts             ← Offline college dataset + BFS fallback for no-backend mode
        │
        └── components/
            ├── graph/
            │   ├── GraphCanvas.tsx      ← 🖼️ Main graph visualization (react-force-graph-2d, 36KB)
            │   ├── GraphControls.tsx    ← Control panel: root selection, hop depth, search, filters (34KB)
            │   ├── GraphLegend.tsx      ← Legend overlay showing what node colors/shapes mean
            │   ├── PathfinderPanel.tsx  ← Pathfinder UI: select from/to person, show found path (16KB)
            │   └── WorkspacePanel.tsx   ← Workspace edit mode side panel (13KB)
            │
            ├── layout/
            │   ├── Navbar.tsx           ← Top navigation bar with provider switcher (12KB)
            │   ├── AtmosphericBackground.tsx ← Background effect wrapper component
            │   ├── InteractiveGridBackground.tsx ← Grid background animation
            │   └── ThreeDBackground.tsx ← Three.js 3D background wrapper
            │
            ├── modals/
            │   ├── NodeProfileModal.tsx   ← Node detail popup: full info about a person (30KB)
            │   ├── NodeCreateModal.tsx    ← Form to create a new person node (13KB)
            │   ├── EdgeEditorModal.tsx    ← Form to edit a relationship's properties (23KB)
            │   ├── MergeEditorModal.tsx   ← UI for merging two duplicate nodes (12KB)
            │   ├── ImportPreviewModal.tsx ← Preview CSV import before committing (18KB)
            │   └── SudoLoginModal.tsx     ← Admin/SUDO login popup (4KB)
            │
            ├── profile/
            │   └── PersonalProfileView.tsx ← Profile page view component (30KB)
            │
            └── ui/
                ├── BottomInfoBar.tsx     ← Bottom status bar showing graph stats (node/edge counts)
                ├── NodeTooltip.tsx       ← Hover tooltip that appears when you hover over a node
                ├── EdgeTooltip.tsx       ← Hover tooltip for relationships/edges
                └── LandingSplashOverlay.tsx ← Welcome overlay on first load
```

---

## 4. The Database Schema (What data is stored and how)

HOPNet uses **two databases**. Here's what each one stores.

---

### 4a. Neo4j — The Graph Database (PRIMARY)

Neo4j is a native graph database. Instead of tables and rows, it stores **nodes** (things) and **relationships** (connections between things). This is the main database.

**Person Node** — represents one person in the network:

```
Person {
  id                String    ← Internal UUID. Never changes. Used by the code.
  publicId          String    ← Human-readable: "HNP-000001" (REAL) or "DNP-000001" (DEMO)
  nodeType          String    ← "REAL" or "DEMO" (see note below)
  fullName          String?   ← Person's name (optional — may be unknown)
  username          String?   ← Unique handle
  email             String?   ← Email address
  phone             String?   ← Phone number
  company           String?   ← Where they work
  role              String?   ← Their job title
  linkedinUrl       String?   ← LinkedIn profile URL
  instagramHandle   String?   ← Instagram @handle
  twitterHandle     String?   ← Twitter/X @handle
  githubHandle      String?   ← GitHub @handle
  cluster           String?   ← Group label (e.g. "College", "Work", "Family")
  tags              String[]  ← Free-form labels you can add
  sourceConnectors  String[]  ← How they got in: ["LinkedIn", "Manual"]
  influenceScore    Float     ← 0-100 score of how "central" this person is in your network
  degreeCentrality  Float     ← 0-1 normalized degree centrality
  weightedDegree    Float     ← Sum of all their edge weights
  createdAt         DateTime  ← When this node was created
  updatedAt         DateTime  ← When this node was last modified
  createdBy         String    ← "Manual", "LinkedIn Connector", etc.
  deletedAt         DateTime? ← If set, this node is "soft deleted" (hidden but not erased)
}
```

**Relationship** — represents a connection between two people. Stored in Neo4j as `[:CONNECTED]` (every relationship is the same label; the TYPE is stored as a property):

```
[:CONNECTED] {
  id                   String    ← UUID
  sourceId             String    ← ID of person A
  targetId             String    ← ID of person B
  relationshipType     String    ← "colleague" | "friend" | "mentor" | "acquaintance" | etc.
  edgeKind             String    ← "REAL_EDGE" or "DEMO_EDGE" (auto-derived from node types)
  trustScore           Float     ← 0.0 to 1.0. How meaningful/verified is this relationship?
  interactionFrequency Float     ← 0.0 to 1.0. How often do these two people interact?
  connectorSource      String    ← "Manual", "LinkedIn Connector", etc.
  inferred             Boolean   ← Was this auto-detected, or manually entered?
  inferredFrom         String?   ← If inferred: what was the source/basis?
  confidenceScore      Float     ← 0.0-1.0. System confidence. 1.0 = manually confirmed.
  createdAt            DateTime
  updatedAt            DateTime
  createdBy            String
  deletedAt            DateTime? ← Soft delete
}
```

> [!NOTE]
> **The weight formula:** `weight = trustScore × 0.6 + interactionFrequency × 0.4`
>
> Weight is **NOT stored** in the database. It is computed on demand whenever the graph engine needs it. Higher weight = stronger relationship = shorter effective travel distance in pathfinding.
>
> **REAL vs DEMO nodes:**
> - `REAL` = an actual person with real-world verified relationships
> - `DEMO` = a synthetic/placeholder node for visualization padding or cold-start demos
> - **Critical traversal rule:** a DEMO node must NEVER form a path between two REAL people. If Rai (REAL) → placeholder (DEMO) → CEO (REAL), that path is **blocked** by the algorithm. This prevents fake shortcut paths through dummy nodes.
>
> **EdgeKind rules:**
> - REAL + REAL → `REAL_EDGE`
> - REAL + DEMO, DEMO + REAL, DEMO + DEMO → `DEMO_EDGE`

---

### 4b. PostgreSQL — The Relational Database (SUPPORTING)

PostgreSQL stores system-level data that does NOT need graph traversal.

**SystemUser** — admin accounts that can log in:

```
SystemUser {
  id        String    ← UUID
  username  String    ← Login username (must be unique)
  password  String    ← Bcrypt hashed password (NEVER stored as plaintext!)
  createdAt DateTime
  updatedAt DateTime
}
```

**ImportLog** — record of every CSV/contact import that has ever happened:

```
ImportLog {
  id                 String    ← UUID
  connectorSource    String    ← "LinkedIn" | "Google" | "Outlook" | "Gmail" | "Twitter"
  filename           String    ← The name of the file that was imported
  status             String    ← "SUCCESS" | "FAILED"
  nodesCreated       Int       ← How many people were added
  edgesCreated       Int       ← How many relationships were created
  inferredEdgesCount Int       ← How many relationships were auto-inferred by the system
  confidenceScore    Float     ← Overall confidence score of the import
  importLogs         String[]  ← Array of log messages from the import process
  createdAt          DateTime
}
```

**Legacy PostgreSQL tables** (from v1 architecture — being phased out):

- `User` — the old person storage (now superseded by Neo4j Person nodes)
- `Edge` — the old relationship storage (now superseded by Neo4j relationships)

> [!WARNING]
> The v1 routes (`/api/graph`, `/api/users`) still exist and still hit PostgreSQL via Prisma. They are **LEGACY** and should not be called by the current frontend. The current active API is v2 (`/api/v2/*`) which hits Neo4j. Old v1 code needs cleaning before production.

---

## 5. API Endpoints (How the frontend talks to the backend)

**Backend base URL:** `http://localhost:3001/api`

### Current (v2) — Neo4j backed — These are what the UI actually uses:

| Method | URL | What it does |
|---|---|---|
| GET | `/api/health` | Is the server alive? Returns `{status: 'ok'}` |
| GET | `/api/v2/health` | Same for v2 |
| POST | `/api/v2/auth/login` | Admin login — returns JWT cookie |
| GET | `/api/v2/graph` | **Core graph query:** give me N hops around node X. Params: `centerId`, `depth`, `includeDemo` |
| GET | `/api/v2/graph/node/:id` | Get one person + their 1-hop connections |
| GET | `/api/v2/graph/path` | Find shortest path between two people. Params: `from`, `to` |
| GET | `/api/v2/persons` | List all people in the graph |
| GET | `/api/v2/persons/:id` | Get one person by their internal UUID |
| GET | `/api/v2/persons/public/:publicId` | Get one person by human-readable ID (e.g. `HNP-000001`) |
| POST | `/api/v2/persons` | Create a new person node |
| PUT | `/api/v2/persons/:id` | Update a person's properties |
| DELETE | `/api/v2/persons/:id` | Soft-delete a person (hides them, doesn't erase) |
| GET | `/api/v2/relationships` | List relationships |
| POST | `/api/v2/relationships` | Create a relationship between two people |
| PUT | `/api/v2/relationships/:id` | Update a relationship's properties |
| DELETE | `/api/v2/relationships/:id` | Delete a relationship |

### Legacy (v1) — PostgreSQL backed — Being phased out:

| Method | URL | Status |
|---|---|---|
| GET | `/api/graph` | ⚠️ Legacy — hits Prisma/PostgreSQL. Do not use. |
| GET/POST/PUT/DELETE | `/api/users` | ⚠️ Legacy — hits Prisma/PostgreSQL. Do not use. |
| POST | `/api/connectors/preview` | Still active — parse CSV before import |
| POST | `/api/connectors/ingest` | Still active — commit CSV import |
| GET | `/api/connectors/history` | Still active — import log history |

---

## 6. How the Graph Algorithms Work (Plain English)

The `shared/graph-engine/` library contains all the graph math. It has **zero external dependencies** — pure TypeScript logic that runs identically on both the server (backend) and browser (frontend).

**BFS (Breadth-First Search) — used for the N-hop subgraph display**
- Starting from a root node, finds all nodes reachable within N "hops" (connections)
- "1 hop" = all your direct connections. "2 hops" = their connections too. "3 hops" = and their connections.
- The algorithm respects the DEMO constraint (won't bridge two REAL nodes via a DEMO)
- Result: a subgraph (set of nodes + edges) that gets rendered on the canvas

**Dijkstra — used for the Pathfinder feature**
- Finds the "shortest" path between two people
- "Shortest" here doesn't mean fewest hops — it means the path through the STRONGEST relationships
- Weight formula: `trustScore × 0.6 + interactionFrequency × 0.4`
- Higher weight = stronger relationship = closer in pathfinding distance
- So if you're looking for a path to a CEO, it finds the route through people you trust most and talk to often

**Centrality — used to compute Influence Scores**
- Computes a 0-100 score for each person: how "important" are they in the network?
- A person who connects two otherwise separate groups scores very high (they're a "bridge")
- Someone with many strong connections also scores high
- This runs after imports and is stored on each Person node as `influenceScore`

**Constraints — the REAL→DEMO→REAL blocking rule**
- Ensures DEMO placeholder nodes never create fake paths between real people
- Runs inside both BFS and Dijkstra so the algorithm never explores a violating path
- Shared between frontend and backend so the rule is consistent everywhere

---

## 7. The Data Flow (What happens when you do things)

**Opening the app and seeing the graph:**
```
User opens the app in browser
  → Frontend loads, reads Zustand store for last-used center node
  → Frontend calls GET /api/v2/graph?centerId=X&depth=2
  → graph.controller.v2 receives the request
  → graph.service.v2 orchestrates the query
  → graph.repository runs a Cypher query on Neo4j
  → Neo4j returns all nodes + relationships within 2 hops of X
  → service computes edge weights, assembles GraphData response
  → Frontend receives JSON, stores it in Zustand (graphStore)
  → GraphCanvas renders the force-directed visualization
  → Nodes push apart naturally via D3 force simulation
```

**Finding a path (Pathfinder feature):**
```
User opens Pathfinder, picks Person A and Person B, clicks "Find Path"
  → Frontend calls GET /api/v2/graph/path?from=A&to=B
  → graph.service.v2 fetches all nodes + edges from Neo4j
  → shared/graph-engine/dijkstra.ts runs on that data
  → Returns array of node IDs forming the shortest weighted path
  → PathfinderPanel highlights those nodes on the canvas
  → User sees: Rai → Sarah → John → Target
```

**Importing contacts from LinkedIn:**
```
User goes to /connectors, uploads LinkedIn CSV export
  → Frontend sends POST /api/connectors/preview with raw CSV text
  → connector.service parses CSV, infers relationships, detects possible duplicates
  → ImportPreviewModal shows: "1,102 new people, 50 possible duplicates"
  → User reviews + confirms
  → Frontend sends POST /api/connectors/ingest
  → Service writes Person nodes and relationships to Neo4j
  → Centrality recalculates across the entire graph (influence scores update)
  → ImportLog entry saved to PostgreSQL
```

**Creating a person manually:**
```
User clicks "+ Add Person", fills out form
  → NodeCreateModal collects: name, type (REAL/DEMO), company, etc.
  → Frontend calls POST /api/v2/persons
  → person.service validates input, generates UUID + publicId (HNP-XXXXXX)
  → person.repository writes Person node to Neo4j
  → Frontend refreshes graph
```

---

## 8. What's Messy — Known Issues and Technical Debt

> [!WARNING]
> **New devs: read this before touching any code. These are the things that will confuse you.**

### 🔴 Critical — Must fix before production

**1. Two parallel API versions (v1 and v2) coexist in the same server**
- v1 routes (`/api/graph`, `/api/users`) hit **PostgreSQL via Prisma**
- v2 routes (`/api/v2/*`) hit **Neo4j** — this is the correct current architecture
- The frontend *may* still call some v1 endpoints
- v1 code must be audited, migrated, and removed before going live

**2. Personal graph data sitting in the codebase**
- `database/graph-providers/live/seed_live.json` — contains the developer's personal network
- `database/graph-providers/live/nodes.json` + `edges.json` — same data
- These **cannot go to production**. They must be moved behind environment config or removed entirely.

**3. Hardcoded localhost URLs**
- `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:3001/api`
- These work locally but break immediately in production without proper environment management

**4. No formal environment separation**
- No clear LOCAL vs STAGING vs PRODUCTION configuration
- Architecture does not currently prevent accidentally deploying dev data to production

---

### 🟡 Medium — Should fix soon

**5. Windows legacy artifacts**
- `backend/prisma/schema.prisma` has `binaryTargets = ["native", "windows"]`
- Project moved from Windows to Fedora Linux. The `"windows"` target is harmless but incorrect.
- `scripts/imdb/run_pipeline.ps1` is a PowerShell script — can't run on Linux. Needs a bash equivalent.

**6. v1 service/controller files are legacy dead weight**
- `graph.service.ts` (21KB) and `graph.controller.ts` (6.5KB) are the old Prisma-backed implementations
- They still boot with the server but shouldn't be called by anything
- The real v2 equivalents are `graph.service.v2.ts` and `graph.controller.v2.ts`

**7. IMDB provider code is partially dead**
- There used to be IMDB movie actor co-appearance graph support
- That code path has been partially cleaned up but may have dead references
- The `scripts/imdb/` pipeline exists but data files are gitignored and not loaded anywhere

**8. `dummyData.ts` bundled into production build**
- `frontend/src/utils/dummyData.ts` is a full offline college graph dataset
- Useful for dev/demo, but shouldn't ship as the primary fallback in production

**9. `shared-engine/` directory could confuse new devs**
- `frontend/src/shared-engine/` is an **auto-generated copy** of the shared engine
- Created by `copy-engine.js` at build time. It is gitignored.
- **Do NOT edit it directly.** Edit `shared/graph-engine/src/` instead — it gets copied on next build.

---

### 🟢 Low — Minor annoyances

**10. Ghost Windows directory artifact**
- A `"R:\WTF\Projects\..."` path artifact exists in the frontend from the Windows→Linux migration
- Harmless but looks terrible

**11. Scratch files polluting the project root**
- `bin.txt`, `promt.cpp`, `Pasted image.png` — developer scratch notes in the root directory
- Should be moved to `bin/` or deleted

**12. Mobile experience is broken by design**
- The graph canvas is not usable on mobile screens — nodes pile up, touch events conflict
- This is a **known, documented trade-off** (see `DECISIONS.md`)
- Fix: a completely separate mobile view (list-based rather than canvas-based)

---

## 9. Future Roadmap

*The Sr. Dev's recommended phase plan, written in plain English for everyone.*

---

### Phase 1 — Polish Local First

**What:** Make the local version feel great, stable, and complete before touching production.

**Why first:** Don't fix bugs under production pressure. Ship clean.

What to build:
- **Smart graph rendering:** Nodes resize dynamically. Dense graphs stay readable. Labels hide when crowded. Small graphs feel spacious.
- **Pathfinder upgrade:** Currently finds one shortest path. Needs to find multiple alternate paths, allow "load more" to get additional paths one at a time, let users exclude specific people from path traversal, and integrate all existing filters (relationship type, minimum trust, REAL/DEMO rules, depth limits).
- **Pathfinder UX polish:** A clear from/to selector, list of found paths, "load more" button, "excluded" person chip list.
- **General UI polish:** Every feature needs proper loading states, empty states, error states. Remove dead UI. Fix rough edges throughout.

---

### Phase 2 — Code Audit Before Production

**What:** Thorough review of the entire codebase for anything that could cause problems in production.

**Why second:** Once you deploy, bugs are public. Find them now.

Specifically look for:
- Old v1 API calls still being made from the frontend
- Personal network data that shouldn't ship
- Hardcoded development URLs and localhost references
- `console.log` statements in production code
- Admin-only assumptions baked into the UI
- Demo data bundled into the production build

Also: formally separate LOCAL and PRODUCTION configs so it's **architecturally impossible** to accidentally expose personal data in production.

---

### Phase 3 — Clean Production Launch

**What:** Deploy to production — but with zero graph data.

**Why empty:** Your personal network is not the product. A stranger visiting the site should see HOPNet, not your contacts.

Build:
- A welcoming empty state: *"Your network is empty. Start building."*
- Clear calls to action: `[ Build My Network ]` and `[ Explore Demo Graph ]`
- Never show a blank canvas — that's confusing

---

### Phase 4 — Demo Graph

**What:** A safe, shared demo graph any visitor can play with.

**Why:** Without data to explore, new visitors can't understand the product.

Rules:
- The demo is a canonical, pre-designed dataset showing HOPNet's capabilities
- Any visitor can add nodes, delete nodes, create relationships, run Pathfinder
- Their changes **do not persist** — reloading resets to the canonical demo
- No visitor sees another visitor's changes

Implementation: demo data lives in memory per session, not in the database.

---

### Phase 5 — Real User Accounts

**What:** Move from single-admin to multi-user.

**Why fifth:** Get the product working first. Then worry about who uses it.

Each user gets:
- A personal account (username + password)
- Their own private graph workspace
- Zero access to other users' networks

The current SUDO/admin system becomes the foundation for real auth.

---

### Phase 6 — Contact Imports

**What:** A production-quality import pipeline.

Start with one reliable format (LinkedIn CSV export). Do it right:
1. Upload file
2. Preview: *"1,284 rows detected. 1,102 new people, 132 existing matches, 50 possible duplicates."*
3. User resolves duplicates
4. User confirms
5. Import commits

Then add connectors progressively: Google Contacts, Outlook, etc.

---

### Phase 7 — Real Graph Intelligence

**What:** Make HOPNet genuinely useful for understanding your network, once real users have real data.

- **Advanced analytics:** strongest connections, most-connected people, bridges, clusters
- **Advanced Pathfinder:** exclude relationship types, minimum trust threshold, max hop count
- **Explainable paths:** instead of `A → B → C`, show the relationship type on each hop and *why* this path was chosen

---

### Phase 8 — Scale + Security Hardening

**What:** Prepare for serious public use.

- Performance-test with 100, 1,000, 10,000, 100,000+ nodes
- Add rate limiting, proper authorization, audit logs
- Rotate all secrets, set up backup and recovery
- Deploy to real cloud infrastructure (not a laptop)

Production target architecture:
```
     HOPNet Production
           │
     ┌─────┴─────┐
     │           │
  Frontend    Backend (Express)
     │           │
     └─────┬─────┘
           │
      PostgreSQL          ← user accounts, auth, import logs
           +
         Neo4j             ← the graph data (people + relationships)
```

---

### Priority Order — The "Do This Tomorrow" List

1. Polish local graph rendering
2. Upgrade Pathfinder (multiple alternate paths)
3. Add alternate path loading ("load more")
4. Add exclude-person from path traversal
5. Polish Pathfinder UX
6. Polish general local UI (empty/loading/error states)
7. Full local regression test (every feature must still work)
8. Full code/security/environment audit
9. Separate local vs production data/config
10. Deploy clean production with zero graph data
11. Build production empty-state screen
12. Build "Start Building My Network" flow
13. Build isolated Demo Graph
14. Make Demo Graph session-only (resets on reload)
15. Build user accounts
16. Build user-owned graph workspaces
17. Manual connection creation
18. User-controlled network expansion
19. Build full import pipeline
20. Add import connectors progressively
21. Graph analytics features
22. Advanced / explainable Pathfinder
23. Large-graph performance work
24. Security hardening
25. Production scale deployment

---

*End of document. Questions? Talk to the dev team.*
