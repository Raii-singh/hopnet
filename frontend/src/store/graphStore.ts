import { create } from 'zustand';
import { GraphNode, GraphEdge, SubgraphMeta } from '@/types/graph';
import {
  ALL_NODES,
  ALL_EDGES,
  getSubgraph as getDummySubgraph,
  computeMeta,
} from '@/utils/dummyData';
import {
  fetchGraph,
  fetchUsers,
  checkHealth,
  ApiNode,
  ApiEdge,
  createUserNode,
  updateUserNode,
  deleteUserNode,
  createRelationship,
  updateRelationship,
  deleteRelationship,
  mergeIdentities,
  fetchPath,
  fetchImdbGraph,
  // ── v2 API (Step 14) — primary data path ──────────────────────────────
  // MIGRATION: v1 functions above are TEMPORARY. Do not add new features to v1.
  // Remove v1 fallback once v2 is validated in production.
  checkHealthV2,
  fetchGraphV2,
  ApiNodeV2,
  ApiEdgeV2,
  // ── v2 CRUD (Step 15) ─────────────────────────────────────────────────
  createPersonV2,
  updatePersonV2,
  deletePersonV2,
  createRelationshipV2,
  updateRelationshipV2,
  deleteRelationshipV2,
} from '@/services/api';
import {
  ProviderId,
  DEFAULT_PROVIDER,
  getCapabilities,
  ProviderCapabilities,
} from '@/providers/graphProvider';

// ── Type adapters: API → internal GraphNode/GraphEdge ─────────

function apiNodeToGraph(n: ApiNode): GraphNode {
  return {
    id: n.id,
    publicId: n.publicId,
    fullName: n.fullName,
    username: n.username ?? undefined,
    email: n.email ?? undefined,
    phone: n.phone ?? undefined,
    linkedinUrl: n.linkedinUrl ?? undefined,
    instagramHandle: n.instagramHandle ?? undefined,
    twitterHandle: n.twitterHandle ?? undefined,
    company: n.company ?? undefined,
    cluster: n.cluster ?? undefined,
    influenceScore: n.influenceScore,
    connectionCount: n.connectionCount,
    realConnections: n.realConnections,
    demoConnections: n.demoConnections,
    tags: n.tags ?? [],
    sourceConnectors: n.sourceConnectors ?? [],
    metadata: n.metadata ?? {},
    nodeType: n.nodeType,
    hopDistance: n.hopDistance,
    centrality: 0,
    avgPathDistance: undefined,
  };
}

function apiEdgeToGraph(e: ApiEdge): GraphEdge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    relationshipType: e.relationshipType,
    trustScore: e.trustScore,
    interactionFrequency: e.interactionFrequency,
    connectorSource: e.connectorSource,
    inferredFrom: e.inferredFrom ?? undefined,
    edgeType: e.edgeType,
    weight: e.weight,
  };
}

// ── v2 API adapters (Step 14) ─────────────────────────────────────────────
// These convert v2 Neo4j API shapes → internal GraphNode/GraphEdge types.
// edgeKind (v2) is mapped to both edgeKind AND edgeType (for compatibility
// with existing GraphCanvas code that may read edgeType).

export function apiNodeV2ToGraph(n: ApiNodeV2): GraphNode {
  return {
    id: n.id,
    publicId: n.publicId,
    fullName: n.fullName,
    username: n.username ?? undefined,
    email: n.email ?? undefined,
    phone: n.phone ?? undefined,
    linkedinUrl: n.linkedinUrl ?? undefined,
    instagramHandle: n.instagramHandle ?? undefined,
    twitterHandle: n.twitterHandle ?? undefined,
    company: n.company ?? undefined,
    cluster: n.cluster ?? undefined,
    influenceScore: n.influenceScore ?? 0,
    connectionCount: n.connectionCount ?? 0,
    realConnections: n.realConnections ?? 0,
    demoConnections: n.demoConnections ?? 0,
    tags: n.tags ?? [],
    sourceConnectors: n.sourceConnectors ?? [],
    metadata: n.metadata ?? {},
    nodeType: n.nodeType,
    hopDistance: n.hopDistance,
    centrality: 0,
    avgPathDistance: undefined,
    // v2-specific intelligence fields
    subgraphDegree: n.subgraphDegree,
    globalConnectionCount: n.globalConnectionCount,
  };
}

function apiEdgeV2ToGraph(e: ApiEdgeV2): GraphEdge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    relationshipType: e.relationshipType,
    trustScore: e.trustScore,
    interactionFrequency: e.interactionFrequency,
    connectorSource: e.connectorSource,
    inferredFrom: e.inferredFrom ?? undefined,
    // v2 field — expose as edgeKind
    edgeKind: e.edgeKind,
    // Mirror edgeKind as edgeType for backward-compat with GraphCanvas code
    // that still reads edgeType. Remove once GraphCanvas is updated.
    edgeType: e.edgeKind as 'REAL_EDGE' | 'DEMO_EDGE',
    weight: e.weight,
  };
}

// ── Store interface ───────────────────────────────────────────

interface GraphState {
  // Graph data
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  visibleNodes: GraphNode[];
  visibleLinks: GraphEdge[];
  meta: SubgraphMeta | null;

  // ── PROVIDER SYSTEM (V4.0) ──────────────────────────────────
  activeProvider: ProviderId;
  providerCapabilities: ProviderCapabilities;
  switchProvider: (id: ProviderId) => Promise<void>;

  // Source mode
  // 'api-v2': Neo4j via /api/v2 — PRIMARY (Step 14)
  // 'dummy':  offline static data — fallback
  // 'api':    Prisma via /api/v1 — TEMPORARY migration safety net (to be removed)
  dataSource: 'dummy' | 'api' | 'api-v2';
  isApiHealthy: boolean;

  // View state
  primaryNodeId: string | null;
  rootNodeId: string;
  hopDepth: number;
  showDemoNodes: boolean;
