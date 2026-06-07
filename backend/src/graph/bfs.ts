import { LightNode } from './constraints';
import { NodeType, EdgeType } from '@prisma/client';
import { bfsSubgraph as engineBfsSubgraph } from '@hopnet/shared/graph-engine';

export interface BFSNode extends LightNode {
  id: string;
  nodeType: NodeType;
}

export interface BFSEdge {
  id: string;
  sourceId: string;
  targetId: string;
  edgeType: EdgeType;
  weight: number;
}

export interface BFSResult {
  visitedNodeIds: Set<string>;
  visitedEdgeIds: Set<string>;
  hopMap: Map<string, number>; // nodeId → hop distance from root
}

/**
 * BFS subgraph expansion with HOPNet constraint enforcement.
 * Delegates to the shared graph engine.
 */
export function bfsSubgraph(
  rootId: string,
  maxDepth: number,
  includeDemo: boolean,
  allNodes: BFSNode[],
  allEdges: BFSEdge[]
): BFSResult {
  const engineNodes = allNodes.map(n => ({
    id: n.id,
    kind: n.nodeType as any
  }));

  const engineEdges = allEdges.map(e => ({
    id: e.id,
    sourceId: e.sourceId,
    targetId: e.targetId,
    kind: e.edgeType as any,
    weight: e.weight
  }));

  return engineBfsSubgraph(
    rootId,
    maxDepth,
    includeDemo,
    engineNodes,
    engineEdges
  );
}


