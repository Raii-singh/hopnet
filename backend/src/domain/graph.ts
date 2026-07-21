/**
 * HOPNet Domain — Graph Output Types
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines the shapes returned by graph retrieval operations.
 * These are the API-facing contract types for the graph endpoints.
 *
 * The primary operation is:
 *   "Lock one Person as center → retrieve the graph up to N hops."
 *
 * This works for any node (REAL or DEMO) and any future dataset provider.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PersonNode } from './person';
import type { RelationshipWithWeight } from './relationship';

// ── Primary graph response ────────────────────────────────────────────────

/**
 * The full response from a node-centered N-hop graph query.
 * Nodes include the root node itself.
 * Links include all relationships traversed.
 * All relationships have `weight` pre-computed by the service layer.
 */
export interface GraphData {
  nodes: PersonNode[];
  links: RelationshipWithWeight[];
  meta: SubgraphMeta;
}

// ── Graph metadata ────────────────────────────────────────────────────────

/**
 * Statistics and context for a retrieved subgraph.
 * Sent alongside nodes/links in every graph response.
 * All counts are computed from the retrieved data — not stored in Neo4j.
 */
export interface SubgraphMeta {
  rootNodeId: string;         // The ID of the node used as the graph center
  depth: number;              // The hop depth used for this query
  totalNodes: number;
  totalEdges: number;
  realNodes: number;
  demoNodes: number;
  realEdges: number;
  demoEdges: number;
  avgHopCount: number;        // Average hop distance of all nodes from root
  constraintActive: boolean;  // Whether the REAL→DEMO→REAL constraint was enforced
  includeDemo: boolean;       // Whether DEMO nodes were included in the traversal
}

// ── Graph query options ───────────────────────────────────────────────────

/**
 * Options passed to the graph retrieval service.
 */
export interface GraphQueryOptions {
  rootId: string;
  depth: number;               // 1–3 hops (enforced by the service layer)
  includeDemo?: boolean;       // Default: true
  applyConstraint?: boolean;   // Default: true (enforce REAL→DEMO→REAL rule)
}

// ── Hop map ───────────────────────────────────────────────────────────────

/**
 * Maps node IDs to their hop distance from the root.
 * Root itself is hop 0. Direct connections are hop 1. Etc.
 * Produced by the BFS algorithm and attached to the service response.
 */
export type HopMap = Map<string, number>;
