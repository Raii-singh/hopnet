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
  dataSource: 'dummy' | 'api';
  isApiHealthy: boolean;

  // View state
  rootNodeId: string;
  hopDepth: number;
  showDemoNodes: boolean;
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;
  hoveredEdge: GraphEdge | null;
  searchQuery: string;
  highlightedNodeIds: Set<string>;
  highlightedEdgeIds: Set<string>;

  // WORKSPACE MODE (V2.5) — only available for providers with hasCRUD
  workspaceMode: boolean;
  visualConnectMode: boolean;
  connectorSourceNode: GraphNode | null;
  focusMode: boolean;

  // UI state
  isLoading: boolean;

  // Actions
  initGraph: () => Promise<void>;
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

const { nodes: initNodes, links: initLinks, meta: initMeta } = buildDummySubgraph(ROOT_DUMMY, 1, true, ALL_NODES, ALL_EDGES);


export const useGraphStore = create<GraphState>((set, get) => ({
  allNodes: ALL_NODES,
  allEdges: ALL_EDGES,
  visibleNodes: initNodes,
  visibleLinks: initLinks,
  meta: initMeta,

  // Provider defaults
  activeProvider: DEFAULT_PROVIDER,
  providerCapabilities: getCapabilities(DEFAULT_PROVIDER),

  dataSource: 'dummy',
  isApiHealthy: false,

  rootNodeId: ROOT_DUMMY,
  hopDepth: 1,
  showDemoNodes: true,
  selectedNode: null,
  hoveredNode: null,
  hoveredEdge: null,
  searchQuery: '',
  highlightedNodeIds: new Set(),
  highlightedEdgeIds: new Set(),

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
      hopDepth: 1,

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

  // ── Init: probe API, load live data if available ────────────
  initGraph: async () => {
    const { activeProvider } = get();
    const healthy = await checkHealth();
    set({ isApiHealthy: healthy });

    if (activeProvider === 'college') {
      if (!healthy) {
        // Fall back to dummy college data
        const { nodes: initN, links: initL, meta: initM } = buildDummySubgraph(ROOT_DUMMY, 1, true, ALL_NODES, ALL_EDGES);
        set({
          dataSource: 'dummy',
          allNodes: ALL_NODES,
          allEdges: ALL_EDGES,
          visibleNodes: initN,
          visibleLinks: initL,
          meta: initM,
          rootNodeId: ROOT_DUMMY,
        });
        return;
      }

      try {
        const { users } = await fetchUsers();
        const allNodes = users.map(apiNodeToGraph);
        const firstReal = allNodes.find(n => n.nodeType === 'REAL');
        const rootNodeId = firstReal?.id ?? allNodes[0]?.id ?? ROOT_DUMMY;

        set({ allNodes, dataSource: 'api', rootNodeId });
        await get().refreshSubgraph();
      } catch (err) {
        console.warn('[HOPNet] College API init failed, using dummy data:', err);
        const { nodes: initN, links: initL, meta: initM } = buildDummySubgraph(ROOT_DUMMY, 1, true, ALL_NODES, ALL_EDGES);
        set({
          dataSource: 'dummy',
          allNodes: ALL_NODES,
          allEdges: ALL_EDGES,
          visibleNodes: initN,
          visibleLinks: initL,
          meta: initM,
          rootNodeId: ROOT_DUMMY,
          isApiHealthy: false,
        });
      }
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
    const { rootNodeId, hopDepth, showDemoNodes, dataSource, activeProvider } = get();
    set({ isLoading: true });

    try {
      if (activeProvider === 'imdb') {
        // IMDb uses client-side BFS traversal from loaded allNodes & allEdges
        if (hopDepth === 3) {
          // Show full network (no BFS depth limit)
          const meta = computeMeta(get().allNodes, get().allEdges, rootNodeId, hopDepth);
          set({ visibleNodes: get().allNodes, visibleLinks: get().allEdges, meta });
        } else {
          const { nodes, links, meta } = buildDummySubgraph(rootNodeId, hopDepth, false, get().allNodes, get().allEdges);
          set({ visibleNodes: nodes, visibleLinks: links, meta });
        }
      } else if (dataSource === 'api') {
        const data = await fetchGraph(rootNodeId, hopDepth, showDemoNodes, activeProvider);
        const visibleNodes = data.nodes.map(apiNodeToGraph);
        const visibleLinks = data.links.map(apiEdgeToGraph);
        const meta: SubgraphMeta = {
          totalNodes: data.meta.totalNodes,
          totalEdges: data.meta.totalEdges,
          realNodes: data.meta.realNodes,
          demoNodes: data.meta.demoNodes,
          realEdges: data.meta.realEdges,
          demoEdges: data.meta.demoEdges,
          avgHopCount: data.meta.avgHopCount,
          constraintActive: data.meta.constraintActive,
        };
        set({ visibleNodes, visibleLinks, meta });
      } else {
        const { nodes, links, meta } = buildDummySubgraph(rootNodeId, hopDepth, showDemoNodes, get().allNodes, get().allEdges);
        set({ visibleNodes: nodes, visibleLinks: links, meta });
      }
    } catch (err) {
      console.error('[refreshSubgraph]', err);
      if (activeProvider === 'college') {
        const { nodes, links, meta } = buildDummySubgraph(ROOT_DUMMY, 1, true, ALL_NODES, ALL_EDGES);
        set({ visibleNodes: nodes, visibleLinks: links, meta });
      } else if (activeProvider === 'imdb') {
        const { nodes, links, meta } = buildDummySubgraph(rootNodeId, hopDepth, false, get().allNodes, get().allEdges);
        set({ visibleNodes: nodes, visibleLinks: links, meta });
      }
    } finally {
      set({ isLoading: false });
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

  resetGraph: () => {
    const { dataSource, allNodes, activeProvider } = get();
    const rootNodeId = dataSource === 'dummy'
      ? ROOT_DUMMY
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
    if (get().dataSource === 'api') {
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
      await get().refreshSubgraph();
    }
  },

  modifyUserNode: async (id, data) => {
    if (get().dataSource === 'api') {
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
    if (get().dataSource === 'api') {
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
    if (get().dataSource === 'api') {
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
    if (get().dataSource === 'api') {
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
    if (get().dataSource === 'api') {
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
      const res = await fetchPath(fromId, toId);
      if (res && res.path) {
        const mappedPath = res.path
          .map(id => get().allNodes.find(n => n.id === id))
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
