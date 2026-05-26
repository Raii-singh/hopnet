/**
 * Centrality scoring utilities for HOPNet nodes.
 * Used to compute influence scores and node rankings.
 */

export interface ScoringNode {
  id: string;
  type: string;
}

export interface ScoringEdge {
  sourceId: string;
  targetId: string;
  weight: number;
  edgeType: string;
}

export interface NodeScore {
  id: string;
  degreeCentrality: number;  // raw connection count / max connections
  weightedDegree: number;    // sum of edge weights
  realConnectionRatio: number;
  influenceScore: number;    // composite 0-100
}

/**
 * Compute degree centrality and weighted scores for all nodes.
 */
export function computeScores(
  nodes: ScoringNode[],
  edges: ScoringEdge[]
): Map<string, NodeScore> {
  const scores = new Map<string, NodeScore>();
  const n = nodes.length;

  // Initialize
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
  const edgesByNode = new Map<string, ScoringEdge[]>();
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
    const realEdges = nodeEdges.filter(e => e.edgeType === 'REAL_EDGE').length;
    const realRatio = degree > 0 ? realEdges / degree : 0;

    const degreeCentrality = degree / maxPossibleDegree;

    // Composite influence: 40% degree centrality + 35% weighted edges + 25% real ratio
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
 * Rank nodes by composite score.
 */
export function rankNodes(scores: Map<string, NodeScore>): (NodeScore & { rank: number })[] {
  return Array.from(scores.values())
    .sort((a, b) => b.influenceScore - a.influenceScore)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}
