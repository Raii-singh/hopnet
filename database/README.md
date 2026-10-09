# HOPNet — Centralized Dataset Architecture

This directory is the **canonical source of truth** for Rai Singh's live graph dataset.

## Structure

```
database/
└── graph-providers/
    └── live/              # Rai Singh Live Network (Authentic dataset)
        ├── README.md
        ├── nodes.json     # Authentic nodes (17 real human nodes)
        ├── edges.json     # Authentic trust relationships (23 edges)
        └── seed_live.json # Seed snapshot for database populator
```

## Design Principles

1. **Pure Single Database Location.** All raw data snapshots live strictly in `database/graph-providers/live/` and in Neo4j.
2. **Backend seeds from here.** `backend/prisma/seed.ts` and Neo4j seed scripts load from `database/graph-providers/live/seed_live.json`.
3. **Frontend does NOT store static database files.**

