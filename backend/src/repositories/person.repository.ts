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
