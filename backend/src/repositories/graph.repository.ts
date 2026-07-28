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
