'use client';

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
// @ts-ignore
import { forceX, forceY, forceCollide } from 'd3-force';
import { useGraphStore } from '@/store/graphStore';
import { GraphNode, GraphEdge } from '@/types/graph';
import NodeTooltip from '@/components/ui/NodeTooltip';
import EdgeTooltip from '@/components/ui/EdgeTooltip';
import NodeProfileModal from '@/components/modals/NodeProfileModal';
import EdgeEditorModal from '@/components/modals/EdgeEditorModal';
import NodeCreateModal from '@/components/modals/NodeCreateModal';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-void)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <span className="text-label" style={{ color: 'var(--silver-400)' }}>Syncing Spatial Matrix…</span>
      </div>
    </div>
  ),
});

// ── College cluster palette (Faded Muted Pastels) ────────────────────────────
function getCollegeClusterColor(cluster?: string): string {
  if (!cluster) return '#94a3b8';
  switch (cluster.toLowerCase()) {
    case 'tech': return '#60a5fa';     // Soft pastel sky blue
    case 'finance': return '#34d399';  // Soft pastel mint green
    case 'health': return '#f87171';   // Soft pastel coral rose
    case 'venture': return '#fbbf24';  // Soft pastel warm amber
    case 'academia': return '#a78bfa'; // Soft pastel lavender
    default: return '#94a3b8';
  }
}

// ── IMDb franchise palette (Faded Muted Pastels) ──────────────────────────────
function getImdbClusterColor(cluster?: string): string {
  if (!cluster) return '#fbbf24';
  switch (cluster.toUpperCase()) {
    case 'MCU': return '#f87171';   // soft rose
    case 'GOT': return '#c4b5fd';   // soft lavender
    case 'HP': return '#7dd3fc';   // soft sky blue
    case 'SW': return '#5eead4';   // soft teal
    case 'DC': return '#fdba74';   // soft peach
    case 'ACTION': return '#fde047';   // soft amber
    case 'GENZ': return '#f472b6';   // soft pink
    case 'DRAMA': return '#86efac';   // soft sage green
    default: return '#94a3b8';
  }
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function GraphCanvas() {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoveredNodeRef = useRef<any>(null); // track actual graph node object for pinning
  const hasInitialZoomedRef = useRef(false);

  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [activeSmallCardNode, setActiveSmallCardNode] = useState<GraphNode | null>(null);

  const {
    visibleNodes, visibleLinks, databaseNodes, isApiHealthy,
    selectedNode, hoveredNode, hoveredEdge,
    highlightedNodeIds, highlightedEdgeIds,
    isLoading,
    workspaceMode, visualConnectMode, connectorSourceNode,
    activeProvider, providerCapabilities,
    selectNode, setHoveredNode, setHoveredEdge, clearHighlights,
    setConnectorSourceNode, setVisualConnectMode,
    rootNodeId, primaryNodeId, setPrimaryNode,
  } = useGraphStore();

  const tooltipContainerRef = useRef<HTMLDivElement>(null);
  const [editingEdge, setEditingEdge] = useState<GraphEdge | null>(null);
  const [creatingEdgeData, setCreatingEdgeData] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isImdb = activeProvider === 'imdb';
  const accentColor = providerCapabilities.accentColor;

  function getClusterColor(cluster?: string): string {
    return isImdb ? getImdbClusterColor(cluster) : getCollegeClusterColor(cluster);
  }

  const [mouseGraphPos, setMouseGraphPos] = useState<{ x: number; y: number } | null>(null);

  // Helper to reliably center & zoom in close to the graph network
  const zoomInClose = useCallback(() => {
    if (!graphRef.current) return;
    const fg = graphRef.current;
    fg.zoomToFit?.(300, 30);
    setTimeout(() => {
      const z = fg.zoom?.();
      if (z && z > 0) {
        fg.zoom?.(z * 2.5, 400);
      }
    }, 320);
  }, []);

  // ── Auto-center, configure physics forces, and fit graph on initial load ──
  useEffect(() => {
    if (!graphRef.current || visibleNodes.length === 0) return;
    const fg = graphRef.current;

    // Unpin fixed coordinates so force simulation can naturally adjust and untangle
    visibleNodes.forEach((n: any) => {
      n.fx = undefined;
      n.fy = undefined;
    });

    // Configure D3 physics forces for magical, smooth, soft spring elasticity
    fg.d3Force('charge')?.strength(-160)?.distanceMax(500);
    fg.d3Force('link')?.distance((link: any) => {
      const e = link as GraphEdge;
      return e.edgeType === 'REAL_EDGE' ? 80 : 100;
    })?.strength(0.30); // Soft spring elasticity for graceful slow self-correction
    fg.d3Force('collide', forceCollide(26));

    fg.d3ReheatSimulation?.();

    // Trigger close-up zoom strictly ONCE on initial webpage boot
    if (!hasInitialZoomedRef.current) {
      hasInitialZoomedRef.current = true;
      const timer = setTimeout(() => {
        zoomInClose();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [visibleNodes.length, primaryNodeId, zoomInClose]);

  // ── Dynamic clean-up when active provider changes ─────────────────────────
  useEffect(() => {
    if (!isImdb && visibleNodes.length > 0) {
      visibleNodes.forEach((n: any) => {
        n.fx = undefined;
        n.fy = undefined;
      });
    }
  }, [isImdb, visibleNodes]);



  const activeSelectedNode = selectedNode || activeSmallCardNode;

  // ── Click connection sets (ON CLICK ONLY) ──────────────────────────────────
  const selectedNodeConnections = useMemo(() => {
    if (!activeSelectedNode) return { nodeIds: new Set<string>(), edgeIds: new Set<string>() };
    const nodeIds = new Set<string>([activeSelectedNode.id]);
    const edgeIds = new Set<string>();
    for (const link of visibleLinks) {
      const src = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const tgt = typeof link.target === 'string' ? link.target : (link.target as any).id;
      if (src === activeSelectedNode.id) { nodeIds.add(tgt); edgeIds.add(link.id); }
      if (tgt === activeSelectedNode.id) { nodeIds.add(src); edgeIds.add(link.id); }
    }
    return { nodeIds, edgeIds };
  }, [activeSelectedNode, visibleLinks]);

