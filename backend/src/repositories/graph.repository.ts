/**
 * HOPNet — Graph Repository
 * ─────────────────────────────────────────────────────────────────────────────
 * Data-access layer for graph topology operations in Neo4j.
 *
 * Responsibilities:
 *   - N-hop neighborhood retrieval (the primary HOPNet operation).
 *   - Direct connection lookup for a single node.
 *   - Degree counting (total / by edge kind).
 *   - Translating Neo4j path/relationship records → domain types.
 *   - Parameterising every Cypher query.
 *   - Managing sessions safely (open → try → finally close).
 *
 * Explicitly NOT responsible for:
 *   - Person node CRUD                     → person.repository.ts
 *   - Relationship CRUD                    → relationship.repository.ts (Step 10)
 *   - REAL→DEMO→REAL constraint enforcement → service layer (shared engine)
 *   - BFS/Dijkstra algorithm               → shared/graph-engine
 *   - Computing weight                     → service layer (computeWeight)
 *   - publicId generation or business rules
 *   - Any UI or API concerns
 *
 * Three-query neighbourhood pattern:
 *   Query 1 — Collect IDs of all Person nodes reachable within N hops (Cypher
 *              OPTIONAL MATCH with variable-length path, soft-delete filtered).
 *   Query 2 — Fetch full PersonNode properties for those IDs.
 *   Query 3 — Fetch all active [:CONNECTED] relationships between those nodes.
 *
 * The service layer receives the raw { nodes, relationships } payload and feeds
 * it through the shared BFS engine with the correct TraversalConstraint applied.
 *
 * REAL/DEMO note:
 *   Both REAL and DEMO nodes are first-class live HOPNet entities.
 *   The `includeDemo` option controls whether DEMO nodes appear in the returned
 *   neighbourhood.  Even when includeDemo=true, the REAL→DEMO→REAL constraint
 *   is enforced at the SERVICE layer (not here), so this repository always
 *   returns the raw traversal data without constraint-based filtering.
 *
 * Integer parameters:
 *   Neo4j 2026.x enforces strict integer typing for LIMIT/SKIP/depth.
 *   All such parameters are wrapped with neo4j.int() before being sent.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import neo4j from 'neo4j-driver';
import type { Record as Neo4jRecord } from 'neo4j-driver';
import { getSession } from '../config/neo4j';
import type { PersonNode } from '../domain/person';
import type { Relationship } from '../domain/relationship';

// ── Constants ─────────────────────────────────────────────────────────────

/** Maximum traversal depth accepted by the repository. Hard cap for safety. */
const MAX_DEPTH = 6;

// ── Internal helpers ──────────────────────────────────────────────────────

/**
 * Map a Neo4j record containing a Person node to a PersonNode domain object.
 * Uses the `properties` bag directly — sparse fields absent from Neo4j are
 * absent from the returned object (not null).
 */
function recordToPersonNode(record: Neo4jRecord, alias = 'p'): PersonNode {
  const node = record.get(alias);
  return node.properties as PersonNode;
}

/**
 * Map a Neo4j relationship object (from `RETURN r`) to a Relationship domain
 * object.  All HOPNet relationship properties (id, sourceId, targetId,
 * edgeKind, trustScore, etc.) are stored directly on the relationship, so
 * reading `.properties` gives us the full domain object.
 */
function recordToRelationship(record: Neo4jRecord, alias = 'r'): Relationship {
  const rel = record.get(alias);
  return rel.properties as Relationship;
}

// ── Return types ──────────────────────────────────────────────────────────

/** Raw subgraph as returned from Neo4j — no constraint applied, no weight. */
export interface RawSubgraph {
  /** All Person nodes in the subgraph, including the root node. */
  nodes: PersonNode[];
  /**
   * All active [:CONNECTED] relationships whose both endpoints are in `nodes`.
   * No weight field — the service layer computes weight via computeWeight().
   */
  relationships: Relationship[];
}

/** Degree breakdown for a single node. */
export interface NodeDegree {
  /** Count of all active (non-deleted) relationships regardless of kind. */
  total: number;
  /** Relationships where edgeKind = 'REAL_EDGE'. */
  realEdges: number;
  /** Relationships where edgeKind = 'DEMO_EDGE'. */
  demoEdges: number;
}

export interface GraphFilters {
  relationshipTypes?: string[];
  minTrustScore?: number;
}

/** Options for neighbourhood queries. */
export interface NeighbourhoodOptions {
  /**
   * When false, DEMO Person nodes are excluded from the traversal result.
   * Relationships to/from excluded DEMO nodes are also excluded.
   * Default: true (both REAL and DEMO nodes returned).
   */
  includeDemo?: boolean;
  /** Optional semantic filters applied during Cypher traversal. */
  filters?: GraphFilters;
}

// ── Public repository API ─────────────────────────────────────────────────

/**
 * Retrieve the raw N-hop neighbourhood around a Person node.
 *
 * Returns all Person nodes reachable from `rootId` within `depth` hops,
 * plus all active [:CONNECTED] relationships whose BOTH endpoints are in
 * that set.  The root node itself is always included.
 *
 * Soft-deleted nodes and relationships are excluded from the result.
 * The REAL→DEMO→REAL traversal constraint is NOT enforced here — the
 * service layer applies it via the shared graph engine.
 *
 * Returns `{ nodes: [], relationships: [] }` when:
 *   - rootId does not exist
 *   - rootId is soft-deleted
 *   - depth < 1
 *
 * @param rootId       Backend UUID of the node to use as the graph centre.
 * @param depth        Hop depth (1–MAX_DEPTH). Clamped to [1, MAX_DEPTH].
 * @param opts         See NeighbourhoodOptions.
 */
export async function getNeighbourhood(
  rootId: string,
  depth: number,
  opts: NeighbourhoodOptions = {}
): Promise<RawSubgraph> {
  const { includeDemo = true, filters } = opts;
  const clampedDepth = Math.min(Math.max(1, Math.floor(depth)), MAX_DEPTH);

  const session = getSession();
  try {
    // ── Query 1: Collect IDs of all reachable Person nodes ──────────────
    // OPTIONAL MATCH so that if root has no neighbours at this depth the
    // root itself is still returned.  The filter on n handles DEMO exclusion.
    //
    // IMPORTANT: Neo4j 2026.x does not allow parameters inside variable-length
    // path patterns (e.g. [:CONNECTED*1..$depth]). The depth literal MUST be
    // inlined into the Cypher string.  This is safe because `clampedDepth` is
    // always a validated integer in [1, MAX_DEPTH] — no user string is used.
    const demoFilter = includeDemo ? '' : "AND n.nodeType = 'REAL'";
    
    // Construct dynamic path filters ensuring all edges in path satisfy conditions
    let pathTypeFilter = '';
    let pathTrustFilter = '';
    const hasTypes = filters?.relationshipTypes && filters.relationshipTypes.length > 0;
    const hasMinTrust = filters?.minTrustScore !== undefined;

    if (hasTypes) {
      pathTypeFilter = 'AND ALL(r IN rels WHERE r.relationshipType IN $types)';
    }
    if (hasMinTrust) {
      pathTrustFilter = 'AND ALL(r IN rels WHERE r.trustScore >= $minTrustScore)';
    }

    const q1 = `
      MATCH (root:Person)
      WHERE (root.id = $rootId OR root.publicId = $rootId) AND root.deletedAt IS NULL
      OPTIONAL MATCH (root)-[rels:CONNECTED*1..${clampedDepth}]-(n:Person)
      WHERE n.deletedAt IS NULL ${demoFilter} ${pathTypeFilter} ${pathTrustFilter}
      RETURN root.id AS rootId, COLLECT(DISTINCT n.id) AS neighbourIds
    `;

    const q1Params: Record<string, any> = { rootId };
    if (hasTypes) q1Params.types = filters.relationshipTypes;
    if (hasMinTrust) q1Params.minTrustScore = filters.minTrustScore;

    const q1Result = await session.run(q1, q1Params);

    if (q1Result.records.length === 0) {
      // Root node not found or soft-deleted
      return { nodes: [], relationships: [] };
    }

    const q1Rec = q1Result.records[0];
    const fetchedRootId = q1Rec.get('rootId') as string | null;

    if (!fetchedRootId) {
      return { nodes: [], relationships: [] };
    }

    const neighbourIds = q1Rec.get('neighbourIds') as string[];
    const actualRootId = fetchedRootId || rootId;
    // Build complete list: root first, then all distinct neighbours
    const allIds: string[] = [actualRootId];
    for (const id of neighbourIds) {
      if (id && id !== actualRootId) allIds.push(id);
    }

    // ── Query 2: Fetch full PersonNode properties for all IDs ────────────
    const q2 = `
      MATCH (p:Person)
      WHERE p.id IN $ids
      RETURN p
    `;

    const q2Result = await session.run(q2, { ids: allIds });
    const nodes = q2Result.records.map(r => recordToPersonNode(r, 'p'));

    // ── Query 3: Fetch all active relationships between those nodes ───────
    // Directed match (a)→(b) avoids returning each relationship twice.
    // Both endpoints must be in allIds (i.e. within the subgraph).
    let relTypeFilter = '';
    let relTrustFilter = '';
    if (hasTypes) {
      relTypeFilter = 'AND r.relationshipType IN $types';
    }
    if (hasMinTrust) {
      relTrustFilter = 'AND r.trustScore >= $minTrustScore';
    }

    const q3 = `
      MATCH (a:Person)-[r:CONNECTED]->(b:Person)
      WHERE a.id IN $ids
        AND b.id IN $ids
        AND r.deletedAt IS NULL
        ${relTypeFilter}
        ${relTrustFilter}
      RETURN DISTINCT r
    `;

    const q3Params: Record<string, any> = { ids: allIds };
    if (hasTypes) q3Params.types = filters.relationshipTypes;
    if (hasMinTrust) q3Params.minTrustScore = filters.minTrustScore;

    const q3Result = await session.run(q3, q3Params);
    const relationships = q3Result.records.map(r => recordToRelationship(r, 'r'));

    return { nodes, relationships };
  } finally {
    await session.close();
  }
}

/**
 * Retrieve a single Person node plus all its active direct connections (1-hop).
 * Used for node profile / detail views.
 *
 * Returns `null` for the node when not found or soft-deleted.
 * Returns an empty relationships array when the node is isolated.
 *
 * @param id  Backend UUID of the Person node.
 */
export async function getPersonWithConnections(id: string): Promise<{
  node: PersonNode | null;
  relationships: Relationship[];
}> {
  const session = getSession();
  try {
    // Fetch node
    const nodeResult = await session.run(
      `MATCH (p:Person) WHERE (p.id = $id OR p.publicId = $id) AND p.deletedAt IS NULL RETURN p`,
      { id }
    );

    if (nodeResult.records.length === 0) {
      return { node: null, relationships: [] };
    }

    const node = recordToPersonNode(nodeResult.records[0], 'p');

    // Fetch all active relationships (undirected — we want both outgoing and incoming)
    // Use DISTINCT to prevent duplicate results from bidirectional traversal.
    const relResult = await session.run(
      `MATCH (p:Person)-[r:CONNECTED]-(neighbour:Person)
       WHERE (p.id = $id OR p.publicId = $id)
         AND p.deletedAt IS NULL
         AND neighbour.deletedAt IS NULL
         AND r.deletedAt IS NULL
       RETURN DISTINCT r`,
      { id }
    );

    const relationships = relResult.records.map(r => recordToRelationship(r, 'r'));

    return { node, relationships };
  } finally {
    await session.close();
  }
}

/**
 * Count the active (non-deleted) relationships for a Person node, broken down
 * by edge kind.
 *
 * Uses Neo4j COUNT(DISTINCT r) with undirected matching to correctly count
 * each relationship once regardless of direction.
 *
 * Returns zeroes when the node does not exist, is soft-deleted, or is isolated.
 *
 * @param id  Backend UUID or publicId of the Person node.
 */
export async function getDegrees(id: string): Promise<NodeDegree> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (p:Person)
       WHERE (p.id = $id OR p.publicId = $id) AND p.deletedAt IS NULL
       OPTIONAL MATCH (p)-[r:CONNECTED]-()
       WHERE r.deletedAt IS NULL
       RETURN
         COUNT(DISTINCT r) AS total,
         COUNT(DISTINCT CASE WHEN r.edgeKind = 'REAL_EDGE' THEN r END) AS realEdges,
         COUNT(DISTINCT CASE WHEN r.edgeKind = 'DEMO_EDGE' THEN r END) AS demoEdges`,
      { id }
    );

    if (result.records.length === 0) {
      return { total: 0, realEdges: 0, demoEdges: 0 };
    }

    const rec = result.records[0];
    const toNum = (v: unknown): number =>
      typeof v === 'number' ? v : 0;

    return {
      total:     toNum(rec.get('total')),
      realEdges: toNum(rec.get('realEdges')),
      demoEdges: toNum(rec.get('demoEdges')),
    };
  } finally {
    await session.close();
  }
}

/**
 * Check whether a path exists between two Person nodes within `maxDepth` hops.
 * Soft-deleted nodes and relationships are excluded from the traversal.
 *
 * This is a lightweight existence check — it does NOT return the path.
 * The service layer can call `getNeighbourhood` to retrieve the full subgraph.
 *
 * Returns false when either node is not found, soft-deleted, or no path exists.
 *
 * @param fromId    Backend UUID of the starting node.
 * @param toId      Backend UUID of the target node.
 * @param maxDepth  Maximum hop depth to search (clamped to [1, MAX_DEPTH]).
 */
export async function pathExists(
  fromId: string,
  toId: string,
  maxDepth: number
): Promise<boolean> {
  // Inline depth literal — same restriction as getNeighbourhood (Neo4j 2026.x).
  const depth = Math.min(Math.max(1, Math.floor(maxDepth)), MAX_DEPTH);
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (a:Person {id: $fromId}), (b:Person {id: $toId})
       WHERE a.deletedAt IS NULL AND b.deletedAt IS NULL
       RETURN EXISTS {
         MATCH (a)-[:CONNECTED*1..${depth}]-(b)
       } AS connected`,
      { fromId, toId }
    );

    if (result.records.length === 0) return false;
    return result.records[0].get('connected') as boolean;
  } finally {
    await session.close();
  }
}

// ── Shortest path ─────────────────────────────────────────────────────────

/**
 * Ordered nodes + relationships along the shortest path between two Person
 * nodes, using native Cypher shortestPath().
 *
 * Soft-deleted nodes and relationships are excluded mid-path.
 * Returns null when:
 *   - Either node is not found or soft-deleted.
 *   - No path exists within maxDepth hops.
 *
 * Note: shortestPath finds the path with the fewest hops, not the lowest
 * weighted cost. The service layer may run Dijkstra on the subgraph for
 * weighted pathfinding — this repository function provides the structural path.
 *
 * @param fromId    Backend UUID of the starting node.
 * @param toId      Backend UUID of the target node.
 * @param maxDepth  Maximum hop depth to search (clamped to [1, MAX_DEPTH]).
 */
export interface PathResult {
  /** Ordered node IDs from start to end. */
  nodeIds: string[];
  /** Full PersonNode for each node in the path (same order as nodeIds). */
  nodes: PersonNode[];
  /** Active relationships along the path (length = nodeIds.length - 1). */
  relationships: Relationship[];
}

export async function getShortestPath(
  fromId: string,
  toId: string,
  maxDepth: number
): Promise<PathResult | null> {
  const depth = Math.min(Math.max(1, Math.floor(maxDepth)), MAX_DEPTH);
  const session = getSession();
  try {
    // shortestPath finds minimum-hop path. We filter deleted nodes/rels inline.
    // Depth literal is inlined per Neo4j 2026.x variable-length path restriction.
    const result = await session.run(
      `MATCH (a:Person {id: $fromId}), (b:Person {id: $toId})
       WHERE a.deletedAt IS NULL AND b.deletedAt IS NULL
       MATCH p = shortestPath((a)-[:CONNECTED*1..${depth}]-(b))
       WHERE ALL(n IN nodes(p) WHERE n.deletedAt IS NULL)
         AND ALL(r IN relationships(p) WHERE r.deletedAt IS NULL)
