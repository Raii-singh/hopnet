# HOPNet — Product Requirements Document (PRD)

## Product Name
HOPNet

## Tagline
Graph-Based Human Connection Intelligence System

---

# 1. Vision

HOPNet is a graph intelligence platform designed to visualize and analyze human connection networks using small-world graph theory.

Unlike traditional social platforms, HOPNet focuses on:
- discovering relationship paths,
- identifying optimal introductions,
- measuring connection strength,
- and visualizing network intelligence.

The first version is NOT a multi-user SaaS platform.

This version is a foundational architecture prototype focused on:
- graph visualization,
- graph traversal,
- backend graph architecture,
- pathfinding systems,
- and scalable data modeling.

Authentication, public onboarding, messaging, and distributed user editing will be added later.

---

# 2. Core Philosophy

HOPNet is NOT:
- a social media platform,
- a messaging application,
- or a LinkedIn clone.

HOPNet IS:
- a graph intelligence engine over human relationships.

The platform combines:
- graph theory,
- social network analysis,
- shortest path systems,
- weighted trust systems,
- and interactive graph visualization.

---

# 3. Tech Stack

## Frontend
- Next.js
- React
- TypeScript
- TailwindCSS
- Framer Motion
- React Force Graph OR Cytoscape.js

## Backend
- Node.js
- Express.js
- TypeScript

## Database
- PostgreSQL

## ORM
- Prisma ORM

## Visualization
- D3.js OR React Force Graph

## Dev Tools
- Docker
- Docker Compose
- ESLint
- Prettier

---

# 4. System Scope (Version 1)

## Included
- Interactive graph visualization
- Real + demo nodes
- Edge scoring system
- Graph traversal backend
- BFS pathfinding
- Dijkstra weighted traversal
- Node profile modal
- Universal ranking table
- Toggle demo graph visibility
- Manual backend-controlled data editing
- Single-admin architecture

## Not Included Yet
- Authentication
- Signup/login
- User-generated profile editing
- Messaging
- Referral requests
- Notifications
- Multi-user personalization
- Real-time sync
- AI recommendations

---

# 5. Core Graph Model

## Node Types

### REAL_NODE
Actual people.

### DEMO_NODE
Synthetic graph nodes used for:
- cold-start simulation,
- graph density,
- visualization realism.

---

## Edge Types

### REAL_EDGE
Verified/real relationship.

### DEMO_EDGE
Synthetic relationship.

---

## Critical Graph Rule

The backend MUST NEVER allow:

REAL → DEMO → REAL

This creates fake reachability and destroys trust.

Allowed:
- REAL → REAL → REAL
- DEMO → DEMO → DEMO
- REAL → DEMO

Traversal constraints MUST be enforced at algorithm level.

---

# 6. Primary Application Pages

The website MUST be built as a real multi-page application.

NO single-page-dashboard architecture.

Navigation must use a proper top navbar.

---

# 7. PAGE 1 — HOME / GRAPH EXPLORER

## Route
/

## Purpose
Primary interactive graph visualization system.

This is the core identity of HOPNet.

Users should instantly understand:
- clusters,
- relationships,
- bridges,
- high-value nodes,
- and network density.

---

## UI Requirements

### Graph Rendering Strategy

The home page MUST NOT render the entire graph initially.

Default rendering behavior:
- show selected/root node,
- show first-degree connections only,
- progressively expand graph by hop depth.

The graph explorer should behave like a graph intelligence exploration system rather than a static full-network renderer.

Progressive Expansion Levels:
- Level 0 → current node only
- Level 1 → direct connections
- Level 2 → second-degree network
- Level 3+ → advanced exploration

Global graph rendering should use:
- cluster abstraction,
- compressed community visualization,
- supernodes,
- lazy loading.

Frontend should request subgraphs dynamically:

```txt
GET /api/graph?depth=2&nodeId=xyz
```

This improves:
- scalability,
- rendering performance,
- graph readability,
- and interaction quality.

### Layout

Top Navbar:
- HOPNet logo
- Home
- Personal Database
- Universal Database
- Future Sign-In placeholder button

Main Screen:
- Full-screen graph canvas
- Dark modern technical UI
- Smooth graph animations
- Zoom + drag support
- Cluster spacing
- Edge glow effects

Right Side Floating Controls:
- Toggle Demo Nodes ON/OFF
- Reset Graph Position
- Highlight Real Nodes
- Search Node

Bottom Info Bar:
- Total nodes
- Total edges
- Real/demo ratio
- Average hop count

---

## Graph Interaction Requirements

### Node Hover
On hovering a node:
- enlarge node slightly,
- show tooltip,
- highlight connected edges.

Tooltip includes:
- name,
- node type,
- total connections,
- influence score.

---

### Edge Hover
On hovering an edge:
Display:
- relationship score,
- edge type,
- trust weight,
- interaction strength.

Edge colors:
- Real edge = blue/green
- Demo edge = grey

---

### Node Click
Clicking a node opens profile modal.

---

## Node Profile Modal

The modal MUST feel modern and minimal.

### Profile Information
- Name
- Node type
- Total connections
- Real connections
- Demo connections
- Connection score ratio
- Centrality score
- Cluster/group
- Shortest average path
- Strongest connection

### Mini Visualizations
- connection ratio bar
- score meter
- mini local graph preview

### Actions
- Highlight neighbors
- Show shortest paths
- Focus graph camera
- View in database page

---

## Graph Performance Requirements

Initial scale target:
- 5,000–20,000 nodes
- 50k–500k edges

Must support:
- graph virtualization,
- lazy rendering,
- optimized traversal.

Use:
- adjacency lists,
- memoized graph state,
- batched rendering.

---

# 8. PAGE 2 — PERSONAL DATABASE

## Route
/personal

## Purpose
Shows the current primary user profile.

Version 1 is NOT multi-user.

Only the developer/admin profile exists.

Backend architecture MUST still be designed for future scalability into multi-user support.

---

## UI Requirements

### Layout
Two-column layout.

Left:
- profile card,
- statistics,
- graph metrics.

Right:
- personal connection analytics,
- strongest links,
- network distribution.

---

## Profile Data

### Main Profile Section
- Name
- Bio
- Tags/interests
- Connection count
- Real connection ratio
- Influence score
- Reachability score
- Avg shortest path

---

## Analytics Section

### Metrics
- Total reachable nodes
- Top connected clusters
- Strongest trust paths
- Most influential neighbors
- Graph density around node
- Connector strength
- Strategic reachability score
- Best bridge node
- Influence propagation score

---

## Connector Intelligence Section

This section evolves HOPNet from a graph visualization platform into a relationship intelligence system.

Purpose:
- identify optimal connectors,
- suggest strongest introduction paths,
- analyze relationship leverage.

Features:
- Best connector to target node
- Warm intro probability
- Strongest bridge path
- Most influential reachable node
- Strategic expansion suggestions
- Reachability opportunities

Example:

```txt
Best connector to AWS Recruiter:
Rahul Sharma (82% intro probability)
```

The connector engine should combine:
- shortest path distance,
- trust score,
- edge weights,
- node centrality,
- and relationship strength.

---

## Personal Graph Preview

Smaller localized graph centered around current profile.

Features:
- zoom,
- hover,
- nearest connections,
- cluster highlighting.

---

## Future Scalability Notes

The architecture MUST support:
- future user authentication,
- dynamic profile ownership,
- editable profiles,
- personalized recommendations.

However:
Version 1 will use:
- manually inserted users,
- admin-controlled edits,
- no public signup.

---

# 9. PAGE 3 — UNIVERSAL DATABASE

## Route
/database

## Purpose
Structured universal people database.

Acts like:
- network intelligence table,
- ranking engine,
- searchable graph index.

---

## UI Requirements

### Table Features
- searchable,
- sortable,
- paginated,
- filterable.

---

## Columns

### Required
- Rank
- Name
- Node Type
- Total Connections
- Real Connections
- Demo Connections
- Connection Score Ratio
- Influence Score
- Cluster
- Avg Path Distance

---

## Ranking Logic

Ranking should NOT only depend on raw connections.

Weighted score should include:
- real connections,
- trust score,
- centrality,
- graph reachability,
- path importance.

---

## Filters

### By
- cluster,
- node type,
- connection count,
- influence score,
- shortest path range.

---

## Table Interaction

Clicking a row:
- opens profile modal,
- focuses node in graph,
- displays shortest path insights.

---

# 10. Backend Architecture

---

## Root Structure

```txt
hopnet/
│
├── frontend/
├── backend/
├── database/
├── docker/
├── docs/
├── scripts/
└── README.md
```

---

# 11. Backend Structure

```txt
backend/
│
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── graph/
│   ├── models/
│   ├── middleware/
│   ├── config/
│   ├── utils/
│   └── app.ts
│
├── prisma/
├── tests/
├── package.json
└── tsconfig.json
```

---

# 12. Graph Engine Structure

```txt
graph/
│
├── bfs.ts
├── dijkstra.ts
├── constraints.ts
├── scoring.ts
├── centrality.ts
└── graph-builder.ts
```

---

# 13. Frontend Structure

```txt
frontend/
│
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── styles/
│   └── utils/
│
├── public/
├── package.json
└── next.config.ts
```

---

# 14. Important Frontend Components

## Graph Components

```txt
components/graph/
│
├── GraphCanvas.tsx
├── GraphNode.tsx
├── GraphEdge.tsx
├── GraphControls.tsx
├── GraphLegend.tsx
└── GraphSearch.tsx
```

---

## Modal Components

```txt
components/modals/
│
├── NodeProfileModal.tsx
├── PathDetailsModal.tsx
└── AnalyticsModal.tsx
```

---

## Database Components

```txt
components/database/
│
├── UserTable.tsx
├── RankingCard.tsx
├── FilterBar.tsx
└── SearchInput.tsx
```

---

# 15. PostgreSQL Database Design

## Users Table

```sql
users
(
    id UUID PRIMARY KEY,
    name TEXT,
    type TEXT,
    cluster TEXT,
    influence_score FLOAT,
    created_at TIMESTAMP
)
```

---

## Edges Table

```sql
edges
(
    id UUID PRIMARY KEY,
    source_id UUID,
    target_id UUID,
    edge_type TEXT,
    weight FLOAT,
    created_at TIMESTAMP
)
```

---

## Constraints

Traversal layer MUST enforce:
- no REAL → DEMO → REAL paths.

Do NOT rely only on SQL constraints.

---

# 16. API Endpoints

## Graph APIs

```txt
GET    /api/graph
GET    /api/graph/node/:id
GET    /api/graph/path
POST   /api/graph/toggle-demo
```

---

## Database APIs

```txt
GET    /api/users
GET    /api/users/:id
GET    /api/rankings
```

---

# 17. Algorithms

## BFS

Used for:
- shortest unweighted paths,
- exploration mode.

---

## Dijkstra

Used for:
- weighted trust paths,
- best introduction recommendations.

---

## Future Algorithms

- PageRank
- Betweenness centrality
- Community detection
- Influence propagation
- Connector ranking engine
- Trust propagation scoring
- Warm intro prediction
- Strategic reachability scoring

---

# 18. UI Design Direction

## Visual Identity

Theme:
- futuristic,
- technical,
- graph-native,
- dark glassmorphism.

---

## Inspirations

- GraphXR
- Neo4j Bloom
- Obsidian Graph View
- Cyberpunk dashboards

---

## UI Requirements

Must feel:
- cinematic,
- smooth,
- data-intelligent,
- premium.

Avoid:
- generic admin dashboard look,
- excessive cards,
- clutter.

---

# 19. Future Roadmap

## Phase 2
- user authentication,
- signup/login,
- profile ownership.

## Phase 3
- intro request system,
- messaging,
- trust verification.

## Phase 4
- AI recommendation engine,
- influence scoring AI,
- graph analytics.

## Phase 5
- enterprise network intelligence
- sales targeting systems
- relationship intelligence engine
- warm intro optimization
- founder/investor connection intelligence
- hiring intelligence systems

---

# 20. Deliverables for Initial Build

The first implementation should include:

## Frontend
- working graph explorer,
- navbar navigation,
- node profile modal,
- database table,
- demo toggle.

## Backend
- graph APIs,
- PostgreSQL integration,
- graph traversal logic,
- BFS + Dijkstra implementation.

## Database
- seeded demo dataset,
- real/demo node support,
- weighted edges.

---

# 21. Final Product Statement

HOPNet is a graph intelligence system built to visualize, analyze, and optimize human connection networks using graph algorithms and network science.

The system combines:
- graph traversal,
- trust-aware pathfinding,
- interactive visualization,
- and scalable network analytics

into a modern relationship intelligence platform.

---

# 22. VibeCode Prompt for Antigravity

Build a full-stack application called HOPNet using Next.js, React, TypeScript, TailwindCSS, Node.js, Express, PostgreSQL, and Prisma.

The application is a graph intelligence system visualizing human relationship networks.

The website must be multi-page and use a top navigation bar.

Pages required:
1. Home page with interactive graph visualization.
2. Personal database page.
3. Universal database page.

Use React Force Graph OR Cytoscape.js for graph visualization.

The graph must support:
- zoom,
- drag,
- hover interactions,
- node click modals,
- edge hover scoring,
- demo node toggling.

The graph contains REAL and DEMO nodes.

CRITICAL:
The traversal system must NEVER allow REAL → DEMO → REAL traversal.

Backend must implement:
- BFS,
- Dijkstra,
- graph scoring,
- centrality scoring,
- weighted edges.

Use PostgreSQL with Prisma ORM.

The system is currently single-admin architecture.

No signup/login yet.

All users are manually inserted through backend/database.

Still structure backend cleanly for future authentication support.

The UI must feel cinematic, futuristic, smooth, and graph-native.

Avoid generic dashboard designs.

Focus heavily on:
- graph visualization,
- network intelligence,
- modern interactions,
- and scalable architecture.

Use proper folder structure and modular architecture.

Generate complete project boilerplate with backend/frontend separation, reusable components, API routes, Prisma schema, Docker support, and graph algorithm modules.

