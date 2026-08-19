import { LightNode } from './constraints';
import { NodeType } from '@prisma/client';
import { dijkstra as engineDijkstra, reconstructPath as engineReconstructPath } from '../../../shared/graph-engine/src';

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
 * Delegates to the shared graph engine.
 */
export function dijkstra(
  rootId: string,
  allNodes: DijkstraNode[],
  allEdges: DijkstraEdge[]
): DijkstraResult {
  const engineNodes = allNodes.map(n => ({
    id: n.id,
    kind: n.nodeType as any
  }));

  const engineEdges = allEdges.map(e => ({
    id: e.id,
    sourceId: e.sourceId,
    targetId: e.targetId,
    kind: 'REAL_EDGE' as any, // default fallback
    weight: e.weight
  }));

  return engineDijkstra(rootId, engineNodes, engineEdges);
}

/**
 * Reconstruct the path from root to target using Dijkstra `previous` map.
 */
export function reconstructPath(
  targetId: string,
  previous: Map<string, string | null>
): string[] {
  return engineReconstructPath(targetId, previous);
}


