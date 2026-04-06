/**
 * HOPNet Shared Graph Engine — Traversal Constraint System
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines the canonical constraint rules for HOPNet graph traversal.
 *
 * Core invariant:
 *   REAL → DEMO → REAL traversal MUST NEVER be allowed.
 *   This would create fake reachability and destroy trust in the network.
 *
 * Each provider configures its own constraint via `TraversalConstraint`.
 * The BFS and Dijkstra engines accept this as a parameter — they do NOT
 * hardcode any provider-specific logic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EngineNode, TraversalConstraint } from './types';

// ── Built-in constraints ─────────────────────────────────────────────────────

/**
 * CollegeGraph constraint:
 *   DEMO → REAL traversal is ALWAYS blocked.
 *
 * Allowed paths:
 *   REAL → REAL  ✅
 *   REAL → DEMO  ✅  (one-way entry into demo cluster)
 *   DEMO → DEMO  ✅
 *   DEMO → REAL  ❌  BLOCKED
 */
export const collegeConstraint: TraversalConstraint = (from: EngineNode, to: EngineNode): boolean => {
  return !(from.kind === 'DEMO' && to.kind === 'REAL');
};

/**
 * IMDb constraint:
 *   All actor-to-actor traversals are allowed.
 *   No trust boundaries exist in a read-only collaboration graph.
 */
export const imdbConstraint: TraversalConstraint = (_from: EngineNode, _to: EngineNode): boolean => {
  return true;
};

/**
 * Pantheon constraint (future):
 *   All historical figure traversals are allowed.
 */
export const pantheonConstraint: TraversalConstraint = (_from: EngineNode, _to: EngineNode): boolean => {
  return true;
};

/**
 * Universal permissive constraint — allows all traversals.
 * Use as a default or for testing.
 */
export const noConstraint: TraversalConstraint = (): boolean => true;

// ── Utility functions ────────────────────────────────────────────────────────

/**
 * Check if traversal from `from` to `to` is allowed under the given constraint.
 * This is the canonical function used by BFS/Dijkstra.
 */
export function isTraversalAllowed(
  from: EngineNode,
  to: EngineNode,
  constraint: TraversalConstraint = collegeConstraint
): boolean {
  return constraint(from, to);
}

/**
 * Validate an entire path array for constraint violations.
 * @returns Index of first violation, or -1 if the path is clean.
 */
export function findConstraintViolation(
  path: EngineNode[],
  constraint: TraversalConstraint = collegeConstraint
): number {
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    if (current && next && !constraint(current, next)) {
      return i;
    }
  }
  return -1;
}
