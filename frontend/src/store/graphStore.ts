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
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;
  hoveredEdge: GraphEdge | null;
  searchQuery: string;
  highlightedNodeIds: Set<string>;
  highlightedEdgeIds: Set<string>;

  // Filters (Step 18)
  activeEdgeTypes: string[];
  minTrustFilter: number;

  // WORKSPACE MODE (V2.5) — only available for providers with hasCRUD
  workspaceMode: boolean;
  visualConnectMode: boolean;
  connectorSourceNode: GraphNode | null;
  focusMode: boolean;

  // UI state
  isLoading: boolean;

  // Actions
  initGraph: () => Promise<void>;
  setPrimaryNode: (id: string | null) => Promise<void>;
  setRootNode: (nodeId: string) => void;
  setHopDepth: (depth: number) => void;
  toggleDemoNodes: () => void;
  selectNode: (node: GraphNode | null) => void;
  setHoveredNode: (node: GraphNode | null) => void;
  setHoveredEdge: (edge: GraphEdge | null) => void;
  setSearchQuery: (q: string) => void;
  resetGraph: () => void;
  highlightNeighbors: (nodeId: string) => void;
  clearHighlights: () => void;
  refreshSubgraph: () => Promise<void>;
  refreshDatabase: () => Promise<void>;
  databaseNodes: GraphNode[];
  setGraphFilters: (types: string[], minTrust: number) => void;

  // WORKSPACE ACTIONS (V2.5)
  toggleWorkspaceMode: () => void;
  toggleFocusMode: () => void;
  setVisualConnectMode: (val: boolean) => void;
  setConnectorSourceNode: (node: GraphNode | null) => void;
  createNewNode: (data: any) => Promise<void>;
  modifyUserNode: (id: string, data: any) => Promise<void>;
  removeUserNode: (id: string) => Promise<void>;
  createNewEdge: (data: any) => Promise<void>;
  modifyEdge: (id: string, data: any) => Promise<void>;
  removeEdge: (id: string) => Promise<void>;
  executeMerge: (sourceId: string, targetId: string) => Promise<void>;

  // PATHFINDER INTELLIGENCE (V3.0)
  tracedPath: GraphNode[];
  pathCost: number | null;
  tracePathAction: (fromId: string, toId: string) => Promise<void>;
  clearTracedPath: () => void;
}

// ── Empty state meta ──────────────────────────────────────────

const EMPTY_META: SubgraphMeta = {
  totalNodes: 0,
  totalEdges: 0,
  realNodes: 0,
  demoNodes: 0,
  realEdges: 0,
  demoEdges: 0,
  avgHopCount: 0,
  constraintActive: false,
  centerId: '',
};

// ── Dummy data helpers ────────────────────────────────────────

const ROOT_DUMMY = 'r-001';

function buildDummySubgraph(
  rootNodeId: string,
  hopDepth: number,
  showDemoNodes: boolean,
  allNodes: GraphNode[],
  allEdges: GraphEdge[]
) {
  const { nodes, links } = getDummySubgraph(rootNodeId, hopDepth, showDemoNodes, allNodes, allEdges);
  const meta = computeMeta(nodes, links, rootNodeId, hopDepth);
  return { nodes, links, meta };
}

// ── Store ─────────────────────────────────────────────────────

export const useGraphStore = create<GraphState>((set, get) => ({
  allNodes: [],
  allEdges: [],
  databaseNodes: [],
  visibleNodes: [],
  visibleLinks: [],
  meta: EMPTY_META,

  // Provider defaults
  activeProvider: DEFAULT_PROVIDER,
  providerCapabilities: getCapabilities(DEFAULT_PROVIDER),

  dataSource: 'api-v2',
  isApiHealthy: false,

  primaryNodeId: null,
  rootNodeId: '',
  hopDepth: 3,
  showDemoNodes: false,
  selectedNode: null,
  hoveredNode: null,
  hoveredEdge: null,
  searchQuery: '',
  highlightedNodeIds: new Set(),
  highlightedEdgeIds: new Set(),

  activeEdgeTypes: [],
  minTrustFilter: 0,

  // Workspace default states
  workspaceMode: false,
  visualConnectMode: false,
  connectorSourceNode: null,
  focusMode: false,

  isLoading: false,

  // Pathfinder default states
  tracedPath: [],
  pathCost: null,

  // ── PROVIDER SWITCHING (V4.0) ───────────────────────────────
  switchProvider: async (id: ProviderId) => {
    const caps = getCapabilities(id);

    // Reset everything and apply new provider
    set({
      activeProvider: id,
      providerCapabilities: caps,

      // Reset graph state
      allNodes: [],
      allEdges: [],
      visibleNodes: [],
      visibleLinks: [],
      meta: null,
      selectedNode: null,
      hoveredNode: null,
      hoveredEdge: null,
      tracedPath: [],
      pathCost: null,
      highlightedNodeIds: new Set(),
      highlightedEdgeIds: new Set(),
      searchQuery: '',
      hopDepth: 3,

      // Reset workspace (only available for providers with CRUD)
      workspaceMode: false,
      visualConnectMode: false,
      connectorSourceNode: null,

      // Demo nodes only available for college
      showDemoNodes: caps.hasDemoNodes,
    });

    // Load data for the new provider
    await get().initGraph();
  },

  setPrimaryNode: async (id: string | null) => {
    if (!id) {
      set({ primaryNodeId: null });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hopnet_primary_node_college');
      }
      await get().refreshSubgraph();
      return;
    }

    const { databaseNodes } = get();
    const matched = databaseNodes.find(n => n.id === id || n.publicId === id);
    const targetId = matched ? matched.id : id;

    set({ primaryNodeId: targetId, rootNodeId: targetId });
    if (typeof window !== 'undefined') {
      localStorage.setItem('hopnet_primary_node_college', targetId);
    }
    await get().refreshSubgraph();
  },

  // ── Init: probe API, load live data if available ────────────
  initGraph: async () => {
    const { activeProvider } = get();
    const healthy = await checkHealth();
    set({ isApiHealthy: healthy });

    if (activeProvider === 'college') {
      // ── Primary path: v2 / Neo4j ────────────────────────────────────────
      const v2Healthy = await checkHealthV2();

      if (v2Healthy) {
        try {
          await get().refreshDatabase();
          const dbNodes = get().databaseNodes;

          if (dbNodes.length === 0) {
            set({
              dataSource: 'api-v2',
              primaryNodeId: null,
              rootNodeId: '',
              isApiHealthy: true,
              visibleNodes: [],
              visibleLinks: [],
              allNodes: [],
              allEdges: [],
              meta: EMPTY_META,
            });
            if (typeof window !== 'undefined') {
              localStorage.removeItem('hopnet_primary_node_college');
            }
            return;
          }

          // Check if saved primary node preference exists in live Neo4j database
          let savedPrimaryId = typeof window !== 'undefined' ? localStorage.getItem('hopnet_primary_node_college') : null;
          let matched = savedPrimaryId ? dbNodes.find(n => n.id === savedPrimaryId || n.publicId === savedPrimaryId) : null;

          let activePrimaryId: string | null = null;
          if (matched) {
            activePrimaryId = matched.id;
          } else if (savedPrimaryId) {
            // Saved primary node was deleted from Neo4j — clear preference gracefully
            if (typeof window !== 'undefined') localStorage.removeItem('hopnet_primary_node_college');
            activePrimaryId = null;
          }

          const effectiveRootId = activePrimaryId || (dbNodes[0]?.id ?? '');

          set({
            dataSource: 'api-v2',
            primaryNodeId: activePrimaryId,
            rootNodeId: effectiveRootId,
            isApiHealthy: true,
          });

          await get().refreshSubgraph();
          return;
        } catch (err) {
          console.error('[HOPNet] v2 init failed:', err);
        }
      }

      // If we reach here, v2 health check failed or network request failed
      console.error('[HOPNet] College Graph API is unreachable or failed to initialize.');
      set({
