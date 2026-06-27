/**
 * HOPNet Shared Graph Engine — BFS (Breadth-First Search)
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical BFS subgraph expansion. Provider-agnostic.
 *
 * Zero dependencies. No Prisma, no I/O.
 * Traversal constraints are injected via a `TraversalConstraint` function.
 *
 * This is the SINGLE source of truth for BFS in HOPNet.
 * - backend/src/graph/bfs.ts          → thin adapter over this
 * - frontend/src/utils/dummyData.ts   → calls this directly
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EngineNode, EngineEdge, BFSResult, TraversalConstraint } from './types';
import { collegeConstraint } from './constraints';

/**
 * BFS subgraph expansion from a root node up to `maxDepth` hops.
 *
 * @param rootId        - Starting node ID
 * @param maxDepth      - Maximum traversal depth (hops from root)
 * @param includeDemo   - If false, DEMO/non-primary nodes are excluded from expansion
 * @param allNodes      - Full node set to traverse
 * @param allEdges      - Full edge set to traverse
 * @param constraint    - Traversal gate function (default: collegeConstraint)
 * @param demoKinds     - Node kinds considered "demo" for `includeDemo` filtering
 *                        (default: ['DEMO'])
 * @returns BFSResult with visited node IDs, edge IDs, and hop map
 */
export function bfsSubgraph(
  rootId: string,
  maxDepth: number,
  includeDemo: boolean,
  allNodes: EngineNode[],
  allEdges: EngineEdge[],
  constraint: TraversalConstraint = collegeConstraint,
  demoKinds: string[] = ['DEMO']
): BFSResult {
  const nodeMap = new Map<string, EngineNode>(allNodes.map(n => [n.id, n]));

  // Build undirected adjacency list: nodeId → [{neighborId, edgeId}]
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

      // Apply provider-defined traversal constraint
      if (!constraint(currentNode, neighborNode)) continue;

      // Respect demo filter (provider configures which kinds are "demo")
      if (!includeDemo && demoKinds.includes(neighborNode.kind)) continue;

      // Mark edge as traversed even if neighbor was already visited
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
