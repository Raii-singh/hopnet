/**
 * HOPNet Graph Constraint Engine
 *
 * Critical rule: REAL → DEMO → REAL traversal MUST NEVER be allowed.
 * This creates fake reachability and destroys trust in the network.
 *
 * This backend adapter delegates constraint enforcement to the shared graph engine.
 */

import { NodeType } from '@prisma/client';
import { isTraversalAllowed as engineIsTraversalAllowed, findConstraintViolation as engineFindConstraintViolation } from '../../../shared/graph-engine/src';

export interface LightNode {
  id: string;
  nodeType: NodeType;
}

/**
 * Check if traversal from `from` to `to` is allowed by HOPNet rules.
 */
export function isTraversalAllowed(from: LightNode, to: LightNode): boolean {
  return engineIsTraversalAllowed(
    { id: from.id, kind: from.nodeType as any },
    { id: to.id, kind: to.nodeType as any }
  );
}

/**
 * Validate an entire path array for constraint violations.
 * Returns the index of the first violation, or -1 if clean.
 */
export function findConstraintViolation(path: LightNode[]): number {
  const enginePath = path.map(n => ({ id: n.id, kind: n.nodeType as any }));
  return engineFindConstraintViolation(enginePath);
}


