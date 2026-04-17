import prisma from '../config/prisma';
import { bfsSubgraph, BFSNode, BFSEdge } from '../graph/bfs';
import { dijkstra, reconstructPath } from '../graph/dijkstra';
import { NodeType, EdgeType } from '@prisma/client';

export interface GraphNodeOut {
  id: string;
  publicId: string;
  fullName: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  instagramHandle: string | null;
  twitterHandle: string | null;
  company: string | null;
  cluster: string | null;
  influenceScore: number;
  connectionCount: number;
  realConnections: number;
  demoConnections: number;
  hopDistance?: number;
  tags: string[];
  sourceConnectors: string[];
  metadata: any;
  nodeType: NodeType;
}

export interface GraphEdgeOut {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  trustScore: number;
  interactionFrequency: number;
  connectorSource: string;
  inferredFrom: string | null;
  edgeType: EdgeType;
  weight: number;
}

export interface GraphData {
  nodes: GraphNodeOut[];
  links: GraphEdgeOut[];
  meta: {
    totalNodes: number;
    totalEdges: number;
    realNodes: number;
    demoNodes: number;
    realEdges: number;
    demoEdges: number;
    avgHopCount: number;
    rootNodeId: string;
    depth: number;
    constraintActive: boolean;
  };
}

// ── Load all raw data from DB (Excluding Soft Deleted) ────────
async function loadRawGraph(): Promise<{ nodes: BFSNode[]; edges: BFSEdge[] }> {
  const users = await prisma.user.findMany({ where: { deletedAt: null } });
  const edges = await prisma.edge.findMany({
    where: {
      source: { deletedAt: null },
      target: { deletedAt: null },
    },
  });

  const nodes: BFSNode[] = users.map(u => ({ id: u.id, nodeType: u.nodeType }));
  const bfsEdges: BFSEdge[] = edges.map(e => ({
    id: e.id,
    sourceId: e.sourceId,
    targetId: e.targetId,
    edgeType: e.edgeType,
    weight: e.weight,
  }));

  return { nodes, edges: bfsEdges };
}

// ── Build connection count map (Excluding Soft Deleted) ───────
async function buildConnectionMap(): Promise<
  Map<string, { total: number; real: number; demo: number }>
> {
  const edges = await prisma.edge.findMany({
