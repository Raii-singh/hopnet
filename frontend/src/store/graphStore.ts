import { create } from 'zustand';
import { GraphNode, GraphEdge, SubgraphMeta } from '@/types/graph';
import {
  ALL_NODES,
  ALL_EDGES,
  getSubgraph as getDummySubgraph,
  computeMeta,
} from '@/utils/dummyData';
import { fetchGraph, fetchUsers, checkHealth, ApiNode, ApiEdge } from '@/services/api';

// ── Type adapters: API → internal GraphNode/GraphEdge ─────────

function apiNodeToGraph(n: ApiNode): GraphNode {
  return {
    id: n.id,
    name: n.name,
    type: n.type,
    cluster: n.cluster ?? undefined,
    influenceScore: n.influenceScore,
    connectionCount: n.connectionCount,
    realConnections: n.realConnections,
    demoConnections: n.demoConnections,
    // Derived fields not in API — set defaults
    bio: undefined,
    tags: [],
    centrality: 0,
    avgPathDistance: undefined,
    hopDistance: n.hopDistance,
  };
}

function apiEdgeToGraph(e: ApiEdge): GraphEdge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    edgeType: e.edgeType,
    weight: e.weight,
    trustScore: e.trustScore,
    interactionStrength: e.interactionStrength,
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
}

// ── Dummy data helpers ────────────────────────────────────────

const ROOT_DUMMY = 'r-001';

function buildDummySubgraph(rootNodeId: string, hopDepth: number, showDemoNodes: boolean) {
  const { nodes, links } = getDummySubgraph(rootNodeId, hopDepth, showDemoNodes, ALL_NODES, ALL_EDGES);
  const meta = computeMeta(nodes, links, rootNodeId, hopDepth);
  return { nodes, links, meta };
}

// ── Store ─────────────────────────────────────────────────────

const { nodes: initNodes, links: initLinks, meta: initMeta } = buildDummySubgraph(ROOT_DUMMY, 1, true);

export const useGraphStore = create<GraphState>((set, get) => ({
  allNodes: ALL_NODES,
  allEdges: ALL_EDGES,
  visibleNodes: initNodes,
  visibleLinks: initLinks,
  meta: initMeta,

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
  isLoading: false,

  // ── Init: probe API, load live data if available ────────────
  initGraph: async () => {
    const healthy = await checkHealth();
    set({ isApiHealthy: healthy });

    if (!healthy) {
      // Stay on dummy data
      set({ dataSource: 'dummy' });
      return;
    }

    // Fetch all users for allNodes
    try {
      const { users } = await fetchUsers();
      const allNodes = users.map(apiNodeToGraph);
      const firstReal = allNodes.find(n => n.type === 'REAL');
      const rootNodeId = firstReal?.id ?? allNodes[0]?.id ?? ROOT_DUMMY;

      set({ allNodes, dataSource: 'api', rootNodeId });

      // Load 1-hop subgraph
      await get().refreshSubgraph();
    } catch (err) {
      console.warn('[HOPNet] API init failed, using dummy data:', err);
      set({ dataSource: 'dummy', isApiHealthy: false });
    }
  },

  // ── Refresh subgraph from API or dummy ──────────────────────
  refreshSubgraph: async () => {
    const { rootNodeId, hopDepth, showDemoNodes, dataSource } = get();
    set({ isLoading: true });

    try {
      if (dataSource === 'api') {
        const data = await fetchGraph(rootNodeId, hopDepth, showDemoNodes);
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
        const { nodes, links, meta } = buildDummySubgraph(rootNodeId, hopDepth, showDemoNodes);
        set({ visibleNodes: nodes, visibleLinks: links, meta });
      }
    } catch (err) {
      console.error('[refreshSubgraph]', err);
      // Fall back to dummy on error
      const { nodes, links, meta } = buildDummySubgraph(ROOT_DUMMY, 1, true);
      set({ visibleNodes: nodes, visibleLinks: links, meta });
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
    const rootNodeId = get().dataSource === 'dummy'
      ? ROOT_DUMMY
      : get().allNodes.find(n => n.type === 'REAL')?.id ?? ROOT_DUMMY;

    set({
      rootNodeId,
      hopDepth: 1,
      showDemoNodes: true,
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
}));
