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
    const result = await session.run(
      `MATCH (s:Person)-[r:CONNECTED]->(t:Person)
       WHERE r.id = $id
         AND r.deletedAt IS NULL
         AND s.deletedAt IS NULL
         AND t.deletedAt IS NULL
       RETURN r`,
      { id }
    );
    if (result.records.length === 0) return null;
    return recordToRelationship(result.records[0]);
  } finally {
    await session.close();
  }
}

/**
 * Find all active relationships between two specific Person nodes (either
 * direction).  Multiple relationships between the same pair are supported.
 *
 * Returns an empty array when no active relationship exists between them,
 * or when either node is soft-deleted.
 *
 * Decision 4 (Step 10 review): both endpoints must be active.
 * Undirected match captures both (s→t) and (t→s) stored relationships
 * — direction semantics are preserved in storage; lookup is bidirectional.
 */
export async function getRelationshipsBetween(
  sourceId: string,
  targetId: string
): Promise<Relationship[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (s:Person {id: $sourceId})-[r:CONNECTED]-(t:Person {id: $targetId})
       WHERE r.deletedAt IS NULL
         AND s.deletedAt IS NULL
         AND t.deletedAt IS NULL
       RETURN DISTINCT r`,
      { sourceId, targetId }
    );
    return result.records.map(rec => recordToRelationship(rec));
  } finally {
    await session.close();
  }
}

/**
 * List all active relationships incident to a given Person node (both
 * incoming and outgoing).
 *
 * Returns an empty array for an isolated, non-existent, or soft-deleted node.
 * Relationships whose OTHER endpoint is soft-deleted are also excluded.
 *
 * Decision 4 (Step 10 review): both endpoints must be active.
 *
 * @param personId  Backend UUID of the Person node.
 * @param edgeKind  Optional filter: 'REAL_EDGE' | 'DEMO_EDGE'.
 */
export async function listRelationshipsByPerson(
  personId: string,
  edgeKind?: 'REAL_EDGE' | 'DEMO_EDGE'
): Promise<Relationship[]> {
  const session = getSession();
  try {
    const kindFilter = edgeKind ? 'AND r.edgeKind = $edgeKind' : '';
    const result = await session.run(
      `MATCH (p:Person {id: $personId})-[r:CONNECTED]-(other:Person)
       WHERE p.deletedAt IS NULL
         AND other.deletedAt IS NULL
         AND r.deletedAt IS NULL ${kindFilter}
       RETURN DISTINCT r`,
      { personId, edgeKind: edgeKind ?? null }
    );
    return result.records.map(rec => recordToRelationship(rec));
  } finally {
    await session.close();
  }
}

/**
 * List all active relationships in the graph, optionally filtered by edgeKind.
 * Paginated — returns at most `limit` results starting at `skip`.
 *
 * Relationships whose source or target node is soft-deleted are excluded.
 *
 * Decision 4 (Step 10 review): both endpoints must be active.
 *
 * This is primarily used by the service layer to build the full graph for BFS.
 * For large graphs, prefer getNeighbourhood in graph.repository.ts instead.
 *
 * @param edgeKind  Optional filter: 'REAL_EDGE' | 'DEMO_EDGE'.
 * @param limit     Max results (default 5000).
 * @param skip      Offset (default 0).
 */
export async function listRelationships(
  edgeKind?: 'REAL_EDGE' | 'DEMO_EDGE',
  limit = 5000,
  skip = 0
): Promise<Relationship[]> {
  const session = getSession();
  try {
    // Neo4j 2026.x: LIMIT/SKIP must be integer literals — inlined from
    // validated Math.floor() values, never raw user input.
    const limitInt = Math.floor(limit);
    const skipInt = Math.floor(skip);
    const kindFilter = edgeKind ? 'AND r.edgeKind = $edgeKind' : '';

    const result = await session.run(
      `MATCH (s:Person)-[r:CONNECTED]->(t:Person)
       WHERE r.deletedAt IS NULL
         AND s.deletedAt IS NULL
         AND t.deletedAt IS NULL ${kindFilter}
       RETURN r
       ORDER BY r.createdAt DESC
       SKIP ${skipInt}
       LIMIT ${limitInt}`,
      { edgeKind: edgeKind ?? null }
    );
    return result.records.map(rec => recordToRelationship(rec));
  } finally {
    await session.close();
  }
}

/**
 * Update an existing active Relationship.
 *
 * - Only properties present in `updates` are written (sparse merge via SET +=).
 * - Immutable fields (id, sourceId, targetId, edgeKind, createdAt, createdBy)
 *   are silently stripped even if the caller provides them.
 * - `updatedAt` is always refreshed.
 * - Returns null if the relationship does not exist or is soft-deleted.
 *
 * @param id       Backend UUID of the relationship.
 * @param updates  See UpdateRelationshipInput in domain/relationship.ts.
 */
export async function updateRelationship(
  id: string,
  updates: UpdateRelationshipInput
): Promise<Relationship | null> {
  const session = getSession();
  try {
    // Strip immutable fields — callers must never mutate them
    const immutable = new Set([
      'id', 'sourceId', 'targetId', 'edgeKind', 'createdAt', 'createdBy', 'deletedAt',
    ]);
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(
        ([k, v]) => !immutable.has(k) && v !== undefined && v !== null
      )
    );

    if (Object.keys(safeUpdates).length === 0) {
      return getRelationshipById(id);
    }

    safeUpdates['updatedAt'] = nowIso();

    const result = await session.run(
      `MATCH ()-[r:CONNECTED]->()
       WHERE r.id = $id AND r.deletedAt IS NULL
       SET r += $updates
       RETURN r`,
      { id, updates: safeUpdates }
    );

    if (result.records.length === 0) return null;
    return recordToRelationship(result.records[0]);
  } finally {
