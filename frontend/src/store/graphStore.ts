import { create } from 'zustand';
import { GraphNode, GraphEdge, SubgraphMeta } from '@/types/graph';
import {
  ALL_NODES,
  ALL_EDGES,
  getSubgraph,
  computeMeta,
} from '@/utils/dummyData';

interface GraphState {
  // Graph data
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  visibleNodes: GraphNode[];
  visibleLinks: GraphEdge[];
  meta: SubgraphMeta | null;

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
  refreshSubgraph: () => void;
}

const ROOT_NODE_ID = 'r-001';

function buildSubgraph(
  rootNodeId: string,
  hopDepth: number,
  showDemoNodes: boolean
) {
  const { nodes, links } = getSubgraph(
    rootNodeId,
    hopDepth,
    showDemoNodes,
    ALL_NODES,
    ALL_EDGES
  );
  const meta = computeMeta(nodes, links, rootNodeId, hopDepth);
  return { nodes, links, meta };
}

export const useGraphStore = create<GraphState>((set, get) => {
  const { nodes, links, meta } = buildSubgraph(ROOT_NODE_ID, 1, true);

  return {
    allNodes: ALL_NODES,
    allEdges: ALL_EDGES,
    visibleNodes: nodes,
    visibleLinks: links,
    meta,

    rootNodeId: ROOT_NODE_ID,
    hopDepth: 1,
    showDemoNodes: true,
    selectedNode: null,
    hoveredNode: null,
    hoveredEdge: null,
    searchQuery: '',
    highlightedNodeIds: new Set(),
    highlightedEdgeIds: new Set(),
    isLoading: false,

    setRootNode: (nodeId) => {
      const { hopDepth, showDemoNodes } = get();
      const { nodes, links, meta } = buildSubgraph(nodeId, hopDepth, showDemoNodes);
      set({ rootNodeId: nodeId, visibleNodes: nodes, visibleLinks: links, meta });
    },

    setHopDepth: (depth) => {
      const { rootNodeId, showDemoNodes } = get();
      set({ isLoading: true });
      // Small timeout to show loading state
      setTimeout(() => {
        const { nodes, links, meta } = buildSubgraph(rootNodeId, depth, showDemoNodes);
        set({ hopDepth: depth, visibleNodes: nodes, visibleLinks: links, meta, isLoading: false });
      }, 200);
    },

    toggleDemoNodes: () => {
      const { rootNodeId, hopDepth, showDemoNodes } = get();
      const next = !showDemoNodes;
      const { nodes, links, meta } = buildSubgraph(rootNodeId, hopDepth, next);
      set({ showDemoNodes: next, visibleNodes: nodes, visibleLinks: links, meta });
    },

    selectNode: (node) => set({ selectedNode: node }),

    setHoveredNode: (node) => set({ hoveredNode: node }),

    setHoveredEdge: (edge) => set({ hoveredEdge: edge }),

    setSearchQuery: (q) => set({ searchQuery: q }),

    resetGraph: () => {
      const { nodes, links, meta } = buildSubgraph(ROOT_NODE_ID, 1, true);
      set({
        rootNodeId: ROOT_NODE_ID,
        hopDepth: 1,
        showDemoNodes: true,
        selectedNode: null,
        hoveredNode: null,
        hoveredEdge: null,
        searchQuery: '',
        highlightedNodeIds: new Set(),
        highlightedEdgeIds: new Set(),
        visibleNodes: nodes,
        visibleLinks: links,
        meta,
      });
    },

    highlightNeighbors: (nodeId) => {
      const { visibleLinks, allNodes } = get();
      const nodeIds = new Set<string>([nodeId]);
      const edgeIds = new Set<string>();

      for (const edge of visibleLinks) {
        const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
        if (src === nodeId) { nodeIds.add(tgt); edgeIds.add(edge.id); }
        if (tgt === nodeId) { nodeIds.add(src); edgeIds.add(edge.id); }
      }

      set({ highlightedNodeIds: nodeIds, highlightedEdgeIds: edgeIds });
    },

    clearHighlights: () =>
      set({ highlightedNodeIds: new Set(), highlightedEdgeIds: new Set() }),

    refreshSubgraph: () => {
      const { rootNodeId, hopDepth, showDemoNodes } = get();
      const { nodes, links, meta } = buildSubgraph(rootNodeId, hopDepth, showDemoNodes);
      set({ visibleNodes: nodes, visibleLinks: links, meta });
    },
  };
});
