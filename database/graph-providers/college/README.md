# CollegeGraph Provider

**Type:** Professional Relationship Network  
**Status:** Active — full CRUD, connectors, demo nodes enabled  
**Data Format:** nodes.json + edges.json (raw) / PostgreSQL (live)

## Provider Capabilities

| Feature | Status |
|---------|--------|
| CRUD (nodes/edges) | ✅ |
| Connector imports (LinkedIn, Google, Outlook, Gmail, Twitter) | ✅ |
| Demo nodes | ✅ |
| Pathfinding (Dijkstra) | ✅ |
| BFS subgraph | ✅ |
| Centrality scoring | ✅ |
| Trust analysis | ✅ |
| Personal profiles | ✅ |
| Read-only mode | ❌ (full edit) |

## Node Schema

Nodes represent **People** in a professional network.

```json
{
  "id": "r-001",
  "publicId": "HNP-000001",
  "fullName": "Aryan Singh",
  "nodeType": "REAL | DEMO",
  "cluster": "Tech | Finance | Design | Marketing | Academia | Business",
  "influenceScore": 94,
  "connectionCount": 12,
  "company": "HOPNet Technologies",
  "tags": ["Engineering", "Startups", "AI"],
  "sourceConnectors": ["LinkedIn", "Manual"]
}
```

## Edge Schema

Edges represent **Relationships** between people.

```json
{
  "id": "e-001",
  "source": "r-001",
  "target": "r-002",
  "edgeType": "REAL_EDGE | DEMO_EDGE",
  "relationshipType": "cofounder | colleague | advisor | friend | partner | investor | acquaintance | synthetic",
  "trustScore": 0.95,
  "interactionFrequency": 0.88,
  "weight": 0.92
}
```

## Traversal Constraint

```
REAL → REAL  ✅
REAL → DEMO  ✅ (one-way entry into demo cluster)
DEMO → DEMO  ✅
DEMO → REAL  ❌ BLOCKED — prevents fake reachability
```

## Datasets

| File | Description |
|------|-------------|
| `datasets/raw/nodes.json` | 12 REAL + 12 DEMO nodes — frontend demo set |
| `datasets/raw/edges.json` | 39 edges — frontend demo set |
| `datasets/snapshots/seed_v1_snapshot.json` | Full 30+15 node DB seed dataset |

## Clusters

- **Tech**: Engineering, AI, ML, DevOps, Security
- **Finance**: VC, Investment, Fintech, Trading
- **Design**: UX, Branding, Creative, Motion
- **Marketing**: Growth, PR, Social, Content
- **Academia**: Research, Graph Theory, Data Science
- **Business**: Strategy, Operations, Partnerships
