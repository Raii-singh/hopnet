/**
 * HOPNet Shared Graph Engine — Centrality & Scoring
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical node scoring / centrality computation. Provider-agnostic.
 *
 * The "real edge" concept is provider-specific. Rather than hardcoding
 * `EdgeType.REAL_EDGE`, the caller supplies a `realEdgePredicate` function
 * that returns true for edges considered "primary/real" in their provider.
 *
 * Examples:
 *   College graph:  e => e.kind === 'REAL_EDGE'
 *   IMDb graph:     e => e.weight >= 0.5   (high-weight collaborations)
 *   Pantheon graph: () => true              (all influence edges are primary)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EngineNode, EngineEdge, NodeScore } from './types';

/** Predicate that returns true for edges considered "real/primary" by a provider */
export type RealEdgePredicate = (edge: EngineEdge) => boolean;

/** Default predicate: REAL_EDGE kind (CollegeGraph semantics) */
const defaultRealEdgePredicate: RealEdgePredicate = (e) => e.kind === 'REAL_EDGE';

/**
 * Compute degree centrality and weighted scores for all nodes.
 *
 * Composite influence formula:
 *   40% degree centrality + 35% weighted degree + 25% real-edge ratio
 *
 * @param nodes             - All nodes in the graph
 * @param edges             - All edges in the graph
 * @param realEdgePredicate - Identifies "primary" edges for this provider
 * @returns Map<nodeId, NodeScore>
 */
export function computeScores(
  nodes: EngineNode[],
  edges: EngineEdge[],
  realEdgePredicate: RealEdgePredicate = defaultRealEdgePredicate
): Map<string, NodeScore> {
  const scores = new Map<string, NodeScore>();
  const n = nodes.length;

  // Initialize all scores
  for (const node of nodes) {
    scores.set(node.id, {
      id: node.id,
      degreeCentrality: 0,
      weightedDegree: 0,
      realConnectionRatio: 0,
      influenceScore: 0,
    });
  }

  // Build per-node edge stats
  const edgesByNode = new Map<string, EngineEdge[]>();
  for (const edge of edges) {
    if (!edgesByNode.has(edge.sourceId)) edgesByNode.set(edge.sourceId, []);
    if (!edgesByNode.has(edge.targetId)) edgesByNode.set(edge.targetId, []);
    edgesByNode.get(edge.sourceId)!.push(edge);
    edgesByNode.get(edge.targetId)!.push(edge);
  }

  const maxPossibleDegree = Math.max(1, n - 1);

  for (const node of nodes) {
    const nodeEdges = edgesByNode.get(node.id) ?? [];
    const degree = nodeEdges.length;
    const weightedDeg = nodeEdges.reduce((sum, e) => sum + e.weight, 0);
    const realEdgeCount = nodeEdges.filter(realEdgePredicate).length;
    const realRatio = degree > 0 ? realEdgeCount / degree : 0;

    const degreeCentrality = degree / maxPossibleDegree;

    // Composite influence: 40% degree + 35% weighted + 25% real ratio
    const influenceScore = Math.min(
      100,
      Math.round(
        degreeCentrality * 40 +
        Math.min(1, weightedDeg / 10) * 35 +
        realRatio * 25
      )
    );

    scores.set(node.id, {
      id: node.id,
      degreeCentrality: Math.round(degreeCentrality * 1000) / 1000,
      weightedDegree: Math.round(weightedDeg * 100) / 100,
      realConnectionRatio: Math.round(realRatio * 100) / 100,
      influenceScore,
    });
  }

  return scores;
}

/**
 * Rank nodes by composite influence score (descending).
 *
 * @param scores - Output of `computeScores()`
 * @returns Array of NodeScore with added `rank` field (1 = highest influence)
 */
export function rankNodes(scores: Map<string, NodeScore>): (NodeScore & { rank: number })[] {
  return Array.from(scores.values())
    .sort((a, b) => b.influenceScore - a.influenceScore)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}
