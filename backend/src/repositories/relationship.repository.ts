/**
 * HOPNet — Relationship Repository
 * ─────────────────────────────────────────────────────────────────────────────
 * Data-access layer for [:CONNECTED] relationships in Neo4j.
 *
 * Responsibilities:
 *   - Persist and retrieve CONNECTED relationships (REAL_EDGE and DEMO_EDGE).
 *   - Derive `edgeKind` from source/target Person nodeTypes at write time.
 *   - Translate Neo4j relationship objects ↔ Relationship domain types.
 *   - Manage sessions safely (open → try → finally close).
 *   - Parameterise every Cypher query (no string interpolation of user input).
 *
 * Explicitly NOT responsible for:
 *   - Person node CRUD                     → person.repository.ts
 *   - N-hop graph traversal                → graph.repository.ts
 *   - REAL→DEMO→REAL constraint            → service layer (shared engine)
 *   - Computing weight (trustScore * 0.6 + interactionFrequency * 0.4)
 *                                           → service layer (computeWeight)
 *   - publicId generation, business rules, UI concerns
 *
 * Directed storage contract:
 *   Relationships are always stored directed: (source)→(target).
 *   Queries use directed MATCH ()-[r:CONNECTED]->() to avoid returning each
 *   relationship twice.  The graph traversal layer queries undirected to find
 *   paths in either direction — that is the responsibility of graph.repository.
 *
 * Sparse-property contract:
 *   Optional fields (inferredFrom) are only written when present and non-null.
 *   Neo4j stores sparse relationship properties natively.
 *
 * edgeKind derivation:
 *   REAL + REAL  → REAL_EDGE
 *   Any DEMO     → DEMO_EDGE
 *   Derived via deriveEdgeKind() from domain/relationship.ts.
 *   Stored on the relationship at write time.  Immutable after creation.
 *
 * Neo4j 2026.x note:
 *   Parameters cannot be used inside variable-length path patterns (*1..$n).
 *   This file does not use variable-length patterns — it only matches by
 *   relationship property (r.id).  No special handling required here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v4 as uuidv4 } from 'uuid';
import type { Record as Neo4jRecord } from 'neo4j-driver';
import { getSession } from '../config/neo4j';
import type {
  Relationship,
  CreateRelationshipInput,
  UpdateRelationshipInput,
} from '../domain/relationship';
// Note: deriveEdgeKind() is no longer called in TypeScript after Decision 2
// (atomic createRelationship). edgeKind is now computed inside the Cypher
// CASE expression atomically with the CREATE.

// ── Internal helpers ──────────────────────────────────────────────────────

/**
 * Map a Neo4j relationship object (from `RETURN r`) to a Relationship domain
 * object.  All HOPNet relationship fields are stored directly as Neo4j
 * properties, so reading `.properties` gives the full domain object.
 */
function recordToRelationship(record: Neo4jRecord, alias = 'r'): Relationship {
  const rel = record.get(alias);
  return rel.properties as Relationship;
}

/** Current UTC timestamp as ISO 8601 string. */
function nowIso(): string {
  return new Date().toISOString();
}

// ── Public repository API ─────────────────────────────────────────────────

/**
 * Create a new [:CONNECTED] relationship between two Person nodes.
 *
 * Decision 2 (Step 10 review — atomic operation):
 *   Both endpoint validation and relationship creation are performed in a
 *   single Cypher statement within one auto-commit Neo4j transaction.
 *   `edgeKind` is derived inline via a Cypher CASE expression, eliminating
 *   the two-query race window of the previous implementation.
 *
 * Throws if either node does not exist or is soft-deleted.
 * Does NOT enforce REAL→DEMO→REAL constraint — that is the service layer.
