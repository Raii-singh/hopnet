import { isTraversalAllowed, LightNode } from './constraints';

export interface BFSNode extends LightNode {
  id: string;
  type: string;
}

export interface BFSEdge {
  id: string;
  sourceId: string;
  targetId: string;
  edgeType: string;
  weight: number;
}

export interface BFSResult {
  visitedNodeIds: Set<string>;
  visitedEdgeIds: Set<string>;
  hopMap: Map<string, number>; // nodeId → hop distance from root
}

/**
 * BFS subgraph expansion with HOPNet constraint enforcement.
 *
 * Rules enforced at algorithm level (not SQL):
 *   - DEMO → REAL traversal is ALWAYS blocked
 *   - DEMO nodes can be excluded via `includeDemo = false`
 *   - Traversal stops at `maxDepth` hops
 */
export function bfsSubgraph(
  rootId: string,
  maxDepth: number,
  includeDemo: boolean,
  allNodes: BFSNode[],
  allEdges: BFSEdge[]
): BFSResult {
  const nodeMap = new Map<string, BFSNode>(allNodes.map(n => [n.id, n]));

  // Build undirected adjacency list
  const adj = new Map<string, { neighborId: string; edgeId: string }[]>();
  for (const edge of allEdges) {
    if (!adj.has(edge.sourceId)) adj.set(edge.sourceId, []);
    if (!adj.has(edge.targetId)) adj.set(edge.targetId, []);
    adj.get(edge.sourceId)!.push({ neighborId: edge.targetId, edgeId: edge.id });
    adj.get(edge.targetId)!.push({ neighborId: edge.sourceId, edgeId: edge.id });
  }

  const visitedNodes = new Set<string>([rootId]);
  const visitedEdges = new Set<string>();
  const hopMap = new Map<string, number>([[rootId, 0]]);
  const queue: { nodeId: string; hop: number }[] = [{ nodeId: rootId, hop: 0 }];

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const { nodeId, hop } = item;
    if (hop >= maxDepth) continue;

    const currentNode = nodeMap.get(nodeId);
    if (!currentNode) continue;

    for (const { neighborId, edgeId } of adj.get(nodeId) ?? []) {
      const neighborNode = nodeMap.get(neighborId);
      if (!neighborNode) continue;

      // Enforce HOPNet constraint: DEMO → REAL blocked
      if (!isTraversalAllowed(currentNode, neighborNode)) continue;

      // Respect demo filter
      if (!includeDemo && neighborNode.type === 'DEMO') continue;

      // Mark edge as visited even if neighbor already visited
      visitedEdges.add(edgeId);

      if (!visitedNodes.has(neighborId)) {
        visitedNodes.add(neighborId);
        hopMap.set(neighborId, hop + 1);
        queue.push({ nodeId: neighborId, hop: hop + 1 });
      }
    }
  }

  return { visitedNodeIds: visitedNodes, visitedEdgeIds: visitedEdges, hopMap };
}
