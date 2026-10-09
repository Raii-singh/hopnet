export type NodeType = 'REAL' | 'DEMO';
export type EdgeType = 'REAL_EDGE' | 'DEMO_EDGE';

// ── EdgeKind — v2 API field name (preferred) ──────────────────────────────
// v2 graph responses use `edgeKind` (not `edgeType`).
// v1 graph responses still use `edgeType` — preserved for compatibility.
export type EdgeKind = 'REAL_EDGE' | 'DEMO_EDGE';

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

  // ── v2 graph intelligence fields ─────────────────────────────────────────
  // subgraphDegree: number of active connections within the returned subgraph.
  // Populated by /api/v2/graph responses. Not present in v1.
  subgraphDegree?: number;

  // globalConnectionCount: total active connections in the full Neo4j graph.
  // Only populated on the center node (hopDistance = 0) from /api/v2/graph.
  // Do NOT query for every node (avoids N+1).
  globalConnectionCount?: number;

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

  // ── v1 field (kept for v1 API compatibility, to be removed after migration) ──
  edgeType: EdgeType;

  // ── v2 field (preferred — used by /api/v2/graph responses) ───────────────
  edgeKind?: EdgeKind;

  weight: number;
  isLayoutAnchor?: boolean;
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
  // v2 additions
  centerId?: string;
}
