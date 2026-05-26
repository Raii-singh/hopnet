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
    nodeType: user.nodeType,
  };
}

// ── GET /api/users ────────────────────────────────────────────
export async function getAllNodes(): Promise<GraphNodeOut[]> {
  const [users, connMap] = await Promise.all([
    prisma.user.findMany({ where: { deletedAt: null }, orderBy: { influenceScore: 'desc' } }),
    buildConnectionMap(),
  ]);
  return users.map(u => {
    const conn = connMap.get(u.id) ?? { total: 0, real: 0, demo: 0 };
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
      tags: u.tags,
      sourceConnectors: u.sourceConnectors,
      metadata: u.metadata,
      nodeType: u.nodeType,
    };
  });
}

// ── GET /api/users/rankings ───────────────────────────────────
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
  const rawEdges = await prisma.edge.findMany({
    where: {
      source: { deletedAt: null },
      target: { deletedAt: null },
    },
  });
  const dijkstraEdges = rawEdges.map(e => ({
    id: e.id, sourceId: e.sourceId, targetId: e.targetId, weight: e.weight,
  }));

  const { distance, previous } = dijkstra(fromId, nodes, dijkstraEdges);
  const cost = distance.get(toId);
  if (cost === undefined || cost === Infinity) return null;

  const path = reconstructPath(toId, previous);
  return { path, totalCost: Math.round(cost * 100) / 100 };
}

// ── WORKSPACE: User Node CRUD ─────────────────────────────────
export async function createUser(data: {
  fullName: string;
  username?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  instagramHandle?: string;
  twitterHandle?: string;
  company?: string;
  cluster?: string;
  influenceScore?: number;
  tags?: string[];
  sourceConnectors?: string[];
  metadata?: any;
  nodeType: NodeType;
  createdBy?: string;
}) {
  const count = await prisma.user.count({ where: { nodeType: data.nodeType } });
  const padStr = (num: number, size: number) => {
    let s = num + '';
    while (s.length < size) s = '0' + s;
    return s;
  };
  const seq = padStr(count + 1, 6);
  const publicId = data.nodeType === NodeType.REAL ? `HNP-${seq}` : `DNP-${seq}`;
  const username = data.username || data.fullName.toLowerCase().replace(/\s+/g, '_');

  return prisma.user.create({
    data: {
      publicId,
      fullName: data.fullName,
      username,
      email: data.email || `${username}@hopnet.io`,
      phone: data.phone,
      linkedinUrl: data.linkedinUrl,
      instagramHandle: data.instagramHandle,
      twitterHandle: data.twitterHandle,
      company: data.company,
      cluster: data.cluster,
      influenceScore: data.influenceScore ?? 10,
      tags: data.tags || [],
      sourceConnectors: data.sourceConnectors || ['Manual Workspace'],
      metadata: data.metadata || {},
      nodeType: data.nodeType,
      createdBy: data.createdBy || 'Manual Editor',
    },
  });
}

export async function updateUser(id: string, data: {
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  instagramHandle?: string;
  twitterHandle?: string;
  company?: string;
  cluster?: string;
  influenceScore?: number;
  tags?: string[];
  sourceConnectors?: string[];
  metadata?: any;
  nodeType?: NodeType;
}) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

export async function softDeleteUser(id: string) {
  // Soft delete user
  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Automatically delete all edges associated with the deleted user
  await prisma.edge.deleteMany({
    where: {
      OR: [{ sourceId: id }, { targetId: id }],
    },
  });
}

// ── WORKSPACE: Edge Relationship CRUD ─────────────────────────
export async function createEdge(data: {
  sourceId: string;
  targetId: string;
  relationshipType?: string;
  trustScore?: number;
  interactionFrequency?: number;
  connectorSource?: string;
  inferred?: boolean;
  createdBy?: string;
}) {
  const sourceId = data.sourceId;
  const targetId = data.targetId;

  // 1. Self-loop verification
  if (sourceId === targetId) {
    throw new Error('Self-loops are forbidden. A node cannot create a connection to itself.');
  }

  // Fetch nodes
  const [sourceNode, targetNode] = await Promise.all([
    prisma.user.findFirst({ where: { id: sourceId, deletedAt: null } }),
    prisma.user.findFirst({ where: { id: targetId, deletedAt: null } }),
  ]);
  if (!sourceNode || !targetNode) {
    throw new Error('One or both nodes do not exist or are soft-deleted.');
  }

  // 2. Traversal constraints (DEMO → REAL is strictly blocked)
  if (sourceNode.nodeType === NodeType.DEMO && targetNode.nodeType === NodeType.REAL) {
    throw new Error('Graph Traversal Integrity Violation:traversing from DEMO nodes to REAL nodes is blocked.');
  }

  // 3. Duplicate edge check
  const existingEdge = await prisma.edge.findFirst({
    where: {
      OR: [
        { sourceId, targetId },
        { sourceId: targetId, targetId: sourceId }
      ]
    }
  });
  if (existingEdge) {
    throw new Error('A connection path already exists between these two users.');
  }

  const trust = data.trustScore !== undefined ? data.trustScore : 0.5;
  const freq = data.interactionFrequency !== undefined ? data.interactionFrequency : 0.5;
  const weight = Math.round((trust * 0.6 + freq * 0.4) * 100) / 100;

  const isRealEdge = sourceNode.nodeType === NodeType.REAL && targetNode.nodeType === NodeType.REAL;

  return prisma.edge.create({
    data: {
      sourceId,
      targetId,
      relationshipType: data.relationshipType || 'acquaintance',
      trustScore: trust,
      interactionFrequency: freq,
      connectorSource: data.connectorSource || 'Manual Editor',
      inferred: data.inferred ?? false,
      createdBy: data.createdBy || 'Manual Editor',
      edgeType: isRealEdge ? EdgeType.REAL_EDGE : EdgeType.DEMO_EDGE,
      weight,
    },
  });
}

export async function updateEdge(id: string, data: {
  relationshipType?: string;
  trustScore?: number;
  interactionFrequency?: number;
  createdBy?: string;
}) {
  const edge = await prisma.edge.findUnique({ where: { id } });
  if (!edge) throw new Error('Edge not found.');

  const trust = data.trustScore !== undefined ? data.trustScore : edge.trustScore;
  const freq = data.interactionFrequency !== undefined ? data.interactionFrequency : edge.interactionFrequency;
  const weight = Math.round((trust * 0.6 + freq * 0.4) * 100) / 100;

  return prisma.edge.update({
    where: { id },
    data: {
      relationshipType: data.relationshipType,
      trustScore: trust,
      interactionFrequency: freq,
      weight,
      createdBy: data.createdBy || 'Manual Editor',
    },
  });
}

export async function deleteEdge(id: string) {
  return prisma.edge.delete({
    where: { id },
  });
}

// ── WORKSPACE: Identity Merge & Duplicates ────────────────────
export async function mergeUsers(sourceId: string, targetId: string) {
  if (sourceId === targetId) throw new Error('Cannot merge a user into themselves.');

  const [sourceUser, targetUser] = await Promise.all([
    prisma.user.findFirst({ where: { id: sourceId, deletedAt: null } }),
    prisma.user.findFirst({ where: { id: targetId, deletedAt: null } }),
  ]);
  if (!sourceUser || !targetUser) throw new Error('Source or target user does not exist.');

  // 1. Move all outgoing edges of source to target
  const outgoing = await prisma.edge.findMany({ where: { sourceId } });
  for (const edge of outgoing) {
    const exists = await prisma.edge.findFirst({
      where: {
        OR: [
          { sourceId: targetId, targetId: edge.targetId },
          { sourceId: edge.targetId, targetId: targetId }
        ]
      }
    });
    if (!exists && edge.targetId !== targetId) {
      await prisma.edge.update({
        where: { id: edge.id },
        data: { sourceId: targetId },
      });
    } else {
      await prisma.edge.delete({ where: { id: edge.id } });
    }
  }

  // 2. Move all incoming edges of source to target
  const incoming = await prisma.edge.findMany({ where: { targetId: sourceId } });
  for (const edge of incoming) {
    const exists = await prisma.edge.findFirst({
      where: {
        OR: [
          { sourceId: edge.sourceId, targetId },
          { sourceId: targetId, targetId: edge.sourceId }
        ]
      }
    });
    if (!exists && edge.sourceId !== targetId) {
      await prisma.edge.update({
        where: { id: edge.id },
        data: { targetId },
      });
    } else {
      await prisma.edge.delete({ where: { id: edge.id } });
    }
  }

  // 3. Combine fields
  const combinedTags = Array.from(new Set([...(sourceUser.tags || []), ...(targetUser.tags || [])]));
  const combinedConnectors = Array.from(new Set([...(sourceUser.sourceConnectors || []), ...(targetUser.sourceConnectors || [])]));
  const sourceMeta = (sourceUser.metadata as any) || {};
  const targetMeta = (targetUser.metadata as any) || {};
  const combinedMeta = {
    ...sourceMeta,
    ...targetMeta,
    mergedFrom: sourceUser.publicId,
    mergedAt: new Date().toISOString(),
  };

  await prisma.user.update({
    where: { id: targetId },
    data: {
      tags: combinedTags,
      sourceConnectors: combinedConnectors,
      metadata: combinedMeta,
    },
  });

  // 4. Soft delete the source user
  return prisma.user.update({
    where: { id: sourceId },
    data: { deletedAt: new Date() },
  });
}

export async function detectDuplicates() {
  const activeUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { fullName: 'asc' }
  });
  const suggestions: { userA: any; userB: any; reason: string; similarity: number }[] = [];

  for (let i = 0; i < activeUsers.length; i++) {
    for (let j = i + 1; j < activeUsers.length; j++) {
      const uA = activeUsers[i]!;
      const uB = activeUsers[j]!;

      // Check 1: Shared company and partial name match
      const sharedCompany = uA.company && uB.company && uA.company.toLowerCase() === uB.company.toLowerCase();
      
      const namePartsA = uA.fullName.toLowerCase().split(/\s+/);
      const namePartsB = uB.fullName.toLowerCase().split(/\s+/);
      const nameIntersection = namePartsA.filter(p => namePartsB.includes(p) && p.length > 2);
      
      if (sharedCompany && nameIntersection.length > 0) {
        suggestions.push({
          userA: { id: uA.id, publicId: uA.publicId, fullName: uA.fullName, company: uA.company },
          userB: { id: uB.id, publicId: uB.publicId, fullName: uB.fullName, company: uB.company },
          reason: `Shared company (${uA.company}) and name similarity ('${nameIntersection.join(', ')}')`,
          similarity: 85,
        });
        continue;
      }

      // Check 2: Emails with same prefix
      if (uA.email && uB.email) {
        const prefixA = uA.email.split('@')[0];
        const prefixB = uB.email.split('@')[0];
        if (prefixA === prefixB && prefixA && prefixA.length > 3) {
          suggestions.push({
            userA: { id: uA.id, publicId: uA.publicId, fullName: uA.fullName, email: uA.email },
            userB: { id: uB.id, publicId: uB.publicId, fullName: uB.fullName, email: uB.email },
            reason: `Identical email username prefix ('${prefixA}')`,
            similarity: 90,
          });
        }
      }
    }
  }
  return suggestions;
}
