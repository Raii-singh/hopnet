/**
 * HOPNet Shared Graph Engine — Core Types
 * ─────────────────────────────────────────────────────────────────────────────
 * ZERO external dependencies. No Prisma, no Next.js, no Express.
 *
 * These types are the shared contract between:
 *   - shared/graph-engine/  (algorithms)
 *   - backend/src/graph/    (adapter layer: maps Prisma types → EngineNode)
 *   - frontend/src/utils/   (offline BFS: maps GraphNode → EngineNode)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Node classification ──────────────────────────────────────────────────────

/**
 * Provider-agnostic node kind.
 * Replaces `NodeType` from @prisma/client in algorithm contexts.
 *
 * - REAL / DEMO  → College graph (trust-network semantics)
 * - ACTOR        → IMDb actor-collaboration graph
 * - FIGURE       → Pantheon historical influence graph (future)
 */
export type NodeKind = 'REAL' | 'DEMO' | 'ACTOR' | 'FIGURE';

/**
 * Provider-agnostic edge kind.
 * Replaces `EdgeType` from @prisma/client in algorithm contexts.
 *
 * - REAL_EDGE / DEMO_EDGE   → College graph
 * - COLLABORATION            → IMDb actor co-appearance
 * - INFLUENCE                → Pantheon graph (future)
 */
export type EdgeKind = 'REAL_EDGE' | 'DEMO_EDGE' | 'COLLABORATION' | 'INFLUENCE';

// ── Core algorithm node / edge interfaces ────────────────────────────────────

/**
 * Minimal node representation required by the graph engine.
 * Consumers add domain-specific fields on top.
 */
export interface EngineNode {
  id: string;
  kind: NodeKind;
}

/**
 * Minimal edge representation required by the graph engine.
 * Weight: 0.0–1.0, higher = stronger connection.
 */
export interface EngineEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: EdgeKind;
  weight: number;
}

// ── Algorithm result types ───────────────────────────────────────────────────

export interface BFSResult {
  /** All node IDs reachable within maxDepth hops */
  visitedNodeIds: Set<string>;
  /** All edge IDs traversed */
  visitedEdgeIds: Set<string>;
  /** nodeId → hop distance from root (0 = root itself) */
  hopMap: Map<string, number>;
}

export interface DijkstraResult {
  /** nodeId → minimum weighted distance from root (Infinity if unreachable) */
  distance: Map<string, number>;
  /** nodeId → previous node ID in optimal path (null = root or unreachable) */
  previous: Map<string, string | null>;
}

export interface NodeScore {
  id: string;
  /** Normalized degree: connections / (totalNodes - 1) */
  degreeCentrality: number;
  /** Sum of all edge weights incident to this node */
  weightedDegree: number;
  /** Provider-defined "real" edge ratio (0–1). Semantics depend on provider. */
  realConnectionRatio: number;
  /** Composite influence score 0–100 */
  influenceScore: number;
}

// ── Traversal constraint predicate ──────────────────────────────────────────

/**
 * A function that returns `false` if traversal from `from` → `to` should be blocked.
 * Allows each provider to define its own traversal rules without touching the BFS algorithm.
 *
 * Example (CollegeGraph): block DEMO → REAL traversal.
 * Example (IMDb): no constraints (all traversals allowed).
 */
export type TraversalConstraint = (from: EngineNode, to: EngineNode) => boolean;
