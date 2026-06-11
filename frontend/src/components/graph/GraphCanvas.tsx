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

  // ── Bridge nodes ──────────────────────────────────────────────────────────
  const bridgeNodes = useMemo(() => {
    const bridgeSet = new Set<string>();
    const clusterMap = new Map<string, string>();
    for (const node of visibleNodes) { if (node.cluster) clusterMap.set(node.id, node.cluster); }
    const nodeNeighborClusters = new Map<string, Set<string>>();
    for (const link of visibleLinks) {
      const src = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const tgt = typeof link.target === 'string' ? link.target : (link.target as any).id;
      const srcC = clusterMap.get(src), tgtC = clusterMap.get(tgt);
      if (srcC) { if (!nodeNeighborClusters.has(tgt)) nodeNeighborClusters.set(tgt, new Set()); nodeNeighborClusters.get(tgt)!.add(srcC); }
      if (tgtC) { if (!nodeNeighborClusters.has(src)) nodeNeighborClusters.set(src, new Set()); nodeNeighborClusters.get(src)!.add(tgtC); }
    }
    for (const [nodeId, clusters] of nodeNeighborClusters.entries()) {
      const node = visibleNodes.find(n => n.id === nodeId);
      if (node?.cluster) clusters.add(node.cluster);
      if (clusters.size > 1) bridgeSet.add(nodeId);
    }
    return bridgeSet;
  }, [visibleNodes, visibleLinks]);

  // ── Container resize ──────────────────────────────────────────────────────
  useEffect(() => {
    function update() {
      if (containerRef.current) setDimensions({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Mouse tracking (DOM tooltip positioning & graph cursor coordinates) ──
  useEffect(() => {
    function onMM(e: MouseEvent) {
      if (tooltipContainerRef.current) {
        tooltipContainerRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      if (visualConnectMode && connectorSourceNode && graphRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        if (typeof graphRef.current.screen2GraphCoords === 'function') {
          const coords = graphRef.current.screen2GraphCoords(screenX, screenY);
          setMouseGraphPos(coords);
        }
      }
    }
    window.addEventListener('mousemove', onMM);
    return () => window.removeEventListener('mousemove', onMM);
  }, [visualConnectMode, connectorSourceNode]);

  // ── Node color ────────────────────────────────────────────────────────────
  const getNodeColor = useCallback((node: any) => {
    const n = node as GraphNode;
    const isHighlighted = highlightedNodeIds.size === 0 || highlightedNodeIds.has(n.id);
    const isConnectorSource = connectorSourceNode?.id === n.id;
    const isSelected = activeSelectedNode?.id === n.id;
    const isHovered = hoveredNode?.id === n.id;
    const isConnectedToSelected = selectedNodeConnections.nodeIds.has(n.id);
    const hasActiveSelection = activeSelectedNode !== null;

    let color: string;
    if (isImdb) {
      color = n.cluster ? getImdbClusterColor(n.cluster) : accentColor;
    } else {
      if (isConnectorSource || isSelected) color = '#ffffff';
      else if (n.cluster) color = getCollegeClusterColor(n.cluster);
      else if (n.nodeType === 'REAL') color = '#ffffff';
      else color = '#64748b';
    }

    if (!isHighlighted) return hexToRgba(color, 0.25);
    if (hasActiveSelection && !isSelected && !isConnectedToSelected) return hexToRgba(color, 0.70);
    if (isSelected || isConnectedToSelected || isHovered) return color;
    return hexToRgba(color, 0.90);
  }, [highlightedNodeIds, activeSelectedNode, hoveredNode, connectorSourceNode, selectedNodeConnections, isImdb, accentColor]);

  // ── Node size (SMALLER) ───────────────────────────────────────────────────
  const getNodeSize = useCallback((node: any) => {
    const n = node as GraphNode;
    // Much smaller base sizes
    const base = isImdb
      ? 2.5 + Math.min((n.influenceScore / 100) * 3.5, 3.5)
      : (n.nodeType === 'REAL' ? 3.5 + Math.min((n.influenceScore / 100) * 3, 3) : 2.8);
    if (hoveredNode?.id === n.id) return base * 1.7;
    if (selectedNode?.id === n.id) return base * 1.8;
    return base;
  }, [hoveredNode, selectedNode, isImdb]);

  // ── Node paint (with ALWAYS-VISIBLE labels) ───────────────────────────────
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode;
    if (!isFinite(node.x) || !isFinite(node.y)) return;

    const r = getNodeSize(n);
    const color = getNodeColor(n);
    const isReal = n.nodeType === 'REAL' || isImdb;
    const isHovered = hoveredNode?.id === n.id;
    const isSelected = selectedNode?.id === n.id;
    const isConnectorSource = connectorSourceNode?.id === n.id;
    const isHighlighted = highlightedNodeIds.size === 0 || highlightedNodeIds.has(n.id);
    const isConnectedToSelected = selectedNodeConnections.nodeIds.has(n.id);
    const hasActiveSelection = activeSelectedNode !== null;

    // Subtle breathing
    const charCode = n.fullName?.charCodeAt(0) ?? n.id?.charCodeAt(0) ?? 0;
    const breathingOffset = Math.sin(Date.now() * 0.002 + charCode) * 0.15;
    const ar = r + breathingOffset;

    ctx.save();

    // Cluster halo
    if (n.cluster && isHighlighted && (!hasActiveSelection || isSelected || isConnectedToSelected)) {
      const cc = getClusterColor(n.cluster);
      const glowScale = isSelected ? 5 : isHovered ? 4 : 3;
      const alpha = isSelected ? 0.4 : isHovered ? 0.25 : 0.10;
      const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, ar * glowScale);
      grad.addColorStop(0, hexToRgba(cc, alpha));
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(node.x, node.y, ar * glowScale, 0, 2 * Math.PI);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Connector ring
    if (isConnectorSource) {
      ctx.beginPath(); ctx.arc(node.x, node.y, ar * 2.2, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Bridge ring
    if (bridgeNodes.has(n.id) && isHighlighted && (!hasActiveSelection || isSelected || isConnectedToSelected)) {
      ctx.beginPath(); ctx.arc(node.x, node.y, ar * 1.6, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = isHovered ? 1.2 : 0.7;
      ctx.stroke();
    }

    // Node core
    ctx.beginPath(); ctx.arc(node.x, node.y, ar, 0, 2 * Math.PI);
    if (isReal) {
      ctx.fillStyle = color; ctx.fill();
    } else {
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = hexToRgba('#000000', 0.55); ctx.fill();
    }

    // Outline
    if (isSelected || isConnectorSource) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
    } else if (isHovered && isReal) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();
    } else if (isReal && (!hasActiveSelection || isConnectedToSelected)) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.9; ctx.stroke();
    }

    // ── ALWAYS-VISIBLE LABELS ──────────────────────────────────────────────
    if (n.fullName) {
      const displayName = n.fullName.length > 20 ? n.fullName.slice(0, 20) + '…' : n.fullName;
      // Font scales with zoom but stays readable: constant screen size ~8px
      const fontSize = Math.max(3.5, 8 / globalScale);
      const isBold = isSelected || isConnectorSource || isHovered;
      const labelAlpha = isSelected || isHovered || isConnectorSource ? 1.0
        : isConnectedToSelected ? 0.95
          : hasActiveSelection ? 0.65
            : (!isHighlighted ? 0.30 : (isImdb ? 0.80 : 0.75));

      ctx.font = `${isBold ? 600 : 400} ${fontSize}px Outfit, Inter, sans-serif`;
      ctx.fillStyle = `rgba(255,255,255,${labelAlpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(displayName, node.x, node.y + ar + 2.5);
    }

    ctx.restore();
  }, [getNodeColor, getNodeSize, hoveredNode, selectedNode, activeSelectedNode, highlightedNodeIds, connectorSourceNode, bridgeNodes, selectedNodeConnections, isImdb]);

  // ── Inject Frontend-Only Invisible Layout Anchors for Isolated/Unreachable Components ─────
  const physicsLinks = useMemo(() => {
    // 1. Sanitize all real visible links to string IDs so D3 forceLink engine never holds stale node object references
    const links: any[] = visibleLinks.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? (l.source as any).id : l.source,
      target: typeof l.target === 'object' ? (l.target as any).id : l.target,
    }));

    if (visibleNodes.length <= 1) return links;

    // Find the primary node object in visibleNodes (or fallback to first node)
    const primaryNode = (primaryNodeId ? visibleNodes.find(n => n.id === primaryNodeId || n.publicId === primaryNodeId) : null) || visibleNodes[0];
    if (!primaryNode) return links;

    // 2. Perform BFS from primaryNode to find all nodes reachable via real edges
    const connectedToPrimary = new Set<string>([primaryNode.id]);
    const queue = [primaryNode.id];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const l of links) {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        if (s === curr && !connectedToPrimary.has(t)) {
          connectedToPrimary.add(t);
          queue.push(t);
        } else if (t === curr && !connectedToPrimary.has(s)) {
          connectedToPrimary.add(s);
          queue.push(s);
        }
      }
    }

    // 3. Any node that is isolated OR in an unreachable island gets a frontend-only layout anchor to primaryNode
    const unanchoredNodes = visibleNodes.filter(node => node.id !== primaryNode.id && !connectedToPrimary.has(node.id));
    const totalUnanchored = unanchoredNodes.length;

    unanchoredNodes.forEach((node, idx) => {
      const pX = typeof primaryNode.x === 'number' ? primaryNode.x : 0;
      const pY = typeof primaryNode.y === 'number' ? primaryNode.y : 0;

      // Seed initial coordinates near primary node in a balanced compact circle
      if (typeof node.x !== 'number' || typeof node.y !== 'number' || Math.abs(node.x - pX) > 180 || Math.abs(node.y - pY) > 180) {
        const angle = (idx / Math.max(1, totalUnanchored)) * 2 * Math.PI;
        node.x = pX + Math.cos(angle) * 55;
        node.y = pY + Math.sin(angle) * 55;
        node.vx = 0;
        node.vy = 0;
      }

      links.push({
        id: `layout-anchor-${node.id}`,
        source: primaryNode.id,
        target: node.id,
        relationshipType: 'LAYOUT_ANCHOR',
        trustScore: 0,
        interactionFrequency: 0,
        connectorSource: 'LAYOUT_ENGINE',
        edgeKind: 'LAYOUT_ANCHOR',
        edgeType: 'LAYOUT_ANCHOR',
        weight: 0,
        isLayoutAnchor: true,
      });
    });

    return links;
  }, [visibleNodes, visibleLinks, primaryNodeId]);

  // ── Link color ────────────────────────────────────────────────────────────
  const getLinkColor = useCallback((link: any) => {
    if (link.isLayoutAnchor || link.edgeKind === 'LAYOUT_ANCHOR') return 'transparent';
    const e = link as GraphEdge;
    const isHighlighted = highlightedEdgeIds.size === 0 || highlightedEdgeIds.has(e.id);
    const isHovered = hoveredEdge?.id === e.id;
    const isTraced = highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0;
    const isConnectedToSelected = selectedNodeConnections.edgeIds.has(e.id);
    const hasActiveSelection = activeSelectedNode !== null;

    if (isTraced) return isImdb ? accentColor : '#ffffff';
    if (isHovered || isConnectedToSelected) return isImdb ? `${accentColor}cc` : 'rgba(255,255,255,0.95)';
    if (hasActiveSelection && !isConnectedToSelected) return 'rgba(255,255,255,0.15)';
    if (e.edgeType === 'REAL_EDGE') {
      if (!isHighlighted) return 'rgba(255,255,255,0.08)';
      return isImdb ? hexToRgba(accentColor, 0.22 + e.weight * 0.28) : `rgba(255,255,255,${0.22 + e.weight * 0.25})`;
    }
    if (!isHighlighted) return 'rgba(255,255,255,0.04)';
    return `rgba(255,255,255,${0.10 + e.weight * 0.10})`;
  }, [highlightedEdgeIds, hoveredEdge, activeSelectedNode, selectedNodeConnections, isImdb, accentColor]);

  const getLinkWidth = useCallback((link: any) => {
    if (link.isLayoutAnchor || link.edgeKind === 'LAYOUT_ANCHOR') return 0;
    const e = link as GraphEdge;
    const isHovered = hoveredEdge?.id === e.id;
    const isTraced = highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0;
    const isConnected = selectedNodeConnections.edgeIds.has(e.id);
    if (isTraced) return 3;
    const base = e.edgeType === 'REAL_EDGE' ? 0.8 + e.weight * 0.9 : 0.5 + e.weight * 0.4;
    return (isHovered || isConnected) ? base * 2 : base;
  }, [hoveredEdge, highlightedEdgeIds, selectedNodeConnections]);

  // ── Generous Node Pointer Area for Cursor Accuracy ───────────────────────
  const paintNodePointerArea = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode;
    if (!isFinite(node.x) || !isFinite(node.y)) return;
    const r = getNodeSize(n);
    // Generous hit radius (at least 14 screen pixels or 2.2x node size) so cursor clicks never miss
    const hitRadius = Math.max(14 / globalScale, r * 2.2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, hitRadius, 0, 2 * Math.PI);
    ctx.fill();
  }, [getNodeSize]);

  // ── Live Rubber-Band Connection Line for Visual Connect Mode ─────────────
  const drawVisualConnectorOverlay = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!visualConnectMode || !connectorSourceNode || !mouseGraphPos) return;
    const sx = (connectorSourceNode as any).x;
    const sy = (connectorSourceNode as any).y;
    if (typeof sx !== 'number' || typeof sy !== 'number' || !isFinite(sx) || !isFinite(sy)) return;

    ctx.save();

    // 1. Draw glowing rubber-band connection line from source node to cursor
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(mouseGraphPos.x, mouseGraphPos.y);

    // Glow background
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 4 / globalScale;
    ctx.stroke();

    // Animated dashed stroke
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / globalScale;
    ctx.setLineDash([6 / globalScale, 4 / globalScale]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Pulse target ring at current cursor position
    const pulseR = (10 + Math.sin(Date.now() * 0.008) * 3) / globalScale;
    ctx.beginPath();
    ctx.arc(mouseGraphPos.x, mouseGraphPos.y, pulseR, 0, 2 * Math.PI);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(mouseGraphPos.x, mouseGraphPos.y, 3 / globalScale, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }, [visualConnectMode, connectorSourceNode, mouseGraphPos]);

  // Memoize graphData to preserve particle animation state continuously across re-renders
  const graphData = useMemo(() => ({
    nodes: visibleNodes as any,
    links: physicsLinks as any,
  }), [visibleNodes, physicsLinks]);

  // Memoize particle accessors with stable function identity
  const getLinkDirectionalParticles = useCallback((link: any) => {
    const e = link as GraphEdge;
    return e.edgeType === 'REAL_EDGE' ? 2 : 0;
  }, []);

  const getLinkDirectionalParticleColor = useCallback(() => {
    return isImdb ? accentColor : 'rgba(255, 255, 255, 0.92)';
  }, [isImdb, accentColor]);

  return (
    <div ref={containerRef} className="graph-container" onClick={() => clearHighlights()}>
      <div className="graph-canvas-bg" />

      {dimensions.w > 0 && visibleNodes.length > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.w}
          height={dimensions.h}
          backgroundColor="transparent"
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => 'replace'}
          nodePointerAreaPaint={paintNodePointerArea}
          onRenderFramePost={drawVisualConnectorOverlay}
          onBackgroundClick={() => {
            setActiveSmallCardNode(null);
            if (visualConnectMode) {
              setVisualConnectMode(false);
              setConnectorSourceNode(null);
            } else {
              clearHighlights();
            }
          }}
          nodeVal={getNodeSize}
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          linkCurvature={isImdb ? 0.10 : 0.08}
          linkDirectionalParticles={getLinkDirectionalParticles}
          linkDirectionalParticleWidth={1.4}
          linkDirectionalParticleColor={getLinkDirectionalParticleColor}
          linkDirectionalParticleSpeed={0.002}
          warmupTicks={120}
          cooldownTicks={120}
          cooldownTime={2000}
          d3AlphaDecay={0.008}
          d3VelocityDecay={0.24}
          onNodeClick={(node: any, event: any) => {
            const n = node as GraphNode;
            if (visualConnectMode) {
              if (!connectorSourceNode) {
                setConnectorSourceNode(n);
              } else if (connectorSourceNode.id === n.id) {
                setConnectorSourceNode(null);
              } else {
                if (!isImdb && connectorSourceNode.nodeType === 'DEMO' && n.nodeType === 'REAL') {
                  alert('Traversal blocked: DEMO → REAL paths are prohibited.');
                  setConnectorSourceNode(null); setVisualConnectMode(false); return;
                }
                setCreatingEdgeData({ sourceId: connectorSourceNode.id, targetId: n.id });
                setVisualConnectMode(false); setConnectorSourceNode(null);
              }
            } else {
              if (event && event.detail === 2) {
                // Double click: open big detail modal directly
                selectNode(n);
                setActiveSmallCardNode(null);
              } else {
                // Single click: open small summary card popover
                setActiveSmallCardNode(n);
              }
            }
          }}
          onNodeHover={(node: any) => {
            setHoveredNode(node ? (node as GraphNode) : null);
            document.body.style.cursor = node ? 'pointer' : 'default';
          }}
          onNodeDrag={(node: any) => {
            node.fx = node.x;
            node.fy = node.y;
          }}
          onNodeDragEnd={(node: any) => {
            // Unpin node so spring/repulsion forces pull it back elastically & auto-correct layout
            node.fx = undefined;
            node.fy = undefined;
            graphRef.current?.d3ReheatSimulation?.();
          }}
          onLinkClick={(link: any) => setEditingEdge(link as GraphEdge)}
          onLinkHover={(link: any) => {
            setHoveredEdge(link ? (link as GraphEdge) : null);
            document.body.style.cursor = link ? 'pointer' : 'default';
          }}
          enableNodeDrag={!visualConnectMode}
          enableZoomInteraction
          enablePanInteraction
          minZoom={0.15}
          maxZoom={10}
        />
      )}

      {isLoading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,2,2,0.65)', backdropFilter: 'blur(10px)', zIndex: 50 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: `2px solid ${accentColor}30`, borderTopColor: accentColor, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
            <span className="text-label" style={{ color: 'var(--silver-400)' }}>
              {activeProvider === 'imdb' ? 'Building Actor Network…' : 'Expanding Subgraph…'}
            </span>
          </div>
        </div>
      )}

      {/* Small Card Summary Popover (Single Click) */}
      {activeSmallCardNode && !selectedNode && (
        <div
          className="glass-panel animate-fade-in-scale"
          style={{
            position: 'fixed',
            bottom: 80,
            left: 268,
            zIndex: 500,
            width: 240,
            padding: '14px',
            background: 'rgba(10, 15, 30, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '10px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, color: '#ffffff'
              }}>
                {activeSmallCardNode.fullName.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                  {activeSmallCardNode.fullName}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--silver-400)', fontFamily: 'monospace' }}>
                  {activeSmallCardNode.publicId}
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveSmallCardNode(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--silver-400)', cursor: 'pointer', fontSize: '12px' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <span style={{
              fontSize: '9px', padding: '1px 6px', borderRadius: '100px',
              background: activeSmallCardNode.nodeType === 'REAL' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.15)', color: 'var(--silver-200)'
            }}>
              {activeSmallCardNode.nodeType}
            </span>
            {activeSmallCardNode.cluster && (
              <span style={{
                fontSize: '9px', padding: '1px 6px', borderRadius: '100px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--silver-300)'
              }}>
                {activeSmallCardNode.cluster}
