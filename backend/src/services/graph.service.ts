import prisma from '../config/prisma';
import { bfsSubgraph, BFSNode, BFSEdge } from '../graph/bfs';
import { dijkstra, reconstructPath } from '../graph/dijkstra';

export interface GraphNodeOut {
  id: string;
  name: string;
  type: string;
  cluster: string | null;
  influenceScore: number;
  connectionCount: number;
  realConnections: number;
  demoConnections: number;
  hopDistance?: number;
}

export interface GraphEdgeOut {
  id: string;
  source: string;
  target: string;
  edgeType: string;
  weight: number;
  trustScore: number;
  interactionStrength: number;
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

// ── Load all raw data from DB ─────────────────────────────────
async function loadRawGraph(): Promise<{ nodes: BFSNode[]; edges: BFSEdge[] }> {
  const users = await prisma.user.findMany();
  const edges = await prisma.edge.findMany();

  const nodes: BFSNode[] = users.map(u => ({ id: u.id, type: u.type }));
  const bfsEdges: BFSEdge[] = edges.map(e => ({
    id: e.id,
    sourceId: e.sourceId,
    targetId: e.targetId,
    edgeType: e.edgeType,
    weight: e.weight,
  }));

  return { nodes, edges: bfsEdges };
}

// ── Build connection count map ────────────────────────────────
async function buildConnectionMap(): Promise<
  Map<string, { total: number; real: number; demo: number }>
> {
  const edges = await prisma.edge.findMany();
  const map = new Map<string, { total: number; real: number; demo: number }>();

  function inc(id: string, isReal: boolean) {
    if (!map.has(id)) map.set(id, { total: 0, real: 0, demo: 0 });
    const entry = map.get(id)!;
    entry.total++;
    if (isReal) entry.real++; else entry.demo++;
  }

  for (const e of edges) {
    const isReal = e.edgeType === 'REAL_EDGE';
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
    prisma.user.findMany(),
    prisma.edge.findMany(),
    buildConnectionMap(),
  ]);

  const bfsNodes: BFSNode[] = users.map(u => ({ id: u.id, type: u.type }));
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
      id: u.id, name: u.name, type: u.type, cluster: u.cluster,
      influenceScore: u.influenceScore,
      connectionCount: conn.total,
      realConnections: conn.real,
      demoConnections: conn.demo,
      hopDistance: hopMap.get(id) ?? 0,
    };
  });

  const links: GraphEdgeOut[] = rawEdges
    .filter(e => visitedEdgeIds.has(e.id))
    .map(e => ({
      id: e.id, source: e.sourceId, target: e.targetId,
      edgeType: e.edgeType, weight: e.weight,
      trustScore: Math.round(e.weight * 95) / 100,
      interactionStrength: Math.round(e.weight * 88) / 100,
    }));

  const realNodes = nodes.filter(n => n.type === 'REAL').length;
  const demoNodes = nodes.filter(n => n.type === 'DEMO').length;
  const realEdges = links.filter(e => e.edgeType === 'REAL_EDGE').length;
  const demoEdges = links.filter(e => e.edgeType === 'DEMO_EDGE').length;
  const avgHopCount =
    nodes.reduce((s, n) => s + (n.hopDistance ?? 0), 0) / Math.max(1, nodes.length);

  return {
    nodes, links,
    meta: {
      totalNodes: nodes.length, totalEdges: links.length,
      realNodes, demoNodes, realEdges, demoEdges,
      avgHopCount: Math.round(avgHopCount * 10) / 10,
      rootNodeId, depth, constraintActive: true,
    },
  };
}

// ── GET /api/graph/node/:id ───────────────────────────────────
export async function getNodeById(id: string): Promise<GraphNodeOut | null> {
  const [user, connMap] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    buildConnectionMap(),
  ]);
  if (!user) return null;
  const conn = connMap.get(id) ?? { total: 0, real: 0, demo: 0 };
  return {
    id: user.id, name: user.name, type: user.type, cluster: user.cluster,
    influenceScore: user.influenceScore,
    connectionCount: conn.total, realConnections: conn.real, demoConnections: conn.demo,
  };
}

// ── GET /api/users ────────────────────────────────────────────
export async function getAllNodes(): Promise<GraphNodeOut[]> {
  const [users, connMap] = await Promise.all([
    prisma.user.findMany({ orderBy: { influenceScore: 'desc' } }),
    buildConnectionMap(),
  ]);
  return users.map(u => {
    const conn = connMap.get(u.id) ?? { total: 0, real: 0, demo: 0 };
    return {
      id: u.id, name: u.name, type: u.type, cluster: u.cluster,
      influenceScore: u.influenceScore,
      connectionCount: conn.total, realConnections: conn.real, demoConnections: conn.demo,
    };
  });
}

// ── GET /api/rankings ─────────────────────────────────────────
export async function getRankings(): Promise<(GraphNodeOut & { rankScore: number; rank: number })[]> {
  const nodes = await getAllNodes();
  return nodes
    .map(n => ({
      ...n,
      rankScore: Math.round(n.realConnections * 4 + n.influenceScore * 0.35),
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .map((n, i) => ({ ...n, rank: i + 1 }));
}

// ── GET /api/graph/path?from=x&to=y ──────────────────────────
export async function getShortestPath(
  fromId: string,
  toId: string
): Promise<{ path: string[]; totalCost: number } | null> {
  const { nodes, edges } = await loadRawGraph();
  const rawEdges = await prisma.edge.findMany();
  const dijkstraEdges = rawEdges.map(e => ({
    id: e.id, sourceId: e.sourceId, targetId: e.targetId, weight: e.weight,
  }));

  const { distance, previous } = dijkstra(fromId, nodes, dijkstraEdges);
  const cost = distance.get(toId);
  if (cost === undefined || cost === Infinity) return null;

  const path = reconstructPath(toId, previous);
  return { path, totalCost: Math.round(cost * 100) / 100 };
}
