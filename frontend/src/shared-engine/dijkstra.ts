/**
 * HOPNet Shared Graph Engine — Dijkstra Shortest-Weighted Path
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Dijkstra implementation. Provider-agnostic.
 *
 * Edge weight in HOPNet represents connection strength (0–1).
 * Cost = 1 - weight (higher weight = lower cost = preferred path).
 *
 * Traversal constraints are injected via a `TraversalConstraint` function.
 * No Prisma, no I/O, no external dependencies.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EngineNode, EngineEdge, DijkstraResult, TraversalConstraint } from './types';
import { collegeConstraint } from './constraints';

/**
 * Dijkstra shortest-weighted path from `rootId` to all other nodes.
 *
 * @param rootId     - Starting node ID
 * @param allNodes   - Full node set
 * @param allEdges   - Full edge set (weight: 0–1 connection strength)
 * @param constraint - Traversal gate function (default: collegeConstraint)
 * @returns DijkstraResult with distance map and predecessor map
 */
export function dijkstra(
  rootId: string,
  allNodes: EngineNode[],
  allEdges: EngineEdge[],
  constraint: TraversalConstraint = collegeConstraint
): DijkstraResult {
  const nodeMap = new Map<string, EngineNode>(allNodes.map(n => [n.id, n]));

  // Build undirected adjacency list with costs (cost = 1 - weight)
  const adj = new Map<string, { neighborId: string; cost: number }[]>();
  for (const edge of allEdges) {
    const cost = 1 - edge.weight; // higher weight = lower cost = preferred
    if (!adj.has(edge.sourceId)) adj.set(edge.sourceId, []);
    if (!adj.has(edge.targetId)) adj.set(edge.targetId, []);
    adj.get(edge.sourceId)!.push({ neighborId: edge.targetId, cost });
    adj.get(edge.targetId)!.push({ neighborId: edge.sourceId, cost });
  }

  const distance = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const node of allNodes) {
    distance.set(node.id, Infinity);
    previous.set(node.id, null);
  }
  distance.set(rootId, 0);

  // Simple O(V²) Dijkstra — adequate for HOPNet's graph scale
  const remaining = new Set(allNodes.map(n => n.id));

  while (remaining.size > 0) {
    // Pick unvisited node with minimum distance
    let minDist = Infinity;
    let u: string | null = null;
    for (const id of remaining) {
      const d = distance.get(id) ?? Infinity;
      if (d < minDist) {
        minDist = d;
        u = id;
      }
    }

    if (u === null || minDist === Infinity) break;
    remaining.delete(u);
    visited.add(u);

    const currentNode = nodeMap.get(u);
    if (!currentNode) continue;

    for (const { neighborId, cost } of adj.get(u) ?? []) {
      if (visited.has(neighborId)) continue;

      const neighborNode = nodeMap.get(neighborId);
      if (!neighborNode) continue;

      // Apply provider-defined traversal constraint
      if (!constraint(currentNode, neighborNode)) continue;

      const alt = (distance.get(u) ?? Infinity) + cost;
      if (alt < (distance.get(neighborId) ?? Infinity)) {
        distance.set(neighborId, alt);
        previous.set(neighborId, u);
      }
    }
  }

  return { distance, previous };
}

/**
 * Reconstruct the optimal path from root to `targetId` using the Dijkstra result.
 *
 * @param targetId - Destination node ID
 * @param previous - Predecessor map from `dijkstra()`
 * @returns Ordered array of node IDs from root → target,
 *          or empty array if target is unreachable
 */
export function reconstructPath(
  targetId: string,
  previous: Map<string, string | null>
): string[] {
  const path: string[] = [];
  let current: string | null = targetId;

  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) ?? null;
  }

  // If path doesn't start from root (disconnected), return empty
  if (path.length === 1 && path[0] !== targetId) return [];

  return path;
}
