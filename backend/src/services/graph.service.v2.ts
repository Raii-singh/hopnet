/**
 * HOPNet — Graph Traversal Service (v2 / Neo4j)
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements the primary HOPNet product operation:
 *   Search Person → Lock as Center → Select N Hops → Return Subgraph
 *
 * Architecture:
 *   1. Repository layer fetches the raw neighbourhood from Neo4j (3-query
 *      bounded pattern — Q1: IDs, Q2: nodes, Q3: relationships).
 *   2. Service maps domain types → EngineNode/EngineEdge.
 *   3. Shared graph engine BFS runs with `collegeConstraint` applied.
 *   4. Service filters the raw result to the BFS-approved set.
 *   5. Service computes weights, hop distances, subgraphDegree, and
 *      globalConnectionCount (center only).
 *   6. Response is serialized into GraphSubgraphResponse.
 *
 * REAL/DEMO traversal constraint (LOCKED — do not change without senior approval):
 *   `collegeConstraint` blocks DEMO → REAL traversal.
 *   Because BFS is undirected, the following behaviors are permanent:
 *     - REAL center  → DEMO: ✅ allowed (REAL → DEMO direction passes)
 *     - REAL center  → DEMO → REAL: ❌ blocked (DEMO → REAL blocked at hop 2)
 *     - DEMO center  → REAL: ❌ blocked (DEMO → REAL at hop 1)
 *     - DEMO center  → DEMO: ✅ allowed
 *     - DEMO center  → DEMO → REAL: ❌ blocked (DEMO → REAL still blocked)
 *   A DEMO center node is always included in the response (hopDistance 0).
 *   Its REAL neighbors are unreachable due to the constraint.
 *   This behavior is INTENTIONAL: DEMO nodes must never bridge REAL connectivity.
 *   The path endpoint and subgraph endpoint enforce the SAME constraint.
 *
 * Weight vs. traversal cost (IMPORTANT):
 *   relationship.weight = trustScore * 0.6 + interactionFrequency * 0.4
 *   This is a CONNECTION STRENGTH score (0 = weakest, 1 = strongest).
 *
 *   The shared Dijkstra engine uses: traversalCost = 1 - weight
 *   (higher strength = lower traversal friction = preferred path)
 *   `PathResponse.totalCost` is the sum of per-edge (1 - weight) costs along
 *   the optimal path — NOT the sum of weight scores.
 *   The displayed `weight` field on each GraphLink is unchanged (strength score).
 *
 * Depth semantics:
 *   depth = 1: center + direct connections only
 *   depth = 2: center + direct + their connections
 *   …up to MAX_DEPTH = 6 (hard cap)
 *
 * Performance characteristics:
 *   - No N+1 queries. 3 repository queries + 1 center degree query = 4 total.
 *   - In-process BFS is O(N+E) for N nodes and E edges in the raw subgraph.
 *   - subgraphDegree is computed from the final filtered link set — no DB call.
 *   - globalConnectionCount is fetched once for the center node only.
 *   - APOC is not used.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  getNeighbourhood,
  getDegrees,
  getPersonWithConnections,
  // NOTE: getShortestPath() from graph.repository is STRUCTURAL / UNCONSTRAINED.
  // It uses Cypher shortestPath() without applying collegeConstraint.
  // It MUST NOT be used by the HOPNet semantic /api/v2/graph/path endpoint.
  // It may be used for internal diagnostics or tooling ONLY.
} from '../repositories/graph.repository';
import type { GraphFilters } from '../repositories/graph.repository';
import type { PersonNode } from '../domain/person';
import type { Relationship } from '../domain/relationship';
import { computeWeight } from '../domain/relationship';
import {
  bfsSubgraph,
  collegeConstraint,
  dijkstra,
  reconstructPath,
} from '@hopnet/shared/graph-engine';
import type { EngineNode, EngineEdge } from '@hopnet/shared/graph-engine';
import { validationError, nodeNotFound } from './errors';

// ── Constants ─────────────────────────────────────────────────────────────

const MAX_DEPTH = 6;
const DEFAULT_DEPTH = 2;

// ── Response types ────────────────────────────────────────────────────────

/**
 * A Person node as returned in a graph subgraph response.
 * Extends PersonNode with graph-context fields:
