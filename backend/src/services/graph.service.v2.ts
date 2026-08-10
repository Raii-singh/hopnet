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
 *   - hopDistance: 0 = center, 1 = direct connection, etc.
 *   - subgraphDegree: connections to other nodes INSIDE this returned subgraph.
 *   - globalConnectionCount: total active connections globally (center only).
 */
export interface GraphNode extends PersonNode {
  /** Hop count from the center node. 0 = center itself. */
  hopDistance: number;
  /** Number of relationships to other nodes inside the returned subgraph. */
  subgraphDegree: number;
  /**
   * Total active global connections (all active rels, not just subgraph ones).
   * Only present on the center node. Absent for all other nodes.
   */
  globalConnectionCount?: number;
}

/**
 * A relationship as returned in a graph subgraph response.
 * Uses `edgeKind` (not `edgeType`) — v2 domain naming.
 * Preserves the stored directed sourceId/targetId from Neo4j.
 */
export interface GraphLink {
  id: string;
  /** UUID of the source node (stored direction from Neo4j). */
  source: string;
  /** UUID of the target node (stored direction from Neo4j). */
  target: string;
  relationshipType: string;
  /** REAL_EDGE when both endpoints are REAL; DEMO_EDGE otherwise. */
  edgeKind: 'REAL_EDGE' | 'DEMO_EDGE';
  trustScore: number;
  interactionFrequency: number;
  /** trustScore * 0.6 + interactionFrequency * 0.4 (computed, not stored). */
  weight: number;
  connectorSource: string;
  inferred: boolean;
  inferredFrom?: string | null;
  confidenceScore?: number;
}

/** Summary metadata about a returned subgraph. */
export interface GraphMeta {
  /** UUID of the node used as the graph center. */
  centerId: string;
  /** Actual depth used (clamped to [1, MAX_DEPTH]). */
  depth: number;
  totalNodes: number;
  totalLinks: number;
  realNodes: number;
  demoNodes: number;
  realEdges: number;
  demoEdges: number;
  /** Average hop distance of all non-center nodes in the result. */
  avgHopCount: number;
  /**
   * Always true for HOPNet CollegeGraph traversal.
   * The REAL→DEMO→REAL constraint is always active.
   */
  constraintActive: true;
  includeDemo: boolean;
}

/** Full graph subgraph response returned to the HTTP layer. */
export interface GraphSubgraphResponse {
  /** Nodes sorted: center (hopDistance 0) first, then ascending hopDistance. */
  nodes: GraphNode[];
  links: GraphLink[];
  meta: GraphMeta;
}

/**
 * Path query response.
 *
 * Weight vs. cost distinction:
 *   Each GraphLink has a `weight` field = connection strength (0–1, higher = stronger).
 *   `totalCost` = sum of per-edge (1 - weight) Dijkstra friction costs along the path.
 *   A lower totalCost means a stronger / more trusted path.
 *   Range: 0.0 (all max-strength edges) to N (N edges each with zero strength).
 */
export interface PathResponse {
  exists: boolean;
  path: {
    /** Ordered node IDs from start (fromId) to end (toId). */
    nodeIds: string[];
    /** Full GraphNode objects (same order as nodeIds, hopDistance = position from start). */
    nodes: GraphNode[];
  } | null;
  /**
   * Minimum accumulated Dijkstra traversal cost along the path.
   * Cost per edge = 1 - weight (1 - connection_strength).
   * Lower totalCost = stronger / more trusted path.
   * null when no path exists.
   */
  totalCost: number | null;
}

/** Single-node profile response (node + its direct connections). */
export interface NodeProfileResponse {
  node: GraphNode;
  links: GraphLink[];
}

// ── Internal helpers ──────────────────────────────────────────────────────

/** Map a PersonNode to an EngineNode for the shared BFS engine. */
function toEngineNode(p: PersonNode): EngineNode {
  return { id: p.id, kind: p.nodeType };
}

/** Map a Relationship (with computed weight) to an EngineEdge. */
function toEngineEdge(r: Relationship): EngineEdge {
  return {
    id: r.id,
    sourceId: r.sourceId,
    targetId: r.targetId,
    kind: r.edgeKind,
    weight: computeWeight(r.trustScore, r.interactionFrequency),
  };
}

/**
 * Convert a PersonNode into a GraphNode, filling in graph-context fields.
 * subgraphDegree and globalConnectionCount must be filled by the caller.
 */
function toGraphNode(
  p: PersonNode,
  hopDistance: number,
  subgraphDegree: number,
  globalConnectionCount?: number
): GraphNode {
  const node: GraphNode = {
    ...p,
    hopDistance,
    subgraphDegree,
  };
  if (globalConnectionCount !== undefined) {
    node.globalConnectionCount = globalConnectionCount;
  }
  return node;
}

/** Convert a Relationship to a GraphLink (v2 response shape). */
function toGraphLink(r: Relationship): GraphLink {
  return {
    id: r.id,
    source: r.sourceId,
    target: r.targetId,
    relationshipType: r.relationshipType,
    edgeKind: r.edgeKind,
    trustScore: r.trustScore,
    interactionFrequency: r.interactionFrequency,
    weight: computeWeight(r.trustScore, r.interactionFrequency),
    connectorSource: r.connectorSource,
    inferred: r.inferred ?? false,
    inferredFrom: r.inferredFrom ?? null,
    confidenceScore: r.confidenceScore,
  };
}

/**
 * Compute per-node subgraphDegree from the final filtered link set.
 * No database call — derived from the links already in memory.
 */
function computeSubgraphDegrees(
  nodeIds: string[],
  links: GraphLink[]
): Map<string, number> {
  const degreeMap = new Map<string, number>(nodeIds.map(id => [id, 0]));
  for (const link of links) {
    degreeMap.set(link.source, (degreeMap.get(link.source) ?? 0) + 1);
    degreeMap.set(link.target, (degreeMap.get(link.target) ?? 0) + 1);
  }
  return degreeMap;
}

// ── Public service API ────────────────────────────────────────────────────

/**
 * Get the N-hop subgraph centered on a Person node.
 *
 * Pipeline:
 *   1. Validate inputs.
 *   2. Fetch raw neighbourhood from Neo4j (3-query pattern).
 *   3. Map to EngineNode/EngineEdge.
 *   4. Run BFS with collegeConstraint.
 *   5. Filter raw result to BFS-approved set.
 *   6. Compute weights, hop distances, subgraphDegree, globalConnectionCount.
 *   7. Return GraphSubgraphResponse.
 *
 * @param centerId   UUID of the Person node to use as graph center.
 * @param depth      Hop depth [1–MAX_DEPTH]. Clamped server-side.
 * @param includeDemo  Whether to include DEMO nodes in traversal.
 *
 * @throws NODE_NOT_FOUND if centerId does not exist or is soft-deleted.
 * @throws VALIDATION_ERROR if centerId is empty.
 */
 

export async function getSubgraph(
  centerId: string,
  depth: number = DEFAULT_DEPTH,
  includeDemo: boolean = true,
  filters?: GraphFilters
): Promise<GraphSubgraphResponse> {
  if (!centerId?.trim()) throw validationError('centerId is required');

  const clampedDepth = Math.min(Math.max(1, Math.floor(depth) || 1), MAX_DEPTH);

  // ── Step 1: Raw neighbourhood from Neo4j ──────────────────────────────
  const raw = await getNeighbourhood(centerId, clampedDepth, { includeDemo, filters });

  if (raw.nodes.length === 0) {
    // Root not found or soft-deleted — verify which to give precise error
    throw nodeNotFound(centerId);
  }

  // ── Step 2: Map to engine types ───────────────────────────────────────
  const rootNode = raw.nodes.find(n => n.id === centerId || n.publicId === centerId);
  const resolvedCenterId = rootNode ? rootNode.id : centerId;

  const engineNodes: EngineNode[] = raw.nodes.map(toEngineNode);
  const engineEdges: EngineEdge[] = raw.relationships.map(toEngineEdge);

  // ── Step 3: BFS with collegeConstraint ───────────────────────────────
  // BFS is undirected. collegeConstraint blocks DEMO → REAL traversal.
  // See module-level REAL/DEMO semantics documentation above.
  const bfsResult = bfsSubgraph(
    resolvedCenterId,
    clampedDepth,
    includeDemo,
    engineNodes,
    engineEdges,
    collegeConstraint
  );

  // ── Step 4: Filter to BFS-approved set ───────────────────────────────
  const approvedNodeIds = bfsResult.visitedNodeIds;
  const approvedEdgeIds = bfsResult.visitedEdgeIds;

  const filteredNodes = raw.nodes.filter(n => approvedNodeIds.has(n.id));
  const filteredRels  = raw.relationships.filter(r => approvedEdgeIds.has(r.id));

  // ── Step 5: Build GraphLinks ─────────────────────────────────────────
  const links: GraphLink[] = filteredRels.map(toGraphLink);

  // ── Step 6: Compute subgraphDegree for all nodes ─────────────────────
  const subgraphDegrees = computeSubgraphDegrees(
    filteredNodes.map(n => n.id),
    links
  );

  // ── Step 7: Fetch globalConnectionCount for center node only ─────────
  // This is a single DB query, not N queries.
  const centerDegrees = await getDegrees(resolvedCenterId);
  const globalConnectionCount = centerDegrees.total;

  // ── Step 8: Build GraphNodes ─────────────────────────────────────────
  const nodes: GraphNode[] = filteredNodes.map(p => {
    const hopDistance    = bfsResult.hopMap.get(p.id) ?? 0;
    const subgraphDeg    = subgraphDegrees.get(p.id) ?? 0;
    const isCenter       = p.id === resolvedCenterId;
    return toGraphNode(p, hopDistance, subgraphDeg, isCenter ? globalConnectionCount : undefined);
  });

  // Sort: center first (hopDistance 0), then ascending hop distance
  nodes.sort((a, b) => a.hopDistance - b.hopDistance);

  // ── Step 9: Compute metadata ──────────────────────────────────────────
  const hopDistances = nodes
    .filter(n => n.hopDistance > 0)
    .map(n => n.hopDistance);
  const avgHopCount = hopDistances.length > 0
    ? hopDistances.reduce((s, h) => s + h, 0) / hopDistances.length
    : 0;

  const meta: GraphMeta = {
    centerId,
    depth: clampedDepth,
    totalNodes:  nodes.length,
    totalLinks:  links.length,
    realNodes:   nodes.filter(n => n.nodeType === 'REAL').length,
    demoNodes:   nodes.filter(n => n.nodeType === 'DEMO').length,
    realEdges:   links.filter(l => l.edgeKind === 'REAL_EDGE').length,
    demoEdges:   links.filter(l => l.edgeKind === 'DEMO_EDGE').length,
    avgHopCount: Math.round(avgHopCount * 100) / 100,
    constraintActive: true,
    includeDemo,
  };

  return { nodes, links, meta };
}

/**
 * Get a single Person node plus all its active 1-hop connections.
 * Used for node profile/detail views.
 *
 * @throws NODE_NOT_FOUND if id does not exist or is soft-deleted.
 * @throws VALIDATION_ERROR if id is empty.
 */
export async function getNodeProfile(id: string): Promise<NodeProfileResponse> {
  if (!id?.trim()) throw validationError('id is required');

  const { node, relationships } = await getPersonWithConnections(id);
  if (!node) throw nodeNotFound(id);

  const links: GraphLink[] = relationships.map(toGraphLink);
  const subgraphDeg = links.length;
  const globalDeg   = await getDegrees(id);

  const graphNode = toGraphNode(node, 0, subgraphDeg, globalDeg.total);

  return { node: graphNode, links };
}

/**
 * Find the minimum-friction path between two Person nodes, respecting the
 * HOPNet traversal constraint (collegeConstraint).
 *
 * Pipeline (Option A — approved architecture):
 *   1. Fetch raw neighbourhood from Neo4j centered on `fromId` up to `maxDepth`.
 *   2. Run BFS with collegeConstraint → constraint-approved node + edge set.
 *   3. If `toId` not reachable under constraint → exists: false.
 *   4. Run shared Dijkstra on approved edges (cost = 1 - weight per edge).
 *   5. Reconstruct ordered path from Dijkstra predecessor map.
 *   6. Return GraphNode[] with hopDistance = position in path + totalCost.
 *
 * This endpoint uses the IDENTICAL connectivity definition as getSubgraph().
 * A path that violates the REAL/DEMO constraint is never returned as valid.
 *
 * includeDemo semantics:
 *   true  (default): DEMO nodes may participate in the path. Existing constraint
 *                    still applies — DEMO → REAL remains blocked.
 *   false:           Only REAL nodes participate. A path through a DEMO node
 *                    is not returned even if physically shorter.
 *
 * totalCost semantics:
 *   Each edge contributes (1 - weight) to the total cost.
 *   weight = connection strength (0–1). 1 - weight = traversal friction.
 *   Lower totalCost = stronger / more trusted path.
 *   This is the Dijkstra-minimized accumulated cost, NOT the sum of weights.
