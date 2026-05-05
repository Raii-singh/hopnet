# HOPNet — Graph Intelligence Platform

A graph-based human connection intelligence system built with Next.js, Express, PostgreSQL, and Prisma.

## Vision

HOPNet visualizes and analyzes human connection networks using small-world graph theory — discovering relationship paths, identifying optimal introductions, and measuring connection strength.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS v4, React Force Graph
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Visualization**: React Force Graph 2D

## Project Structure

```
hopnet/
├── frontend/       # Next.js app
├── backend/        # Express API + Prisma
├── database/       # Schema and seeds
├── docker/         # Docker config
├── docs/           # Documentation
└── scripts/        # Utility scripts
```

## Getting Started

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

## Core Features

- Interactive force-directed graph visualization
- REAL and DEMO node system
- Hop-depth subgraph expansion (1-3 hops)
- BFS traversal with REAL→DEMO→REAL constraint enforcement
- Node profile modals with network metrics
- Glassmorphism dark UI

## Graph Rules

**Critical constraint**: The system NEVER allows `REAL → DEMO → REAL` traversal. This would create fake reachability and destroy trust in the network.

Allowed paths:
- `REAL → REAL → REAL` ✅
- `REAL → DEMO` ✅
- `DEMO → DEMO → DEMO` ✅
- `DEMO → REAL` ❌ BLOCKED
