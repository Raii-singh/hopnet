/**
 * HOPNet Shared Graph Engine — Yen's K-Shortest Loopless Paths
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Yen's algorithm implementation. Provider-agnostic.
 *
 * Finds K shortest simple (acyclic) paths from rootId to targetId,
 * ordered by total accumulated Dijkstra friction cost (sum of 1 - weight per edge).
 *
 * Reuses the canonical `dijkstra()` implementation and respects `TraversalConstraint`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EngineNode, EngineEdge, TraversalConstraint } from './types';
import { dijkstra, reconstructPath } from './dijkstra';
import { collegeConstraint } from './constraints';

export interface EnginePath {
  /** Ordered node IDs from root → target */
  nodeIds: string[];
  /** Accumulated Dijkstra friction cost (sum of 1 - weight per edge) */
  totalCost: number;
}

export interface YenResult {
  paths: EnginePath[];
  hasMore: boolean;
}

/**
 * Helper to build an edge cost lookup map.
 * Key: `${u}:${v}` and `${v}:${u}` -> min cost (1 - weight)
 */
function buildEdgeCostMap(allEdges: EngineEdge[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const edge of allEdges) {
    const cost = 1 - edge.weight;
    const k1 = `${edge.sourceId}:${edge.targetId}`;
    const k2 = `${edge.targetId}:${edge.sourceId}`;
    
    if (!map.has(k1) || cost < map.get(k1)!) map.set(k1, cost);
    if (!map.has(k2) || cost < map.get(k2)!) map.set(k2, cost);
  }
  return map;
}

/**
 * Calculate total Dijkstra friction cost for a sequence of node IDs.
 */
function calculatePathCost(nodeIds: string[], edgeCostMap: Map<string, number>): number {
  let totalCost = 0;
  for (let i = 0; i < nodeIds.length - 1; i++) {
    const u = nodeIds[i];
    const v = nodeIds[i + 1];
    const key = `${u}:${v}`;
    const c = edgeCostMap.get(key);
    if (c === undefined) return Infinity;
    totalCost += c;
  }
  return Math.round(totalCost * 10000) / 10000;
}

/**
 * Check if two node ID paths share the exact same prefix of length `len`.
 */
function pathPrefixMatches(p1: string[], p2: string[], len: number): boolean {
  if (p1.length < len || p2.length < len) return false;
  for (let i = 0; i < len; i++) {
    if (p1[i] !== p2[i]) return false;
  }
  return true;
}

/**
 * Yen's algorithm for finding K-shortest loopless paths.
 *
 * @param rootId     - Source node ID
 * @param targetId   - Destination node ID
 * @param allNodes   - EngineNode array
 * @param allEdges   - EngineEdge array
 * @param k          - Number of paths requested in batch (default 3)
 * @param constraint - Traversal gate function (default collegeConstraint)
 * @param maxDepth   - Maximum path hop count (default 6)
 * @param offset     - Pagination offset (default 0)
 */
export function yenKShortestPaths(
  rootId: string,
  targetId: string,
  allNodes: EngineNode[],
  allEdges: EngineEdge[],
  k: number = 3,
  constraint: TraversalConstraint = collegeConstraint,
  maxDepth: number = 6,
  offset: number = 0
): YenResult {
  if (!rootId || !targetId || rootId === targetId || k <= 0 || offset < 0) {
    return { paths: [], hasMore: false };
  }

  const edgeCostMap = buildEdgeCostMap(allEdges);

  // Initial shortest path (A[0])
  const firstDijk = dijkstra(rootId, allNodes, allEdges, constraint);
  const firstPathIds = reconstructPath(targetId, firstDijk.previous);

  if (firstPathIds.length === 0 || firstPathIds.length - 1 > maxDepth) {
    return { paths: [], hasMore: false };
  }

  const firstCost = calculatePathCost(firstPathIds, edgeCostMap);
  const A: EnginePath[] = [{ nodeIds: firstPathIds, totalCost: firstCost }];
  const B: EnginePath[] = [];

  const targetTotal = offset + k + 1; // Compute +1 to determine hasMore accurately
  const seenPathKeys = new Set<string>([firstPathIds.join('->')]);

  for (let i = 1; i < targetTotal; i++) {
    const prevPath = A[i - 1].nodeIds;

    for (let j = 0; j < prevPath.length - 1; j++) {
      const spurNode = prevPath[j];
      const rootPath = prevPath.slice(0, j + 1);

      if (rootPath.length - 1 >= maxDepth) break;

      // 1. Exclude rootPath nodes (except spurNode) to guarantee loopless paths
      const rootNodeExclusions = new Set<string>(rootPath.slice(0, -1));

      // 2. Exclude edges that have been used by previously found paths with the same root path
      const edgeExclusions = new Set<string>();
      for (const p of A) {
        if (pathPrefixMatches(p.nodeIds, rootPath, rootPath.length)) {
          const nextNode = p.nodeIds[j + 1];
          // Find matching edges between spurNode and nextNode
          for (const edge of allEdges) {
            if (
              (edge.sourceId === spurNode && edge.targetId === nextNode) ||
              (edge.sourceId === nextNode && edge.targetId === spurNode)
            ) {
              edgeExclusions.add(edge.id);
            }
          }
        }
      }

      // 3. Filter nodes and edges for spur Dijkstra calculation
      const spurNodes = allNodes.filter(n => !rootNodeExclusions.has(n.id));
      const spurEdges = allEdges.filter(
        e =>
          !edgeExclusions.has(e.id) &&
          !rootNodeExclusions.has(e.sourceId) &&
          !rootNodeExclusions.has(e.targetId)
      );

      // 4. Run Dijkstra from spurNode to targetId
      const spurDijk = dijkstra(spurNode, spurNodes, spurEdges, constraint);
      const spurPathIds = reconstructPath(targetId, spurDijk.previous);

      if (spurPathIds.length > 0) {
        const totalPathIds = [...rootPath.slice(0, -1), ...spurPathIds];

        // Ensure maxDepth and loopless constraints
        const pathHops = totalPathIds.length - 1;
        const isLoopless = new Set(totalPathIds).size === totalPathIds.length;

        if (pathHops <= maxDepth && isLoopless) {
          const key = totalPathIds.join('->');
          if (!seenPathKeys.has(key)) {
            seenPathKeys.add(key);
            const totalCost = calculatePathCost(totalPathIds, edgeCostMap);
            B.push({ nodeIds: totalPathIds, totalCost });
          }
        }
      }
    }

    if (B.length === 0) break;

    // Sort candidates in B by totalCost ascending, breaking ties deterministically by node sequence
    B.sort((a, b) => {
      const diff = a.totalCost - b.totalCost;
      if (Math.abs(diff) > 1e-6) {
        return diff;
      }
      return a.nodeIds.join('->').localeCompare(b.nodeIds.join('->'));
    });

    // Pick lowest cost candidate from B and add to A
    const nextBest = B.shift()!;
    A.push(nextBest);
  }

  if (offset >= A.length) {
    return { paths: [], hasMore: false };
  }

  const returnedPaths = A.slice(offset, offset + k);
  const hasMore = A.length > offset + k || B.length > 0;

  return { paths: returnedPaths, hasMore };
}
