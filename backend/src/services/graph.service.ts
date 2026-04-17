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
    where: {
      source: { deletedAt: null },
      target: { deletedAt: null },
    },
  });
  const map = new Map<string, { total: number; real: number; demo: number }>();

  function inc(id: string, isReal: boolean) {
    if (!map.has(id)) map.set(id, { total: 0, real: 0, demo: 0 });
    const entry = map.get(id)!;
    entry.total++;
    if (isReal) entry.real++; else entry.demo++;
  }

  for (const e of edges) {
    const isReal = e.edgeType === EdgeType.REAL_EDGE;
    inc(e.sourceId, isReal);
    inc(e.targetId, isReal);
  }
  return map;
}

// ── GET /api/graph ────────────────────────────────────────────
export async function getSubgraph(
  rootNodeId: string,
  depth: number,
  includeDemo: boolean
): Promise<GraphData> {
  const [users, rawEdges, connMap] = await Promise.all([
    prisma.user.findMany({ where: { deletedAt: null } }),
    prisma.edge.findMany({
      where: {
        source: { deletedAt: null },
        target: { deletedAt: null },
      },
    }),
    buildConnectionMap(),
  ]);

  const bfsNodes: BFSNode[] = users.map(u => ({ id: u.id, nodeType: u.nodeType }));
  const bfsEdges: BFSEdge[] = rawEdges.map(e => ({
    id: e.id, sourceId: e.sourceId, targetId: e.targetId,
    edgeType: e.edgeType, weight: e.weight,
  }));

  // Run BFS
  const { visitedNodeIds, visitedEdgeIds, hopMap } = bfsSubgraph(
    rootNodeId, depth, includeDemo, bfsNodes, bfsEdges
  );

  const userMap = new Map(users.map(u => [u.id, u]));
  const nodes: GraphNodeOut[] = Array.from(visitedNodeIds).map(id => {
    const u = userMap.get(id)!;
    const conn = connMap.get(id) ?? { total: 0, real: 0, demo: 0 };
    return {
      id: u.id,
      publicId: u.publicId,
      fullName: u.fullName,
      username: u.username,
      email: u.email,
      phone: u.phone,
      linkedinUrl: u.linkedinUrl,
      instagramHandle: u.instagramHandle,
      twitterHandle: u.twitterHandle,
      company: u.company,
      cluster: u.cluster,
      influenceScore: u.influenceScore,
      connectionCount: conn.total,
      realConnections: conn.real,
      demoConnections: conn.demo,
      hopDistance: hopMap.get(id) ?? 0,
      tags: u.tags,
      sourceConnectors: u.sourceConnectors,
      metadata: u.metadata,
      nodeType: u.nodeType,
    };
  });

  const links: GraphEdgeOut[] = rawEdges
    .filter(e => visitedEdgeIds.has(e.id))
    .map(e => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      relationshipType: e.relationshipType,
      trustScore: e.trustScore,
      interactionFrequency: e.interactionFrequency,
      connectorSource: e.connectorSource,
      inferredFrom: e.inferredFrom,
      edgeType: e.edgeType,
      weight: e.weight,
    }));

  const realNodesCount = nodes.filter(n => n.nodeType === NodeType.REAL).length;
  const demoNodesCount = nodes.filter(n => n.nodeType === NodeType.DEMO).length;
  const realEdgesCount = links.filter(e => e.edgeType === EdgeType.REAL_EDGE).length;
  const demoEdgesCount = links.filter(e => e.edgeType === EdgeType.DEMO_EDGE).length;
  const avgHopCount =
    nodes.reduce((s, n) => s + (n.hopDistance ?? 0), 0) / Math.max(1, nodes.length);

  return {
    nodes, links,
    meta: {
      totalNodes: nodes.length, totalEdges: links.length,
      realNodes: realNodesCount, demoNodes: demoNodesCount,
      realEdges: realEdgesCount, demoEdges: demoEdgesCount,
      avgHopCount: Math.round(avgHopCount * 10) / 10,
      rootNodeId, depth, constraintActive: true,
    },
  };
}

// ── GET /api/users/profile/:publicId ──────────────────────────
export async function getNodeByPublicId(publicId: string): Promise<GraphNodeOut | null> {
  const [user, connMap] = await Promise.all([
    prisma.user.findFirst({ where: { publicId, deletedAt: null } }),
    buildConnectionMap(),
  ]);
  if (!user) return null;
  const conn = connMap.get(user.id) ?? { total: 0, real: 0, demo: 0 };
  return {
    id: user.id,
    publicId: user.publicId,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    phone: user.phone,
    linkedinUrl: user.linkedinUrl,
    instagramHandle: user.instagramHandle,
    twitterHandle: user.twitterHandle,
    company: user.company,
    cluster: user.cluster,
    influenceScore: user.influenceScore,
    connectionCount: conn.total,
    realConnections: conn.real,
    demoConnections: conn.demo,
    tags: user.tags,
    sourceConnectors: user.sourceConnectors,
    metadata: user.metadata,
    nodeType: user.nodeType,
  };
}

// ── GET /api/graph/node/:id ───────────────────────────────────
export async function getNodeById(id: string): Promise<GraphNodeOut | null> {
  const [user, connMap] = await Promise.all([
    prisma.user.findFirst({ where: { id, deletedAt: null } }),
    buildConnectionMap(),
  ]);
  if (!user) return null;
  const conn = connMap.get(id) ?? { total: 0, real: 0, demo: 0 };
  return {
    id: user.id,
    publicId: user.publicId,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    phone: user.phone,
    linkedinUrl: user.linkedinUrl,
    instagramHandle: user.instagramHandle,
    twitterHandle: user.twitterHandle,
    company: user.company,
    cluster: user.cluster,
    influenceScore: user.influenceScore,
    connectionCount: conn.total,
    realConnections: conn.real,
    demoConnections: conn.demo,
    tags: user.tags,
    sourceConnectors: user.sourceConnectors,
    metadata: user.metadata,
