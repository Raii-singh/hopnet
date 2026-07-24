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
 * Does NOT enforce (sourceId, targetId, relationshipType) uniqueness —
 *   that is also the service layer's responsibility.
 *
 * @param input  See CreateRelationshipInput in domain/relationship.ts.
 * @returns      The newly persisted Relationship as stored in Neo4j.
 */
export async function createRelationship(
  input: CreateRelationshipInput
): Promise<Relationship> {
  const session = getSession();
  try {
    const now = nowIso();
    const id = uuidv4();

    // ── Build base property map (edgeKind intentionally excluded) ────────
    // edgeKind is computed inside the Cypher CASE expression so that the
    // endpoint nodeType read and relationship write are a single atomic
    // operation.  The returned relationship contains the computed edgeKind.
    const baseProps: Record<string, unknown> = {
      id,
      sourceId:             input.sourceId,
      targetId:             input.targetId,
      relationshipType:     input.relationshipType     ?? 'acquaintance',
      // edgeKind is NOT included here — computed atomically by Cypher below
      trustScore:           input.trustScore           ?? 0.5,
      interactionFrequency: input.interactionFrequency ?? 0.5,
      connectorSource:      input.connectorSource      ?? 'Manual',
      inferred:             input.inferred             ?? false,
      confidenceScore:      input.confidenceScore      ?? 1.0,
      createdBy:            input.createdBy            ?? 'Manual',
      createdAt:            now,
      updatedAt:            now,
    };

    if (input.inferredFrom !== undefined && input.inferredFrom !== null) {
      baseProps['inferredFrom'] = input.inferredFrom;
    }

    // ── Single atomic Cypher: validate endpoints, create relationship, ────
    // ── derive edgeKind — all within one auto-commit transaction.        ──
    //
    // Cypher CASE logic mirrors deriveEdgeKind() in domain/relationship.ts:
    //   REAL + REAL  → REAL_EDGE
    //   Any DEMO     → DEMO_EDGE
    const createResult = await session.run(
      `MATCH (s:Person {id: $sourceId}), (t:Person {id: $targetId})
       WHERE s.deletedAt IS NULL AND t.deletedAt IS NULL
       CREATE (s)-[r:CONNECTED]->(t)
       SET r = $baseProps
       SET r.edgeKind = CASE
         WHEN s.nodeType = 'REAL' AND t.nodeType = 'REAL' THEN 'REAL_EDGE'
         ELSE 'DEMO_EDGE'
       END
       RETURN r`,
      { sourceId: input.sourceId, targetId: input.targetId, baseProps }
    );

    if (createResult.records.length === 0) {
      throw new Error(
        `[RelationshipRepository.createRelationship] One or both Person nodes ` +
        `not found or soft-deleted. sourceId=${input.sourceId}, targetId=${input.targetId}`
      );
    }

    return recordToRelationship(createResult.records[0]);
  } finally {
    await session.close();
  }
}

/**
 * Find an active (non-deleted) Relationship by its backend UUID.
 * Returns null when not found, soft-deleted, or when either endpoint
 * Person node is soft-deleted.
 *
 * Decision 4 (Step 10 review): both endpoints must be active.
 * A relationship whose endpoint has been soft-deleted is invisible to
 * normal reads.  The physical relationship is preserved; restoring the
 * endpoint makes the relationship visible again.
 *
 * Uses directed MATCH to avoid returning each relationship twice.
 */
export async function getRelationshipById(id: string): Promise<Relationship | null> {
  const session = getSession();
  try {
