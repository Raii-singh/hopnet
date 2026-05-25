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
        dataSource: 'api-v2', // keep data source as api-v2 to avoid dummy fallback elsewhere
        rootNodeId: '',
        isApiHealthy: false,
        visibleNodes: [],
        visibleLinks: [],
        allNodes: [],
        allEdges: [],
        databaseNodes: [],
        meta: EMPTY_META,
      });

    } else if (activeProvider === 'imdb') {
      try {
        set({ isLoading: true });
        // fetchImdbGraph handles offline fallback internally
        const data = await fetchImdbGraph();
        if (data && data.nodes.length > 0) {
          const allNodes = data.nodes.map(apiNodeToGraph);
          const allEdges = data.links.map(apiEdgeToGraph);
          
          // Set Robert Downey Jr as default root if present
          const rdj = allNodes.find(n => n.fullName?.toLowerCase().includes('robert downey jr'));
          const rootNodeId = rdj?.id ?? allNodes[0]?.id ?? '';

          set({
            allNodes,
            allEdges,
            dataSource: healthy ? 'api' : 'dummy',
            rootNodeId,
            hopDepth: 3, // Default to showing full network
          });

          await get().refreshSubgraph();
        } else {
          console.warn('[HOPNet] IMDb graph empty — run the preprocessing pipeline first.');
          set({ dataSource: 'api', isLoading: false });
        }
      } catch (err) {
        console.warn('[HOPNet] IMDb init failed completely:', err);
        set({ dataSource: 'api', isLoading: false, isApiHealthy: false });
      }
    }
  },

  // ── Refresh subgraph from API or dummy ──────────────────────
  refreshSubgraph: async () => {
    const { rootNodeId, hopDepth, showDemoNodes, dataSource, activeProvider, activeEdgeTypes, minTrustFilter } = get();
    set({ isLoading: true });

    try {
      if (activeProvider === 'college') {
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

        const data = await fetchGraphV2(rootNodeId, hopDepth, showDemoNodes, { types: activeEdgeTypes, minTrust: minTrustFilter });
        let visibleNodes = data.nodes.map(apiNodeV2ToGraph);
        const visibleLinks = data.links.map(apiEdgeV2ToGraph);

        // Include ONLY truly isolated database entries (0 total connections in Neo4j) as floating visual anchors
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        for (const dbNode of dbNodes) {
          if (!visibleNodeIds.has(dbNode.id)) {
            if (!showDemoNodes && dbNode.nodeType === 'DEMO') continue;
            // Only float nodes that legitimately have ZERO relationships in the database
            const totalConn = showDemoNodes ? (dbNode.connectionCount ?? 0) : (dbNode.realConnections ?? dbNode.connectionCount ?? 0);
            if (totalConn === 0) {
              visibleNodes.push({
                ...dbNode,
                hopDistance: 99,
              });
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
      } else if (activeProvider === 'imdb') {
        // IMDb uses client-side BFS traversal from loaded allNodes & allEdges
        if (hopDepth === 3) {
          // Show full network (no BFS depth limit)
          const meta = computeMeta(get().allNodes, get().allEdges, rootNodeId, hopDepth);
          set({ visibleNodes: get().allNodes, visibleLinks: get().allEdges, meta });
        } else {
          const { nodes, links, meta } = buildDummySubgraph(rootNodeId, hopDepth, false, get().allNodes, get().allEdges);
          set({ visibleNodes: nodes, visibleLinks: links, meta });
        }
      } else {
        const { nodes, links, meta } = buildDummySubgraph(rootNodeId, hopDepth, showDemoNodes, get().allNodes, get().allEdges);
        set({ visibleNodes: nodes, visibleLinks: links, meta });
      }
    } catch (err) {
      console.error('[refreshSubgraph]', err);
      if (activeProvider === 'college') {
        set({ visibleNodes: [], visibleLinks: [], meta: EMPTY_META });
      } else if (activeProvider === 'imdb') {
        const { nodes, links, meta } = buildDummySubgraph(rootNodeId, hopDepth, false, get().allNodes, get().allEdges);
        set({ visibleNodes: nodes, visibleLinks: links, meta });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  refreshDatabase: async () => {
    const { activeProvider, dataSource } = get();
    if (activeProvider === 'college' && dataSource === 'api-v2') {
      try {
        const { fetchPersonsV2 } = await import('@/services/api');
        const res = await fetchPersonsV2(500);
        const databaseNodes = res.data.map(apiNodeV2ToGraph);
        set({ databaseNodes });
      } catch (err) {
        console.error('[refreshDatabase] Failed to fetch V2 persons:', err);
      }
    } else {
      // Fallback for IMDb or dummy states
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

  resetGraph: () => {
    const { dataSource, allNodes, activeProvider } = get();
    // For v2 mode, the current rootNodeId is already the correct UUID.
    // For dummy mode, reset to static root.
    const currentRootNodeId = get().rootNodeId;
    const rootNodeId = dataSource === 'dummy'
      ? ROOT_DUMMY
      : dataSource === 'api-v2'
        ? currentRootNodeId
        : allNodes.find(n => n.nodeType === 'REAL')?.id ?? ROOT_DUMMY;

    set({
      rootNodeId,
      hopDepth: 1,
      showDemoNodes: getCapabilities(activeProvider).hasDemoNodes,
      selectedNode: null,
      hoveredNode: null,
      hoveredEdge: null,
      searchQuery: '',
      highlightedNodeIds: new Set(),
      highlightedEdgeIds: new Set(),
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
    if (get().dataSource === 'api-v2') {
      // ── v2 / Neo4j primary path ─────────────────────────────────────────
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
      // Requirement 3: If graph had no primary node, make newly created person initial primary node
      if (!get().primaryNodeId && res && res.id) {
        await get().setPrimaryNode(res.id);
      } else {
        await get().refreshSubgraph();
        await get().refreshDatabase();
      }
    } else if (get().dataSource === 'api') {
      // ── v1 Prisma migration fallback (TEMPORARY) ────────────────────────
      await createUserNode(data);
      await get().initGraph();
    } else {
      const count = get().allNodes.length;
      const publicId = data.nodeType === 'REAL' ? `HNP-000${count + 1}` : `DNP-000${count + 1}`;
      const newNode: GraphNode = {
        id: `local-${count + 1}`,
        publicId,
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        company: data.company,
        cluster: data.cluster,
        influenceScore: data.influenceScore ?? 10,
        connectionCount: 0,
        realConnections: 0,
        demoConnections: 0,
        tags: data.tags || [],
        sourceConnectors: data.sourceConnectors || ['Manual'],
        metadata: data.metadata || {},
        nodeType: data.nodeType,
      };
      set(s => ({ allNodes: [...s.allNodes, newNode] }));
      if (!get().primaryNodeId) {
        await get().setPrimaryNode(newNode.id);
      } else {
        await get().refreshSubgraph();
      }
    }
  },

  modifyUserNode: async (id, data) => {
    if (get().dataSource === 'api-v2') {
      // ── v2 / Neo4j primary path ─────────────────────────────────────────
      // nodeType is immutable — strip it from the update payload.
      // The service will reject nodeType changes; stripping avoids noise.
      const { nodeType: _nt, id: _id, publicId: _pid, createdAt: _ca,
              updatedAt: _ua, deletedAt: _da, createdBy: _cb, ...safeUpdates } = data;
      await updatePersonV2(id, safeUpdates);
      await get().refreshSubgraph();
      await get().refreshDatabase();
    } else if (get().dataSource === 'api') {
      // ── v1 Prisma migration fallback (TEMPORARY) ────────────────────────
      await updateUserNode(id, data);
      await get().initGraph();
    } else {
      set(s => ({
        allNodes: s.allNodes.map(n => n.id === id ? { ...n, ...data } : n)
      }));
      await get().refreshSubgraph();
    }
  },

  removeUserNode: async (id) => {
    if (get().dataSource === 'api-v2') {
      // ── v2 / Neo4j primary path ─────────────────────────────────────────
      await deletePersonV2(id);
      
      // If we just deleted the primary node, reset primary node preference gracefully
      if (get().primaryNodeId === id) {
        await get().setPrimaryNode(null);
      }

      await get().refreshSubgraph();
      await get().refreshDatabase();
    } else if (get().dataSource === 'api') {
      // ── v1 Prisma migration fallback (TEMPORARY) ────────────────────────
      await deleteUserNode(id);
      await get().initGraph();
    } else {
      set(s => ({
        allNodes: s.allNodes.filter(n => n.id !== id),
        allEdges: s.allEdges.filter(e => {
          const src = typeof e.source === 'string' ? e.source : e.source.id;
          const tgt = typeof e.target === 'string' ? e.target : e.target.id;
          return src !== id && tgt !== id;
        })
      }));
      await get().refreshSubgraph();
    }
  },

  createNewEdge: async (data) => {
    if (get().dataSource === 'api-v2') {
      // ── v2 / Neo4j primary path ─────────────────────────────────────────
      // Service enforces: DEMO→REAL is forbidden, duplicate check, atomicity.
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
    } else if (get().dataSource === 'api') {
      // ── v1 Prisma migration fallback (TEMPORARY) ────────────────────────
      await createRelationship(data);
      await get().initGraph();
    } else {
      const count = get().allEdges.length;
      const srcNode = get().allNodes.find(n => n.id === data.sourceId)!;
      const tgtNode = get().allNodes.find(n => n.id === data.targetId)!;
      const isReal = srcNode.nodeType === 'REAL' && tgtNode.nodeType === 'REAL';

      const newLink: GraphEdge = {
        id: `local-edge-${count + 1}`,
        source: data.sourceId,
        target: data.targetId,
        relationshipType: data.relationshipType || 'acquaintance',
        trustScore: data.trustScore ?? 0.5,
        interactionFrequency: data.interactionFrequency ?? 0.5,
        connectorSource: data.connectorSource || 'Manual',
        edgeType: isReal ? 'REAL_EDGE' : 'DEMO_EDGE',
        weight: Math.round(((data.trustScore ?? 0.5) * 0.6 + (data.interactionFrequency ?? 0.5) * 0.4) * 100) / 100,
      };

      set(s => ({ allEdges: [...s.allEdges, newLink] }));
      await get().refreshSubgraph();
    }
  },

  modifyEdge: async (id, data) => {
    if (get().dataSource === 'api-v2') {
      // ── v2 / Neo4j primary path ─────────────────────────────────────────
      await updateRelationshipV2(id, {
        relationshipType: data.relationshipType,
        trustScore: data.trustScore,
        interactionFrequency: data.interactionFrequency,
      });
      await get().refreshSubgraph();
    } else if (get().dataSource === 'api') {
      // ── v1 Prisma migration fallback (TEMPORARY) ────────────────────────
      await updateRelationship(id, data);
      await get().initGraph();
    } else {
      set(s => ({
        allEdges: s.allEdges.map(e => {
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
        })
      }));
      await get().refreshSubgraph();
    }
  },

  removeEdge: async (id) => {
    if (get().dataSource === 'api-v2') {
      // ── v2 / Neo4j primary path ─────────────────────────────────────────
      await deleteRelationshipV2(id);
      await get().refreshSubgraph();
      await get().refreshDatabase();
    } else if (get().dataSource === 'api') {
      // ── v1 Prisma migration fallback (TEMPORARY) ────────────────────────
      await deleteRelationship(id);
      await get().initGraph();
    } else {
      set(s => ({
        allEdges: s.allEdges.filter(e => e.id !== id)
      }));
      await get().refreshSubgraph();
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

  tracePathAction: async (fromId, toId) => {
    set({ isLoading: true });
    try {
      let res = await fetchPath(fromId, toId);

      // Client-side BFS fallback if API path is unavailable or local mode
      if (!res || !res.path || res.path.length === 0) {
        const allEdges = get().allEdges;
        const queue: string[][] = [[fromId]];
        const visited = new Set<string>([fromId]);
        let foundPath: string[] | null = null;

        while (queue.length > 0) {
          const currPath = queue.shift()!;
          const curr = currPath[currPath.length - 1];

          if (curr === toId) {
            foundPath = currPath;
            break;
          }

          for (const e of allEdges) {
            const src = typeof e.source === 'string' ? e.source : (e.source as any).id;
            const tgt = typeof e.target === 'string' ? e.target : (e.target as any).id;
            let nextId: string | null = null;
            if (src === curr) nextId = tgt;
            else if (tgt === curr) nextId = src;

            if (nextId && !visited.has(nextId)) {
              visited.add(nextId);
              queue.push([...currPath, nextId]);
            }
          }
        }

        if (foundPath) {
          res = { path: foundPath, totalCost: foundPath.length - 1 };
        }
      }

      if (res && res.path && res.path.length > 0) {
        const allNodes = get().allNodes;
        const mappedPath = res.path
          .map(id => allNodes.find(n => n.id === id || n.publicId === id))
          .filter(Boolean) as GraphNode[];

        const nodeIds = new Set(res.path);
        const edgeIds = new Set<string>();

        for (let i = 0; i < res.path.length - 1; i++) {
          const src = res.path[i];
          const tgt = res.path[i + 1];
          const edge = get().allEdges.find(e => {
            const s = typeof e.source === 'string' ? e.source : (e.source as any).id;
            const t = typeof e.target === 'string' ? e.target : (e.target as any).id;
            return (s === src && t === tgt) || (s === tgt && t === src);
          });
          if (edge) edgeIds.add(edge.id);
        }

        set({
          tracedPath: mappedPath,
          pathCost: res.totalCost,
          highlightedNodeIds: nodeIds,
          highlightedEdgeIds: edgeIds,
        });
      } else {
        set({
          tracedPath: [],
          pathCost: null,
          highlightedNodeIds: new Set(),
          highlightedEdgeIds: new Set(),
        });
      }
    } catch (err) {
      console.error('Failed to trace path:', err);
      set({
        tracedPath: [],
        pathCost: null,
        highlightedNodeIds: new Set(),
        highlightedEdgeIds: new Set(),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  clearTracedPath: () => {
    set({
      tracedPath: [],
      pathCost: null,
      highlightedNodeIds: new Set(),
      highlightedEdgeIds: new Set(),
    });
  },
}));
