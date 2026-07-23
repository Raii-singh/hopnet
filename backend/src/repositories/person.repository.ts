/**
 * HOPNet — Person Repository
 * ─────────────────────────────────────────────────────────────────────────────
 * Data-access layer for Person nodes in Neo4j.
 *
 * Responsibilities:
 *   - Persist and retrieve Person nodes (REAL and DEMO).
 *   - Translate Neo4j record maps ↔ PersonNode domain types.
 *   - Manage sessions safely (open → try → finally close).
 *   - Parameterise every Cypher query (no string interpolation of user input).
 *
 * Explicitly NOT responsible for:
 *   - Graph traversal / N-hop queries     → graph.repository.ts (future)
 *   - Relationship persistence            → relationship.repository.ts (future)
 *   - Business rules (constraint checks)  → service layer (future)
 *   - publicId generation                 → service layer (future)
 *   - Centrality recalculation            → intelligence service (future)
 *   - Any UI or API concerns
 *
 * Sparse-property contract:
 *   Properties are only written to Neo4j when they are present and non-null
 *   in the input. Neo4j stores sparse properties natively — absent properties
 *   are never stored as explicit nulls.
 *
 * Session contract:
 *   Every exported function opens exactly one session, closes it in a
 *   `finally` block, and never leaks a session on error.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v4 as uuidv4 } from 'uuid';
import neo4j from 'neo4j-driver';
import type { Record as Neo4jRecord } from 'neo4j-driver';
import { getSession } from '../config/neo4j';
import type {
  PersonNode,
  CreatePersonInput,
  UpdatePersonInput,
  LightPerson,
  NodeType,
} from '../domain/person';

// ── Internal helpers ──────────────────────────────────────────────────────

/**
 * Convert a Neo4j record's node properties map into a PersonNode.
 *
 * Neo4j returns properties as a plain object. We assert the shape here
 * rather than using the domain interface directly, because Neo4j can return
 * integers as `neo4j-driver` Integer objects for older field types.
 * With `disableLosslessIntegers: true` (set in neo4j.ts), numbers come back
 * as native JS numbers, so this is safe.
 *
 * Any extra properties beyond the known PersonNode fields are passed through
 * transparently — this is the sparse/flexible property behaviour.
 */
function recordToPersonNode(record: Neo4jRecord, alias = 'p'): PersonNode {
  const props = record.get(alias).properties as Record<string, unknown>;
  const totalConn = record.has('totalConn') ? record.get('totalConn') : (props.connectionCount ?? 0);
  const realConn = record.has('realConn') ? record.get('realConn') : (props.realConnections ?? 0);
  const demoConn = record.has('demoConn') ? record.get('demoConn') : (props.demoConnections ?? 0);

  const totalVal = typeof totalConn === 'object' && totalConn !== null && 'toNumber' in totalConn ? (totalConn as any).toNumber() : Number(totalConn || 0);
  const realVal = typeof realConn === 'object' && realConn !== null && 'toNumber' in realConn ? (realConn as any).toNumber() : Number(realConn || 0);
  const demoVal = typeof demoConn === 'object' && demoConn !== null && 'toNumber' in demoConn ? (demoConn as any).toNumber() : Number(demoConn || 0);

  const rawInf = props.influenceScore;
  const infScore = rawInf !== undefined && rawInf !== null && Number(rawInf) > 0 ? Number(rawInf) : Math.min(100, realVal * 15 + totalVal * 5 + 10);

  return {
    ...props,
    connectionCount: totalVal,
    realConnections: realVal,
    demoConnections: demoVal,
    influenceScore: infScore,
  } as unknown as PersonNode;
}

/**
 * Strip undefined and null values from an object, returning only the entries
 * that are explicitly set. Used to build sparse Cypher SET clauses.
 */
function stripNullish(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  );
}

/**
 * Build the current UTC datetime string for createdAt/updatedAt fields.
 */
function nowIso(): string {
  return new Date().toISOString();
}

// ── Public repository API ─────────────────────────────────────────────────

/**
 * Create a new Person node in Neo4j.
 *
 * - Generates a UUID for `id` (caller is responsible for providing `publicId`).
 * - Only writes properties that are present in `input` (sparse).
 * - Does NOT enforce publicId uniqueness at this layer — the Neo4j constraint
 *   `person_public_id_unique` will throw if there is a conflict.
 * - Does NOT generate publicId — that is the service layer's responsibility.
 *
 * @param publicId  Pre-generated publicId (e.g. "HNP-000001" or "DNP-000001").
 * @param input     Node properties from the caller.
 * @returns         The newly created PersonNode as stored in Neo4j.
 */
export async function createPerson(
  publicId: string,
  input: CreatePersonInput
): Promise<PersonNode> {
  const session = getSession();
  try {
    const now = nowIso();
    const id = uuidv4();

    // Build the properties map — only include fields that are present.
    const baseProps: Record<string, unknown> = {
      id,
      publicId,
      nodeType: input.nodeType,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy ?? 'Manual',
    };

    // Gather optional known fields (only if present)
    const knownOptional = [
      'fullName', 'username', 'email', 'phone',
      'company', 'role',
      'linkedinUrl', 'instagramHandle', 'twitterHandle', 'githubHandle',
      'cluster', 'tags', 'sourceConnectors',
    ] as const;
    for (const key of knownOptional) {
      if (input[key] !== undefined && input[key] !== null) {
        baseProps[key as string] = input[key];
      }
    }

    // Collect any additional flexible properties from the input
    // (exclude already-handled keys and internal markers)
    const reservedKeys = new Set<string>([
      'nodeType', 'createdBy',
      ...(knownOptional as readonly string[]),
    ]);
    for (const [k, v] of Object.entries(input)) {
      if (!reservedKeys.has(k) && v !== undefined && v !== null) {
        baseProps[k] = v;
      }
    }

    const result = await session.run(
      `CREATE (p:Person $props)
       RETURN p, 0 AS totalConn, 0 AS realConn, 0 AS demoConn`,
      { props: baseProps }
    );

    if (result.records.length === 0) {
      throw new Error('[PersonRepository.createPerson] CREATE returned no records.');
    }
    return recordToPersonNode(result.records[0]);
  } finally {
    await session.close();
  }
}

/**
 * Find a Person by their backend UUID (`id`).
 * Returns null if no active (non-deleted) node is found.
 */
export async function getPersonById(id: string): Promise<PersonNode | null> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (p:Person {id: $id})
       WHERE p.deletedAt IS NULL
       OPTIONAL MATCH (p)-[r:CONNECTED]-(other:Person)
       WHERE r.deletedAt IS NULL AND other.deletedAt IS NULL
       WITH p,
            count(r) AS totalConn,
            sum(CASE WHEN other.nodeType = 'REAL' THEN 1 ELSE 0 END) AS realConn,
            sum(CASE WHEN other.nodeType = 'DEMO' THEN 1 ELSE 0 END) AS demoConn
       RETURN p, totalConn, realConn, demoConn`,
      { id }
    );
    if (result.records.length === 0) return null;
    return recordToPersonNode(result.records[0]);
  } finally {
    await session.close();
  }
}

/**
 * Find a Person by their human-readable publicId (e.g. "HNP-000001").
 * Returns null if no active node is found.
 */
export async function getPersonByPublicId(publicId: string): Promise<PersonNode | null> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (p:Person {publicId: $publicId})
       WHERE p.deletedAt IS NULL
       OPTIONAL MATCH (p)-[r:CONNECTED]-(other:Person)
       WHERE r.deletedAt IS NULL AND other.deletedAt IS NULL
       WITH p,
            count(r) AS totalConn,
            sum(CASE WHEN other.nodeType = 'REAL' THEN 1 ELSE 0 END) AS realConn,
            sum(CASE WHEN other.nodeType = 'DEMO' THEN 1 ELSE 0 END) AS demoConn
       RETURN p, totalConn, realConn, demoConn`,
      { publicId }
    );
    if (result.records.length === 0) return null;
    return recordToPersonNode(result.records[0]);
  } finally {
    await session.close();
  }
}

/**
 * Find a Person by source provenance identity.
 */
export async function findPersonBySourceRecord(
  sourceDataset: string,
  sourceRecordId: string
): Promise<PersonNode | null> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (p:Person {sourceDataset: $sourceDataset, sourceRecordId: $sourceRecordId})
       OPTIONAL MATCH (p)-[r:CONNECTED]-(other:Person)
       WHERE r.deletedAt IS NULL AND other.deletedAt IS NULL
       WITH p,
            count(r) AS totalConn,
            sum(CASE WHEN other.nodeType = 'REAL' THEN 1 ELSE 0 END) AS realConn,
            sum(CASE WHEN other.nodeType = 'DEMO' THEN 1 ELSE 0 END) AS demoConn
       RETURN p, totalConn, realConn, demoConn
       LIMIT 1`,
      { sourceDataset, sourceRecordId }
    );
    if (result.records.length === 0) return null;
    return recordToPersonNode(result.records[0]);
  } finally {
    await session.close();
  }
}

/**
 * List all active (non-deleted) Person nodes with dynamic connection metrics.
 *
 * @param nodeType  Optional filter: 'REAL' | 'DEMO'. Omit to return all types.
 * @param limit     Max results (default 500 — practical guard for large graphs).
 * @param skip      Offset for pagination (default 0).
 */
export async function listPersons(
  nodeType?: NodeType,
  limit = 500,
  skip = 0
): Promise<PersonNode[]> {
  const session = getSession();
  try {
    const typeFilter = nodeType ? 'AND p.nodeType = $nodeType' : '';
    const result = await session.run(
      `MATCH (p:Person)
       WHERE p.deletedAt IS NULL ${typeFilter}
       OPTIONAL MATCH (p)-[r:CONNECTED]-(other:Person)
       WHERE r.deletedAt IS NULL AND other.deletedAt IS NULL
       WITH p,
            count(r) AS totalConn,
            sum(CASE WHEN other.nodeType = 'REAL' THEN 1 ELSE 0 END) AS realConn,
            sum(CASE WHEN other.nodeType = 'DEMO' THEN 1 ELSE 0 END) AS demoConn
       RETURN p, totalConn, realConn, demoConn
       ORDER BY p.createdAt DESC
       SKIP $skip
       LIMIT $limit`,
      { nodeType: nodeType ?? null, skip: neo4j.int(skip), limit: neo4j.int(limit) }
    );
    return result.records.map(r => recordToPersonNode(r));
  } finally {
    await session.close();
  }
}

/**
 * Full-text search across Person nodes with dynamic connection metrics.
 */
export async function searchPersons(
  query: string,
  nodeType?: NodeType,
  limit = 50
): Promise<PersonNode[]> {
  if (!query || query.trim().length === 0) return [];

  const session = getSession();
  try {
    const q = query.toLowerCase().trim();
    const typeFilter = nodeType ? 'AND p.nodeType = $nodeType' : '';
    const result = await session.run(
      `MATCH (p:Person)
       WHERE p.deletedAt IS NULL ${typeFilter}
         AND (
           toLower(p.fullName)   CONTAINS $q
           OR toLower(p.email)   CONTAINS $q
           OR toLower(p.username) CONTAINS $q
           OR toLower(p.company)  CONTAINS $q
         )
       OPTIONAL MATCH (p)-[r:CONNECTED]-(other:Person)
       WHERE r.deletedAt IS NULL AND other.deletedAt IS NULL
       WITH p,
            count(r) AS totalConn,
            sum(CASE WHEN other.nodeType = 'REAL' THEN 1 ELSE 0 END) AS realConn,
            sum(CASE WHEN other.nodeType = 'DEMO' THEN 1 ELSE 0 END) AS demoConn
       RETURN p, totalConn, realConn, demoConn
       ORDER BY p.fullName ASC
       LIMIT $limit`,
      { q, nodeType: nodeType ?? null, limit: neo4j.int(limit) }
    );
    return result.records.map(r => recordToPersonNode(r));
  } finally {
    await session.close();
  }
}

/**
 * Update an existing active Person node.
 *
 * - Only the properties present in `updates` are written (sparse merge).
 * - `id`, `publicId`, `createdAt`, `createdBy` are immutable and silently
 *   stripped from `updates` even if provided by the caller.
 * - `nodeType` is PERMANENTLY IMMUTABLE and throws an explicit error if
 *   included in `updates`. REAL↔DEMO conversion is not an in-place mutation.
 *   To change a node's type: soft-delete the existing node and create a new one.
 * - `updatedAt` is always refreshed.
 * - Returns null if the node does not exist or is soft-deleted.
 */
export async function updatePerson(
  id: string,
  updates: UpdatePersonInput
): Promise<PersonNode | null> {
  const session = getSession();
  try {
    // Decision 1 (Step 10 review): nodeType is permanently immutable.
    // Throw explicitly — do NOT silently strip. The caller must know they
    // attempted an illegal operation so they can correct the product flow.
    if ('nodeType' in updates && updates['nodeType'] !== undefined) {
      throw new Error(
        '[PersonRepository.updatePerson] nodeType is permanently immutable. ' +
        'REAL↔DEMO conversion is not an in-place mutation. ' +
        "To change a node's type, soft-delete the existing node and create a new one."
      );
    }

    // Strip remaining immutable fields (nodeType already guarded above)
    const immutable = new Set(['id', 'publicId', 'nodeType', 'createdAt', 'createdBy', 'deletedAt']);
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k, v]) => !immutable.has(k) && v !== undefined && v !== null)
    );

    if (Object.keys(safeUpdates).length === 0) {
      // Nothing to update — just return the current node
      return getPersonById(id);
    }

    safeUpdates['updatedAt'] = nowIso();

    const result = await session.run(
      `MATCH (p:Person {id: $id})
       WHERE p.deletedAt IS NULL
       SET p += $updates
       RETURN p`,
      { id, updates: safeUpdates }
    );

    if (result.records.length === 0) return null;
    return recordToPersonNode(result.records[0]);
  } finally {
    await session.close();
  }
}

/**
 * Soft-delete a Person node by setting `deletedAt` to the current timestamp.
 *
 * The node and all its relationships remain physically in Neo4j.
 * The soft-delete causes:
 *   - The node to be excluded from all `getPersonBy*` / `listPersons` / `searchPersons` calls.
 *   - The node's relationships to become naturally invisible in N-hop traversal
 *     queries (because they reference a node filtered by deletedAt IS NULL).
 *
 * Relationships are NOT cascade-deleted, allowing future restoration.
 *
 * @returns true if the node was found and soft-deleted, false if not found or already deleted.
 */
export async function softDeletePerson(id: string): Promise<boolean> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (p:Person {id: $id})
       WHERE p.deletedAt IS NULL
       SET p.deletedAt = $deletedAt, p.updatedAt = $updatedAt
       RETURN p.id AS id`,
      { id, deletedAt: nowIso(), updatedAt: nowIso() }
    );
    return result.records.length > 0;
  } finally {
    await session.close();
  }
}

/**
 * Restore a soft-deleted Person node by clearing its `deletedAt` property.
 *
 * @returns true if the node was found and restored, false if not found.
 */
export async function restorePerson(id: string): Promise<boolean> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (p:Person {id: $id})
       WHERE p.deletedAt IS NOT NULL
       REMOVE p.deletedAt
       SET p.updatedAt = $updatedAt
       RETURN p.id AS id`,
