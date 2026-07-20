/**
 * HOPNet Domain — Relationship (Edge)
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines the TypeScript representation of a [:CONNECTED] relationship in Neo4j.
 *
 * Architecture decisions (approved by Sr. Dev):
 *   - Single relationship label: [:CONNECTED]. Semantic type stored as a property.
 *   - Directed storage in Neo4j (required), queried as undirected: (a)-[:CONNECTED]-(b).
 *   - `weight` is NOT stored. Computed on demand: trustScore * 0.6 + interactionFrequency * 0.4.
 *   - `edgeKind` is derived from source/target nodeTypes and stored for API serialization.
 *
 * EdgeKind rules:
 *   REAL + REAL  → REAL_EDGE
 *   REAL + DEMO  → DEMO_EDGE
 *   DEMO + REAL  → DEMO_EDGE
 *   DEMO + DEMO  → DEMO_EDGE
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { NodeType } from './person';

// ── Edge kind discriminator ────────────────────────────────────────────────
export type EdgeKind = 'REAL_EDGE' | 'DEMO_EDGE';

// ── Full Relationship (as stored in Neo4j and served by the API) ──────────
export interface Relationship {
  // ── Mandatory ─────────────────────────────────────────────────────────
  id: string;                    // Backend-generated UUID v4. Unique.
  sourceId: string;              // id of the source Person node.
  targetId: string;              // id of the target Person node.
  relationshipType: string;      // Semantic type: "colleague" | "friend" | "mentor" | "acquaintance" | ...
  edgeKind: EdgeKind;            // Derived from source/target nodeType. Stored for API.
  createdAt: string;             // ISO 8601.
  updatedAt: string;             // ISO 8601.
  createdBy: string;             // "Manual", "LinkedIn Connector", etc.

  // ── Graph intelligence ────────────────────────────────────────────────
  // Stored on the relationship. Form the basis for weight computation.
  trustScore: number;            // 0.0–1.0. Confidence this relationship is meaningful.
  interactionFrequency: number;  // 0.0–1.0. How frequently these parties interact.
  // NOTE: `weight` is NOT stored. Use computeWeight() when needed.

  // ── Provenance ────────────────────────────────────────────────────────
  connectorSource: string;       // Data origin: "Manual", "LinkedIn Connector", etc.
  inferred: boolean;             // True if the relationship was inferred, not explicit.
  inferredFrom?: string;         // Optional: describes the inference basis.
  confidenceScore: number;       // 0.0–1.0. System confidence. 1.0 = manually verified.

  // ── Soft delete ───────────────────────────────────────────────────────
  deletedAt?: string | null;
}

// ── Relationship as returned by the API (includes computed weight) ────────
// `weight` is added by the service layer before serialization.
export interface RelationshipWithWeight extends Relationship {
  weight: number; // Computed: trustScore * 0.6 + interactionFrequency * 0.4
}

// ── Input for creating a new relationship ────────────────────────────────
export interface CreateRelationshipInput {
  sourceId: string;              // Required
  targetId: string;              // Required
  relationshipType?: string;     // Defaults to "acquaintance"
  trustScore?: number;           // Defaults to 0.5
  interactionFrequency?: number; // Defaults to 0.5
  connectorSource?: string;      // Defaults to "Manual"
  inferred?: boolean;            // Defaults to false
  inferredFrom?: string;
  confidenceScore?: number;      // Defaults to 1.0 (manual creation = fully confident)
  createdBy?: string;            // Defaults to "Manual"
}

// ── Input for updating an existing relationship ───────────────────────────
// `id`, `sourceId`, `targetId`, `edgeKind`, `createdAt`, `createdBy` are immutable.
export interface UpdateRelationshipInput {
  relationshipType?: string;
  trustScore?: number;
  interactionFrequency?: number;
  connectorSource?: string;
  inferred?: boolean;
  inferredFrom?: string;
  confidenceScore?: number;
}

// ── Computed functions ────────────────────────────────────────────────────

/**
 * Compute the traversal/pathfinding weight for a relationship.
 * Weight is NOT stored in Neo4j. Compute it when passing edges to the shared
 * graph engine (BFS, Dijkstra).
 *
 * Formula: trustScore * 0.6 + interactionFrequency * 0.4
 * Range: 0.0 (no trust, no interaction) to 1.0 (full trust, high interaction)
 * Higher weight = stronger relationship = shorter effective distance in Dijkstra.
 */
export function computeWeight(
  trustScore: number,
  interactionFrequency: number
): number {
  return trustScore * 0.6 + interactionFrequency * 0.4;
}

/**
 * Derive the EdgeKind from the nodeTypes of the source and target.
 * Called at write time; result is stored on the relationship.
 */
export function deriveEdgeKind(
  sourceNodeType: NodeType,
  targetNodeType: NodeType
): EdgeKind {
  return sourceNodeType === 'REAL' && targetNodeType === 'REAL'
    ? 'REAL_EDGE'
    : 'DEMO_EDGE';
}

/**
 * Apply computed weight to a stored Relationship, producing a RelationshipWithWeight
 * suitable for API serialization or graph engine input.
 */
export function withWeight(rel: Relationship): RelationshipWithWeight {
  return {
    ...rel,
    weight: computeWeight(rel.trustScore, rel.interactionFrequency),
  };
}
