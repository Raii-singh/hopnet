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
import { useAuthStore } from '@/store/authStore';

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

export interface PathItemState {
  nodeIds: string[];
  nodes: GraphNode[];
  links: GraphEdge[];
  totalCost: number;
}

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

  // Visual customization controls
  fontSizeScale: number;
  nodeSizeScale: number;
  nodeDistanceScale: number;
  setFontSizeScale: (scale: number) => void;
  setNodeSizeScale: (scale: number) => void;
  setNodeDistanceScale: (scale: number) => void;

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
  tracedPaths: PathItemState[];
  activePathIndex: number;
  hasMorePaths: boolean;
  isLoadingMorePaths: boolean;
  lastPathQuery: { fromId: string; toId: string } | null;
  excludedNodeIds: Set<string>;
  tracePathAction: (fromId: string, toId: string) => Promise<void>;
  setActivePathIndex: (index: number) => void;
  loadMorePaths: () => Promise<void>;
  clearTracedPath: () => void;
  excludeNode: (id: string) => void;
  includeNode: (id: string) => void;
  clearExcludedNodes: () => void;
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

export const DEFAULT_PRIMARY_NODE_ID = 'f02bb0c5-43e0-4e5e-b54a-033a852f1645';
export const DEFAULT_PRIMARY_PUBLIC_ID = 'HNP-000001';
export const DEFAULT_PRIMARY_NAME = 'Rai Singh';

export function findDefaultPrimaryNode(nodes: GraphNode[]): GraphNode | undefined {
  if (!nodes || nodes.length === 0) return undefined;
  return (
    nodes.find(n => n.publicId === DEFAULT_PRIMARY_PUBLIC_ID) ||
    nodes.find(n => n.id === DEFAULT_PRIMARY_NODE_ID) ||
    nodes.find(n => n.fullName?.trim().toLowerCase() === DEFAULT_PRIMARY_NAME.toLowerCase()) ||
    nodes.find(n => n.username?.trim().toLowerCase() === 'rai1819') ||
    nodes.find(n => n.nodeType === 'REAL') ||
    nodes[0]
  );
}

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

  primaryNodeId: DEFAULT_PRIMARY_NODE_ID,
  rootNodeId: DEFAULT_PRIMARY_NODE_ID,
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

  // Visual customization defaults (Font 170%, node distance 3/4)
  fontSizeScale: 1.7,
  nodeSizeScale: 1.0,
  nodeDistanceScale: 0.75,

  // Workspace default states
  workspaceMode: false,
  visualConnectMode: false,
  connectorSourceNode: null,
  focusMode: false,

  isLoading: false,

  // Pathfinder default states
  tracedPath: [],
  pathCost: null,
  tracedPaths: [],
  activePathIndex: 0,
  hasMorePaths: false,
  isLoadingMorePaths: false,
  lastPathQuery: null,
  excludedNodeIds: new Set<string>(),

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
      tracedPaths: [],
      activePathIndex: 0,
      hasMorePaths: false,
      isLoadingMorePaths: false,
      lastPathQuery: null,
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
    const { databaseNodes } = get();
    const defaultPrimaryNode = findDefaultPrimaryNode(databaseNodes);
    const defaultPrimaryId = defaultPrimaryNode ? defaultPrimaryNode.id : DEFAULT_PRIMARY_NODE_ID;

    if (!id) {
      set({ primaryNodeId: defaultPrimaryId, rootNodeId: defaultPrimaryId });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hopnet_primary_node_live');
      }
      await get().refreshSubgraph();
      return;
    }

    const matched = databaseNodes.find(n => n.id === id || n.publicId === id);
    const targetId = matched ? matched.id : id;

    set({ primaryNodeId: targetId, rootNodeId: targetId });
    if (typeof window !== 'undefined') {
      localStorage.setItem('hopnet_primary_node_live', targetId);
    }
    await get().refreshSubgraph();
  },

  // ── Init: probe API, load live data if available ────────────
  initGraph: async () => {
    const { activeProvider } = get();
    const healthy = await checkHealth();
    set({ isApiHealthy: healthy });

    if (activeProvider === 'live') {
      // ── Primary path: v2 / Neo4j ────────────────────────────────────────
      const v2Healthy = await checkHealthV2();

      if (v2Healthy) {
        try {
          await get().refreshDatabase();
          const dbNodes = get().databaseNodes;

          if (dbNodes.length === 0) {
            const dummyRoot = ALL_NODES.find(n => n.id === 'r-001' || n.id === 'rai-singh') || ALL_NODES[0];
            const rootId = dummyRoot ? dummyRoot.id : 'r-001';
            const fallbackSubgraph = getDummySubgraph(rootId, 3, true, ALL_NODES, ALL_EDGES);
            set({
              dataSource: 'dummy',
              primaryNodeId: rootId,
              rootNodeId: rootId,
              isApiHealthy: true,
              visibleNodes: fallbackSubgraph.nodes,
              visibleLinks: fallbackSubgraph.links,
              databaseNodes: ALL_NODES,
              allNodes: ALL_NODES,
              allEdges: ALL_EDGES,
              meta: computeMeta(fallbackSubgraph.nodes, fallbackSubgraph.links, rootId, 3),
            });
            if (typeof window !== 'undefined') {
              localStorage.removeItem('hopnet_primary_node_live');
            }
            return;
          }

          // Check if saved primary node preference exists in live Neo4j database
          let savedPrimaryId = typeof window !== 'undefined' ? localStorage.getItem('hopnet_primary_node_live') : null;
          let matched = savedPrimaryId ? dbNodes.find(n => n.id === savedPrimaryId || n.publicId === savedPrimaryId) : null;

          // Default primary node is hardcoded to Rai Singh (HNP-000001)
          const defaultPrimaryNode = findDefaultPrimaryNode(dbNodes);
          const defaultPrimaryId = defaultPrimaryNode ? defaultPrimaryNode.id : DEFAULT_PRIMARY_NODE_ID;

          let activePrimaryId: string;
          if (matched) {
            activePrimaryId = matched.id;
          } else {
            if (savedPrimaryId && typeof window !== 'undefined') {
              // Saved primary node was deleted from Neo4j — clear preference gracefully
              localStorage.removeItem('hopnet_primary_node_live');
            }
            activePrimaryId = defaultPrimaryId;
          }

          const effectiveRootId = activePrimaryId || defaultPrimaryId;

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
      console.warn('[HOPNet] Live Graph API is unreachable or unconfigured. Falling back to demo dataset.');
      const dummyRoot = ALL_NODES.find(n => n.id === 'r-001' || n.id === 'rai-singh') || ALL_NODES[0];
      const rootId = dummyRoot ? dummyRoot.id : 'r-001';
      const fallbackSubgraph = getDummySubgraph(rootId, 3, true, ALL_NODES, ALL_EDGES);
      set({
        dataSource: 'dummy',
        primaryNodeId: rootId,
        rootNodeId: rootId,
        isApiHealthy: false,
        visibleNodes: fallbackSubgraph.nodes,
        visibleLinks: fallbackSubgraph.links,
        databaseNodes: ALL_NODES,
        allNodes: ALL_NODES,
        allEdges: ALL_EDGES,
        meta: computeMeta(fallbackSubgraph.nodes, fallbackSubgraph.links, rootId, 3),
      });

    }
  },

  // ── Refresh subgraph from API or dummy ──────────────────────
  refreshSubgraph: async () => {
    const { rootNodeId, hopDepth, showDemoNodes, dataSource, activeProvider, activeEdgeTypes, minTrustFilter } = get();
    set({ isLoading: true });

    try {
      if (activeProvider === 'live') {
        if (!rootNodeId) {
          set({ visibleNodes: [], visibleLinks: [], meta: EMPTY_META });
          return;
        }

        // Always ensure databaseNodes is refreshed
        let dbNodes = get().databaseNodes;
        if (dbNodes.length === 0) {
          try {
            const { fetchPersonsV2 } = await import('@/services/api');
            const res = await fetchPersonsV2(500);
            dbNodes = res.data.map(apiNodeV2ToGraph);
            set({ databaseNodes: dbNodes });
          } catch (e) {
            console.warn('[refreshSubgraph] Failed to fetch databaseNodes:', e);
          }
        }

        const existingPosMap = new Map(get().visibleNodes.map(n => [n.id, { x: (n as any).x, y: (n as any).y, vx: (n as any).vx, vy: (n as any).vy }]));

        const data = await fetchGraphV2(rootNodeId, hopDepth, showDemoNodes, { types: activeEdgeTypes, minTrust: minTrustFilter });
        let visibleNodes = data.nodes.map(n => {
          const gNode = apiNodeV2ToGraph(n);
          const pos = existingPosMap.get(gNode.id);
          if (pos && typeof pos.x === 'number' && typeof pos.y === 'number' && isFinite(pos.x) && isFinite(pos.y)) {
            (gNode as any).x = pos.x;
            (gNode as any).y = pos.y;
            (gNode as any).vx = pos.vx;
            (gNode as any).vy = pos.vy;
          }
          return gNode;
        });
        const visibleLinks = data.links.map(apiEdgeV2ToGraph);

        // Include ONLY truly independent nodes (0 connections in DB) as floating visual anchors.
        // Connected nodes at higher hop depths (connectionCount > 0) only appear when hopDepth reaches them with their edges!
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        for (const dbNode of dbNodes) {
          if (!visibleNodeIds.has(dbNode.id)) {
            if (!showDemoNodes && dbNode.nodeType === 'DEMO') continue;
            
            const totalConns = (dbNode.connectionCount ?? 0) + (dbNode.realConnections ?? 0) + (dbNode.demoConnections ?? 0);
            const isIndependent = totalConns === 0;

            if (isIndependent) {
              const gNode = {
                ...dbNode,
                hopDistance: 99,
              };
              const pos = existingPosMap.get(gNode.id);
              if (pos && typeof pos.x === 'number' && typeof pos.y === 'number' && isFinite(pos.x) && isFinite(pos.y)) {
                (gNode as any).x = pos.x;
                (gNode as any).y = pos.y;
                (gNode as any).vx = pos.vx;
                (gNode as any).vy = pos.vy;
              }
              visibleNodes.push(gNode);
              visibleNodeIds.add(dbNode.id);
            }
          }
        }

        const realNodesCount = visibleNodes.filter(n => n.nodeType === 'REAL').length;
        const demoNodesCount = visibleNodes.filter(n => n.nodeType === 'DEMO').length;
        const realEdgesCount = visibleLinks.filter(l => l.edgeType === 'REAL_EDGE' || l.edgeKind === 'REAL_EDGE').length;
        const demoEdgesCount = visibleLinks.filter(l => l.edgeType === 'DEMO_EDGE' || l.edgeKind === 'DEMO_EDGE').length;

        const meta: SubgraphMeta = {
          totalNodes: visibleNodes.length,
          totalEdges: visibleLinks.length,
          realNodes: realNodesCount,
          demoNodes: demoNodesCount,
          realEdges: realEdgesCount,
          demoEdges: demoEdgesCount,
          avgHopCount: data.meta.avgHopCount,
          constraintActive: data.meta.constraintActive,
          centerId: data.meta.centerId,
        };
        set({ visibleNodes, visibleLinks, meta });
      } else {
        const { nodes, links, meta } = buildDummySubgraph(rootNodeId, hopDepth, showDemoNodes, get().allNodes, get().allEdges);
        set({ visibleNodes: nodes, visibleLinks: links, meta });
      }
    } catch (err) {
      console.error('[refreshSubgraph]', err);
      set({ visibleNodes: [], visibleLinks: [], meta: EMPTY_META });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshDatabase: async () => {
    const { activeProvider, dataSource } = get();
    if (activeProvider === 'live' && dataSource === 'api-v2') {
      try {
        const { fetchPersonsV2 } = await import('@/services/api');
        const res = await fetchPersonsV2(500);
        const databaseNodes = res.data.map(apiNodeV2ToGraph);
        set({ databaseNodes });
      } catch (err) {
        console.error('[refreshDatabase] Failed to fetch V2 persons:', err);
      }
    } else {
      set({ databaseNodes: get().allNodes });
    }
  },

  setRootNode: (nodeId) => {
    set({ rootNodeId: nodeId });
    get().refreshSubgraph();
  },

  setHopDepth: (depth) => {
    set({ hopDepth: depth });
    get().refreshSubgraph();
  },

  toggleDemoNodes: () => {
    set(s => ({ showDemoNodes: !s.showDemoNodes }));
    get().refreshSubgraph();
  },

  selectNode: (node) => set({ selectedNode: node }),
  setHoveredNode: (node) => set({ hoveredNode: node }),
  setHoveredEdge: (edge) => set({ hoveredEdge: edge }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setGraphFilters: (types, minTrust) => {
    set({ activeEdgeTypes: types, minTrustFilter: minTrust });
    get().refreshSubgraph();
  },

  setFontSizeScale: (scale) => set({ fontSizeScale: scale }),
  setNodeSizeScale: (scale) => set({ nodeSizeScale: scale }),
  setNodeDistanceScale: (scale) => set({ nodeDistanceScale: scale }),

  resetGraph: () => {
    const { dataSource, allNodes, databaseNodes, primaryNodeId, activeProvider } = get();
    let rootNodeId: string;
    if (dataSource === 'api-v2') {
      const defaultPrimary = findDefaultPrimaryNode(databaseNodes);
      rootNodeId = primaryNodeId || defaultPrimary?.id || DEFAULT_PRIMARY_NODE_ID;
    } else if (dataSource === 'dummy') {
      rootNodeId = ROOT_DUMMY;
    } else {
      rootNodeId = allNodes.find(n => n.nodeType === 'REAL')?.id ?? ROOT_DUMMY;
    }

    set({
      rootNodeId,
      hopDepth: 3,
      showDemoNodes: getCapabilities(activeProvider).hasDemoNodes,
      selectedNode: null,
      hoveredNode: null,
      hoveredEdge: null,
      searchQuery: '',
      highlightedNodeIds: new Set(),
      highlightedEdgeIds: new Set(),
      fontSizeScale: 1.7,
      nodeSizeScale: 1.0,
      nodeDistanceScale: 0.75,
    });
    get().refreshSubgraph();
  },

  highlightNeighbors: (nodeId) => {
    const { visibleLinks } = get();
    const nodeIds = new Set<string>([nodeId]);
    const edgeIds = new Set<string>();

    for (const edge of visibleLinks) {
      const src = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
      const tgt = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
      if (src === nodeId) { nodeIds.add(tgt); edgeIds.add(edge.id); }
      if (tgt === nodeId) { nodeIds.add(src); edgeIds.add(edge.id); }
    }

    set({ highlightedNodeIds: nodeIds, highlightedEdgeIds: edgeIds });
  },

  clearHighlights: () => set({ highlightedNodeIds: new Set(), highlightedEdgeIds: new Set() }),

  // ── WORKSPACE ACTIONS ──
  toggleWorkspaceMode: () => {
    const { providerCapabilities } = get();
    if (!providerCapabilities.hasWorkspaceMode) return; // Guard: read-only providers
    set(s => ({ workspaceMode: !s.workspaceMode, visualConnectMode: false, connectorSourceNode: null }));
  },
  toggleFocusMode: () => set(s => ({ focusMode: !s.focusMode })),
  setVisualConnectMode: (val) => set({ visualConnectMode: val, connectorSourceNode: null }),
  setConnectorSourceNode: (node) => set({ connectorSourceNode: node }),

  createNewNode: async (data) => {
    const isSudo = useAuthStore.getState().isAdmin;
    if (get().dataSource === 'api-v2' && isSudo) {
      // ── v2 / Neo4j primary path (SUDO mode: persist to DB) ──────────────
      const res = await createPersonV2({
        nodeType: data.nodeType,
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        phone: data.phone,
        company: data.company,
        cluster: data.cluster,
        tags: data.tags,
        sourceConnectors: data.sourceConnectors ?? ['Manual Workspace'],
        createdBy: 'Manual Workspace',
      });

      if (res && res.id) {
        const newNode = apiNodeV2ToGraph(res);
        const updatedDb = [...get().databaseNodes.filter(n => n.id !== newNode.id), newNode];
        const updatedVis = [...get().visibleNodes.filter(n => n.id !== newNode.id), newNode];
        set({ databaseNodes: updatedDb, visibleNodes: updatedVis });

        if (!get().primaryNodeId) {
          await get().setPrimaryNode(newNode.id);
        } else {
          await get().refreshDatabase();
          await get().refreshSubgraph();
        }
      }
    } else {
      // ── Local In-Memory Fallback (Visitor mode: interactive, resets on reload) ──
      const pool = get().visibleNodes.length > 0 ? get().visibleNodes : get().allNodes;
      const count = pool.length;
      const publicId = data.nodeType === 'REAL' ? `HNP-000${count + 1}` : `DNP-000${count + 1}`;
      const newNode: GraphNode = {
        id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        publicId,
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        company: data.company,
        cluster: data.cluster || 'Tech',
        influenceScore: data.influenceScore ?? 10,
        connectionCount: 0,
        realConnections: 0,
        demoConnections: 0,
        tags: data.tags || [],
        sourceConnectors: data.sourceConnectors || ['Manual'],
        metadata: data.metadata || {},
        nodeType: data.nodeType || 'REAL',
      };
      set(s => ({
        allNodes: [...s.allNodes, newNode],
        visibleNodes: [...s.visibleNodes, newNode],
        databaseNodes: [...s.databaseNodes, newNode],
      }));
    }
  },

  modifyUserNode: async (id, data) => {
    const isSudo = useAuthStore.getState().isAdmin;
    if (get().dataSource === 'api-v2' && isSudo) {
      // ── v2 / Neo4j primary path (SUDO mode: persist to DB) ──────────────
      const { nodeType: _nt, id: _id, publicId: _pid, createdAt: _ca,
              updatedAt: _ua, deletedAt: _da, createdBy: _cb, ...safeUpdates } = data;
      await updatePersonV2(id, safeUpdates);
      await get().refreshSubgraph();
      await get().refreshDatabase();
    } else {
      // ── Local In-Memory Fallback (Visitor mode) ─────────────────────────
      set(s => ({
        allNodes: s.allNodes.map(n => n.id === id ? { ...n, ...data } : n),
        visibleNodes: s.visibleNodes.map(n => n.id === id ? { ...n, ...data } : n),
        databaseNodes: s.databaseNodes.map(n => n.id === id ? { ...n, ...data } : n),
      }));
    }
  },

  removeUserNode: async (id) => {
    const isSudo = useAuthStore.getState().isAdmin;
    if (get().dataSource === 'api-v2' && isSudo) {
      // ── v2 / Neo4j primary path (SUDO mode: persist to DB) ──────────────
      await deletePersonV2(id);
      
      if (get().primaryNodeId === id) {
        await get().setPrimaryNode(null);
      }

      await get().refreshSubgraph();
      await get().refreshDatabase();
    } else {
      // ── Local In-Memory Fallback (Visitor mode) ─────────────────────────
      set(s => ({
        allNodes: s.allNodes.filter(n => n.id !== id),
        visibleNodes: s.visibleNodes.filter(n => n.id !== id),
        databaseNodes: s.databaseNodes.filter(n => n.id !== id),
        allEdges: s.allEdges.filter(e => {
          const src = typeof e.source === 'string' ? e.source : (e.source as any).id;
          const tgt = typeof e.target === 'string' ? e.target : (e.target as any).id;
          return src !== id && tgt !== id;
        }),
        visibleLinks: s.visibleLinks.filter(e => {
          const src = typeof e.source === 'string' ? e.source : (e.source as any).id;
          const tgt = typeof e.target === 'string' ? e.target : (e.target as any).id;
          return src !== id && tgt !== id;
        }),
      }));
    }
  },

  createNewEdge: async (data) => {
    const isSudo = useAuthStore.getState().isAdmin;
    if (get().dataSource === 'api-v2' && isSudo) {
      // ── v2 / Neo4j primary path (SUDO mode: persist to DB) ──────────────
      await createRelationshipV2({
        sourceId: data.sourceId,
        targetId: data.targetId,
        relationshipType: data.relationshipType || 'acquaintance',
        trustScore: data.trustScore ?? 0.5,
        interactionFrequency: data.interactionFrequency ?? 0.5,
        connectorSource: data.connectorSource ?? 'Manual Workspace',
        createdBy: 'Manual Workspace',
      });
      await get().refreshSubgraph();
    } else {
      // ── Local In-Memory Fallback (Visitor mode) ─────────────────────────
      const poolNodes = [...get().visibleNodes, ...get().allNodes, ...get().databaseNodes];
      const srcNode = poolNodes.find(n => n.id === data.sourceId || n.publicId === data.sourceId);
      const tgtNode = poolNodes.find(n => n.id === data.targetId || n.publicId === data.targetId);
      const isReal = srcNode?.nodeType === 'REAL' && tgtNode?.nodeType === 'REAL';

      const newLink: GraphEdge = {
        id: `local-edge-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        source: srcNode || data.sourceId,
        target: tgtNode || data.targetId,
        relationshipType: data.relationshipType || 'acquaintance',
        trustScore: data.trustScore ?? 0.5,
        interactionFrequency: data.interactionFrequency ?? 0.5,
        connectorSource: data.connectorSource || 'Manual',
        edgeKind: isReal ? 'REAL_EDGE' : 'DEMO_EDGE',
        edgeType: isReal ? 'REAL_EDGE' : 'DEMO_EDGE',
        weight: Math.round(((data.trustScore ?? 0.5) * 0.6 + (data.interactionFrequency ?? 0.5) * 0.4) * 100) / 100,
      };

      set(s => ({
        allEdges: [...s.allEdges, newLink],
        visibleLinks: [...s.visibleLinks, newLink],
        meta: s.meta ? {
          ...s.meta,
          totalEdges: s.meta.totalEdges + 1,
          realEdges: isReal ? s.meta.realEdges + 1 : s.meta.realEdges,
          demoEdges: !isReal ? s.meta.demoEdges + 1 : s.meta.demoEdges,
        } : null,
      }));
    }
  },

  modifyEdge: async (id, data) => {
    const isSudo = useAuthStore.getState().isAdmin;
    if (get().dataSource === 'api-v2' && isSudo) {
      // ── v2 / Neo4j primary path (SUDO mode: persist to DB) ──────────────
      await updateRelationshipV2(id, {
        relationshipType: data.relationshipType,
        trustScore: data.trustScore,
        interactionFrequency: data.interactionFrequency,
      });
      await get().refreshSubgraph();
    } else {
      // ── Local In-Memory Fallback (Visitor mode) ─────────────────────────
      const updateEdgeObj = (e: GraphEdge) => {
        if (e.id !== id) return e;
        const trust = data.trustScore !== undefined ? data.trustScore : e.trustScore;
        const freq = data.interactionFrequency !== undefined ? data.interactionFrequency : e.interactionFrequency;
        return {
          ...e,
          relationshipType: data.relationshipType || e.relationshipType,
          trustScore: trust,
          interactionFrequency: freq,
          weight: Math.round((trust * 0.6 + freq * 0.4) * 100) / 100,
        };
      };
      set(s => ({
        allEdges: s.allEdges.map(updateEdgeObj),
        visibleLinks: s.visibleLinks.map(updateEdgeObj),
      }));
    }
  },

  removeEdge: async (id) => {
    const isSudo = useAuthStore.getState().isAdmin;
    if (get().dataSource === 'api-v2' && isSudo) {
      // ── v2 / Neo4j primary path (SUDO mode: persist to DB) ──────────────
      await deleteRelationshipV2(id);
      await get().refreshSubgraph();
      await get().refreshDatabase();
    } else {
      // ── Local In-Memory Fallback (Visitor mode) ─────────────────────────
      set(s => ({
        allEdges: s.allEdges.filter(e => e.id !== id),
        visibleLinks: s.visibleLinks.filter(e => e.id !== id),
      }));
    }
  },

  executeMerge: async (sourceId, targetId) => {
    if (get().dataSource === 'api') {
      await mergeIdentities(sourceId, targetId);
      await get().initGraph();
    } else {
      const sourceUser = get().allNodes.find(n => n.id === sourceId)!;
      const targetUser = get().allNodes.find(n => n.id === targetId)!;
      const combinedTags = Array.from(new Set([...(sourceUser.tags || []), ...(targetUser.tags || [])]));

      set(s => ({
        allNodes: s.allNodes
          .map(n => n.id === targetId ? { ...n, tags: combinedTags } : n)
          .filter(n => n.id !== sourceId),
        allEdges: s.allEdges
          .map(e => {
            let src = typeof e.source === 'string' ? e.source : (e.source as any).id;
            let tgt = typeof e.target === 'string' ? e.target : (e.target as any).id;
            if (src === sourceId) src = targetId;
            if (tgt === sourceId) tgt = targetId;
            return { ...e, source: src, target: tgt };
          })
          .filter(e => {
            const src = typeof e.source === 'string' ? e.source : (e.source as any).id;
            const tgt = typeof e.target === 'string' ? e.target : (e.target as any).id;
            return src !== tgt;
          })
      }));
      await get().refreshSubgraph();
    }
  },



  setActivePathIndex: (index: number) => {
    const { tracedPaths, visibleLinks } = get();
    if (index < 0 || index >= tracedPaths.length) return;
    const selected = tracedPaths[index];

    const nodeIds = new Set<string>(selected.nodeIds);
    const edgeIds = new Set<string>();

    selected.links.forEach(l => edgeIds.add(l.id));

    // Also match links in visibleLinks between consecutive node pairs
    for (let i = 0; i < selected.nodeIds.length - 1; i++) {
      const u = selected.nodeIds[i];
      const v = selected.nodeIds[i + 1];
      for (const link of visibleLinks) {
        const src = typeof link.source === 'string' ? link.source : (link.source as any).id;
        const tgt = typeof link.target === 'string' ? link.target : (link.target as any).id;
        if ((src === u && tgt === v) || (src === v && tgt === u)) {
          edgeIds.add(link.id);
        }
      }
    }

    set({
      activePathIndex: index,
      tracedPath: selected.nodes,
      pathCost: selected.totalCost,
      highlightedNodeIds: nodeIds,
      highlightedEdgeIds: edgeIds,
    });
  },

  loadMorePaths: async () => {
    const { lastPathQuery, tracedPaths, hasMorePaths, isLoadingMorePaths, showDemoNodes, activeEdgeTypes, minTrustFilter, excludedNodeIds, visibleNodes, visibleLinks, databaseNodes, allNodes } = get();
    if (!lastPathQuery || !hasMorePaths || isLoadingMorePaths) return;

    set({ isLoadingMorePaths: true });

    try {
      const { fetchPathV2 } = await import('@/services/api');
      const offset = tracedPaths.length;
      const res = await fetchPathV2(
        lastPathQuery.fromId,
        lastPathQuery.toId,
        6,
        showDemoNodes,
        {
          types: activeEdgeTypes,
          minTrust: minTrustFilter,
          exclude: Array.from(excludedNodeIds),
        },
        5,
        offset
      );

      if (res && res.exists && res.paths && res.paths.length > 0) {
        const poolNodes = visibleNodes.length > 0 ? visibleNodes : (databaseNodes.length > 0 ? databaseNodes : allNodes);
        
        const newMappedPaths: PathItemState[] = res.paths.map(p => {
          const pNodes = p.nodeIds.map(id => {
            const v2Node = p.nodes.find(n => n.id === id);
            if (v2Node) return apiNodeV2ToGraph(v2Node);
            return poolNodes.find(n => n.id === id || n.publicId === id);
          }).filter(Boolean) as GraphNode[];

          const pLinks = p.links.map(apiEdgeV2ToGraph);

          return {
            nodeIds: p.nodeIds,
            nodes: pNodes,
            links: pLinks,
            totalCost: p.totalCost,
          };
        });

        // Filter out any duplicate path if returned
        const existingKeys = new Set(tracedPaths.map(tp => tp.nodeIds.join('->')));
        const uniqueNew = newMappedPaths.filter(np => !existingKeys.has(np.nodeIds.join('->')));

        const combinedPaths = [...tracedPaths, ...uniqueNew];

        // Ensure canvas has all nodes and links
        const existingNodeIds = new Set(visibleNodes.map(n => n.id));
        const allNewNodes = uniqueNew.flatMap(p => p.nodes).filter(n => !existingNodeIds.has(n.id));
        const updatedNodes = allNewNodes.length > 0 ? [...visibleNodes, ...allNewNodes] : visibleNodes;

        const existingLinkIds = new Set(visibleLinks.map(l => l.id));
        const allNewLinks = uniqueNew.flatMap(p => p.links).filter(l => !existingLinkIds.has(l.id));
        const updatedLinks = allNewLinks.length > 0 ? [...visibleLinks, ...allNewLinks] : visibleLinks;

        set({
          visibleNodes: updatedNodes,
          visibleLinks: updatedLinks,
          tracedPaths: combinedPaths,
          hasMorePaths: res.hasMore,
          isLoadingMorePaths: false,
        });
      } else {
        set({ hasMorePaths: false, isLoadingMorePaths: false });
      }
    } catch (err) {
      console.error('Failed to load more paths:', err);
      set({ isLoadingMorePaths: false });
    }
  },

  tracePathAction: async (fromId, toId) => {
    try {
      const { dataSource, showDemoNodes, activeEdgeTypes, minTrustFilter, excludedNodeIds, visibleLinks, databaseNodes, visibleNodes, allEdges, allNodes } = get();

      const poolNodes = visibleNodes.length > 0 ? visibleNodes : (databaseNodes.length > 0 ? databaseNodes : allNodes);
      const startNode = poolNodes.find(n => n.id === fromId || n.publicId === fromId);
      const targetNode = poolNodes.find(n => n.id === toId || n.publicId === toId);

      const actualFromId = startNode ? startNode.id : fromId;
      const actualToId = targetNode ? targetNode.id : toId;

      // Source/Destination Exclusion Safety Check
      if (excludedNodeIds.has(actualFromId) || excludedNodeIds.has(actualToId)) {
        set({
          tracedPath: [],
          pathCost: null,
          tracedPaths: [],
          activePathIndex: 0,
          hasMorePaths: false,
          lastPathQuery: null,
          highlightedNodeIds: new Set(),
          highlightedEdgeIds: new Set(),
        });
        return;
      }

      // ── 1. OFFLINE FALLBACK: In-memory BFS when dataSource === 'dummy' ───
      if (dataSource === 'dummy') {
        const linksToSearch = visibleLinks.length > 0 ? visibleLinks : allEdges;
        if (linksToSearch.length > 0) {
          const queue: { curr: string; path: string[]; edges: string[] }[] = [{ curr: actualFromId, path: [actualFromId], edges: [] }];
          const visited = new Set<string>([actualFromId]);
          let foundInMemory: { path: string[]; edges: string[] } | null = null;

          while (queue.length > 0) {
            const { curr, path, edges } = queue.shift()!;
            if (curr === actualToId) {
              foundInMemory = { path, edges };
              break;
            }

            for (const l of linksToSearch) {
              const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
              const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
              let next: string | null = null;
              if (s === curr) next = t;
              else if (t === curr) next = s;

              if (next && !visited.has(next) && !excludedNodeIds.has(next)) {
                visited.add(next);
                queue.push({ curr: next, path: [...path, next], edges: [...edges, l.id] });
              }
            }
          }

          if (foundInMemory) {
            const pathNodes = foundInMemory.path.map(id => poolNodes.find(n => n.id === id || n.publicId === id)).filter(Boolean) as GraphNode[];
            const nodeIds = new Set<string>(foundInMemory.path);
            const edgeIds = new Set<string>(foundInMemory.edges);

            const singlePathState: PathItemState = {
              nodeIds: foundInMemory.path,
              nodes: pathNodes,
              links: [],
              totalCost: pathNodes.length - 1,
            };

            set({
              tracedPath: pathNodes,
              pathCost: pathNodes.length - 1,
              tracedPaths: [singlePathState],
              activePathIndex: 0,
              hasMorePaths: false,
              lastPathQuery: { fromId: actualFromId, toId: actualToId },
              highlightedNodeIds: nodeIds,
              highlightedEdgeIds: edgeIds,
            });
            return;
          }
        }
      }

      // ── 2. SLOW-PATH: API Query when route missing from local memory ──────
      if (dataSource === 'api-v2') {
        const { fetchPathV2 } = await import('@/services/api');
        const res = await fetchPathV2(actualFromId, actualToId, 6, showDemoNodes, {
          types: activeEdgeTypes,
          minTrust: minTrustFilter,
          exclude: Array.from(excludedNodeIds),
        }, 5, 0);

        if (res && res.exists && res.paths && res.paths.length > 0) {
          const mappedPaths: PathItemState[] = res.paths.map(p => {
            const pNodes = p.nodeIds.map(id => {
              const v2Node = p.nodes.find(n => n.id === id);
              if (v2Node) return apiNodeV2ToGraph(v2Node);
              return poolNodes.find(n => n.id === id || n.publicId === id);
            }).filter(Boolean) as GraphNode[];

            const pLinks = p.links.map(apiEdgeV2ToGraph);

            return {
              nodeIds: p.nodeIds,
              nodes: pNodes,
              links: pLinks,
              totalCost: p.totalCost,
            };
          });

          // Add any missing nodes to visibleNodes
          const existingNodeIds = new Set(visibleNodes.map(n => n.id));
          const allNewNodes = mappedPaths.flatMap(p => p.nodes).filter(n => !existingNodeIds.has(n.id));
          const updatedNodes = allNewNodes.length > 0 ? [...visibleNodes, ...allNewNodes] : visibleNodes;

          const existingLinkIds = new Set(visibleLinks.map(l => l.id));
          const allNewLinks = mappedPaths.flatMap(p => p.links).filter(l => !existingLinkIds.has(l.id));
          const updatedLinks = allNewLinks.length > 0 ? [...visibleLinks, ...allNewLinks] : visibleLinks;

          set({
            visibleNodes: updatedNodes,
            visibleLinks: updatedLinks,
            tracedPaths: mappedPaths,
            activePathIndex: 0,
            hasMorePaths: res.hasMore,
            lastPathQuery: { fromId: actualFromId, toId: actualToId },
          });

          get().setActivePathIndex(0);
          return;
        }
      }

      set({
        tracedPath: [],
        pathCost: null,
        tracedPaths: [],
        activePathIndex: 0,
        hasMorePaths: false,
        lastPathQuery: null,
        highlightedNodeIds: new Set(),
        highlightedEdgeIds: new Set(),
      });
    } catch (err) {
      console.error('Failed to trace path:', err);
      set({
        tracedPath: [],
        pathCost: null,
        tracedPaths: [],
        activePathIndex: 0,
        hasMorePaths: false,
        lastPathQuery: null,
        highlightedNodeIds: new Set(),
        highlightedEdgeIds: new Set(),
      });
    }
  },

  clearTracedPath: () => {
    set({
      tracedPath: [],
      pathCost: null,
      tracedPaths: [],
      activePathIndex: 0,
      hasMorePaths: false,
      lastPathQuery: null,
      highlightedNodeIds: new Set(),
      highlightedEdgeIds: new Set(),
    });
  },

  excludeNode: (id: string) => {
    const next = new Set(get().excludedNodeIds);
    next.add(id);
    const currentPaths = get().tracedPaths;
    const pathContainsExcluded = currentPaths.some(p => p.nodeIds.includes(id));
    if (pathContainsExcluded) {
      get().clearTracedPath();
    }
    set({ excludedNodeIds: next });
  },

  includeNode: (id: string) => {
    const next = new Set(get().excludedNodeIds);
    next.delete(id);
    set({ excludedNodeIds: next });
  },

  clearExcludedNodes: () => {
    set({ excludedNodeIds: new Set() });
  },
}));
