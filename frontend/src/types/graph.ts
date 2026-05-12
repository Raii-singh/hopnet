export type NodeType = 'REAL' | 'DEMO';
export type EdgeType = 'REAL_EDGE' | 'DEMO_EDGE';

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  cluster?: string;
  influenceScore: number;
  connectionCount: number;
  realConnections: number;
  demoConnections: number;
  centrality?: number;
  avgPathDistance?: number;
  bio?: string;
  tags?: string[];
  // Force graph internals (added by react-force-graph)
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  vx?: number;
  vy?: number;
  index?: number;
}

export interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  edgeType: EdgeType;
  weight: number;
  trustScore?: number;
  interactionStrength?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface SubgraphMeta {
  totalNodes: number;
  totalEdges: number;
  realNodes: number;
  demoNodes: number;
  realEdges: number;
  demoEdges: number;
  avgHopCount: number;
  rootNodeId: string;
  depth: number;
}
