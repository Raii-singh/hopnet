# IMDb Provider — Placeholder

**Type:** Actor Collaboration Network  
**Status:** 🚧 Coming Soon — `available: false` in provider registry  
**Data Format:** TBD (likely large dataset requiring preprocessing pipeline)

## Provider Capabilities (Planned)

| Feature | Status |
|---------|--------|
| CRUD | ❌ (read-only) |
| Connector imports | ❌ |
| Demo nodes | ❌ |
| Pathfinding ("Six Degrees of Kevin Bacon") | ✅ Planned |
| BFS subgraph | ✅ Planned |
| Centrality scoring | ✅ Planned |
| Collaboration analysis | ✅ Planned |
| Read-only mode | ✅ |

## Datasets

This directory is reserved for the IMDb dataset preprocessing pipeline output.

Expected files:
- `datasets/raw/` — Raw IMDb TSV/CSV dumps (from IMDb data exports)
- `datasets/processed/nodes.json` — Actor nodes with computed centrality
- `datasets/processed/edges.json` — Co-starring edges with weights
- `datasets/snapshots/` — Versioned snapshots post-processing

## TODO: Prerequisites

1. Download IMDb dataset from https://datasets.imdbws.com/
   - `name.basics.tsv.gz` — Actors
   - `title.basics.tsv.gz` — Movies/shows
   - `title.principals.tsv.gz` — Actor↔Title relationships
2. Write preprocessing script in `scripts/imdb/`
3. Output `processed/nodes.json` + `processed/edges.json`
4. Create backend loader in `backend/src/graph-providers/imdb/`
5. Add `/api/imdb/graph` route in backend
6. Implement `fetchImdbGraph()` in `frontend/src/services/api.ts`
   - **CRITICAL**: This function is imported but doesn't exist yet — causes runtime error

## Known Issues

- `frontend/src/store/graphStore.ts` imports `fetchImdbGraph` from `@/services/api` but this function **does not exist**.
- The `imdb` provider is marked `available: true` in `graphProvider.ts` — this is premature.
- No backend IMDb route exists.
