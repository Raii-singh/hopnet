import { NodeType, EdgeType } from '@prisma/client';
import { computeScores as engineComputeScores, rankNodes as engineRankNodes } from '../../../shared/graph-engine/src';

export interface ScoringNode {
  id: string;
  nodeType: NodeType;
}

export interface ScoringEdge {
  sourceId: string;
  targetId: string;
  weight: number;
  edgeType: EdgeType;
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
 * Delegates to the shared graph engine.
 */
export function computeScores(
  nodes: ScoringNode[],
  edges: ScoringEdge[]
): Map<string, NodeScore> {
  const engineNodes = nodes.map(n => ({
    id: n.id,
    kind: n.nodeType as any
  }));

  const engineEdges = edges.map(e => ({
    id: 'edge_' + e.sourceId + '_' + e.targetId,
    sourceId: e.sourceId,
    targetId: e.targetId,
    kind: e.edgeType as any,
    weight: e.weight
  }));

  const realEdgePredicate = (edge: any) => edge.kind === 'REAL_EDGE';

  // Compute scores using the engine
  const engineScores = engineComputeScores(engineNodes, engineEdges, realEdgePredicate);

  // Map to compatible format
  const result = new Map<string, NodeScore>();
  for (const [key, val] of engineScores.entries()) {
    result.set(key, {
      id: val.id,
      degreeCentrality: val.degreeCentrality,
      weightedDegree: val.weightedDegree,
      realConnectionRatio: val.realConnectionRatio,
      influenceScore: val.influenceScore
    });
  }

  return result;
}

/**
 * Rank nodes by composite score.
 */
export function rankNodes(scores: Map<string, NodeScore>): (NodeScore & { rank: number })[] {
  return engineRankNodes(scores as any);
}


