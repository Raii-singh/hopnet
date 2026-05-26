export type NodeType = 'REAL' | 'DEMO';
export type EdgeType = 'REAL_EDGE' | 'DEMO_EDGE';

export interface GraphNode {
  id: string;
  publicId: string;
  fullName: string;
  username?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  instagramHandle?: string;
  twitterHandle?: string;
  company?: string;
  cluster?: string;
  influenceScore: number;
  connectionCount: number;
  realConnections: number;
  demoConnections: number;
  tags?: string[];
  sourceConnectors?: string[];
  metadata?: any;
  nodeType: NodeType;
  hopDistance?: number;
  centrality?: number;
  avgPathDistance?: number;
  
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
  relationshipType: string;
  trustScore: number;
  interactionFrequency: number;
  connectorSource: string;
  inferredFrom?: string;
  edgeType: EdgeType;
  weight: number;
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
  rootNodeId?: string;
  depth?: number;
  constraintActive?: boolean;
}

