import { isTraversalAllowed, LightNode } from './constraints';
import { NodeType } from '@prisma/client';

export interface DijkstraNode extends LightNode {
  id: string;
  nodeType: NodeType;
}

export interface DijkstraEdge {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
}

export interface DijkstraResult {
  distance: Map<string, number>;   // nodeId → shortest weighted distance from root
  previous: Map<string, string | null>; // nodeId → previous node in optimal path
}

/**
 * Dijkstra shortest-weighted-path from rootId.
 *
 * Edge weight in HOPNet represents connection strength (0-1).
 * Cost = 1 - weight (so stronger edges have lower cost = preferred).
 *
 * Constraint: DEMO → REAL blocked (same as BFS).
 */
export function dijkstra(
  rootId: string,
  allNodes: DijkstraNode[],
  allEdges: DijkstraEdge[]
): DijkstraResult {
  const nodeMap = new Map<string, DijkstraNode>(allNodes.map(n => [n.id, n]));

  // Build adjacency list with costs
  const adj = new Map<string, { neighborId: string; cost: number }[]>();
  for (const edge of allEdges) {
    const cost = 1 - edge.weight; // higher weight = lower cost
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

  // Simple priority queue (min-heap would be faster but this is sufficient for HOPNet scale)
  const remaining = new Set(allNodes.map(n => n.id));

  while (remaining.size > 0) {
    // Pick node with minimum distance
    let minDist = Infinity;
    let u: string | null = null;
    for (const id of remaining) {
      const d = distance.get(id) ?? Infinity;
      if (d < minDist) { minDist = d; u = id; }
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

      // Enforce HOPNet constraint
      if (!isTraversalAllowed(currentNode, neighborNode)) continue;

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
 * Reconstruct the path from root to target using Dijkstra `previous` map.
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
  return path;
}

