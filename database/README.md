# HOPNet — Centralized Dataset Architecture

This directory is the **canonical source of truth** for all graph provider datasets.

## Structure

```
database/
└── graph-providers/
    ├── college/          # CollegeGraph — professional network
    │   └── datasets/
    │       ├── raw/          # Source-of-truth JSON: nodes.json, edges.json
    │       ├── processed/    # Computed versions: scored, enriched, filtered
    │       ├── snapshots/    # Point-in-time captures (seed_v1_snapshot.json)
    │       └── exports/      # Outbound data: CSV, GraphML, etc.
    └── imdb/             # IMDb Actor Graph — coming soon
        └── datasets/
            ├── raw/
            ├── processed/
            ├── snapshots/
            └── exports/
```

## Design Principles

1. **Frontend is NOT the source of truth.** The `frontend/src/utils/dummyData.ts` file loads from here (or mirrors this data). Raw graph data lives here.
2. **Backend seeds from here.** `backend/prisma/seed.ts` reads snapshots to populate PostgreSQL.
3. **Snapshots are immutable.** Never modify a snapshot — create a new version instead.
4. **Exports are generated, not hand-edited.** Run the appropriate export script.

## CollegeGraph Data Versions

| File | Location | Nodes | Edges | Description |
|------|----------|-------|-------|-------------|
| `raw/nodes.json` | `college/datasets/raw/` | 24 | — | 12 REAL + 12 DEMO (frontend demo set) |
| `raw/edges.json` | `college/datasets/raw/` | — | 39 | Edges for 12+12 demo set |
| `snapshots/seed_v1_snapshot.json` | `college/datasets/snapshots/` | 45 | 65 | Full DB seed: 30 REAL + 15 DEMO |

## Migration Note

**Previously:** CollegeGraph data lived in two frontend locations:
- `frontend/src/data/college/nodes.json` (orphaned — not imported)
- `frontend/src/utils/dummyData.ts` (active — imported by store and GraphControls)

**Now:** This directory is the canonical home. The `frontend/src/data/college/` directory 
should be cleaned up per the manual cleanup report.
