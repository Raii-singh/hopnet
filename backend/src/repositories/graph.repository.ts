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
