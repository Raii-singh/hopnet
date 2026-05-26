/**
 * HOPNet Graph Constraint Engine
 *
 * Critical rule: REAL → DEMO → REAL traversal MUST NEVER be allowed.
 * This creates fake reachability and destroys trust in the network.
 *
 * Allowed paths:
 *   REAL → REAL  ✅
 *   REAL → DEMO  ✅ (one-way entry into demo cluster)
 *   DEMO → DEMO  ✅
 *   DEMO → REAL  ❌ BLOCKED
 */

import { NodeType } from '@prisma/client';

export interface LightNode {
  id: string;
  nodeType: NodeType;
}

/**
 * Check if traversal from `from` to `to` is allowed by HOPNet rules.
 */
export function isTraversalAllowed(from: LightNode, to: LightNode): boolean {
  // DEMO → REAL is always blocked
  if (from.nodeType === NodeType.DEMO && to.nodeType === NodeType.REAL) {
    return false;
  }
  return true;
}

/**
 * Validate an entire path array for constraint violations.
 * Returns the index of the first violation, or -1 if clean.
 */
export function findConstraintViolation(path: LightNode[]): number {
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    if (current && next && !isTraversalAllowed(current, next)) {
      return i;
    }
  }
  return -1;
}

