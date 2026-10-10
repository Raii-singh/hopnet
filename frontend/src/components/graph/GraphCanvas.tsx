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

// ── Adaptive Graph Layout & Rendering Constants ──────────────────────────────
const BASE_LINK_DISTANCE = 48;
const BASE_CHARGE_STRENGTH = -65;
const BASE_CHARGE_DISTANCE_MAX = 350;
const COLLISION_PADDING = 8; // Buffer around rendered node circle for physics collision

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Calculates a smooth, bounded density factor based on visible node count.
 * - 5–10 nodes  => ~0.60–0.70 (spacious spacing)
 * - 20–50 nodes => ~0.85–1.20 (balanced standard view)
 * - 100+ nodes  => ~1.50–1.65 (compact, readable layout)
 */
function calculateDensityFactor(nodeCount: number): number {
  if (nodeCount <= 0) return 1.0;
  const rawFactor = 0.6 + (nodeCount - 5) * (1.0 / 75);
  return clamp(rawFactor, 0.60, 1.65);
}

export default function GraphCanvas() {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoveredNodeRef = useRef<any>(null); // track actual graph node object for pinning
  const hasInitialZoomedRef = useRef(false);
  const prevPrimaryNodeIdRef = useRef<string | null>(null);
  const lastNodeClickRef = useRef<{ time: number; id: string } | null>(null);

  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [activeSmallCardNode, setActiveSmallCardNode] = useState<GraphNode | null>(null);

  const {
    visibleNodes, visibleLinks, databaseNodes, isApiHealthy,
    selectedNode, hoveredNode, hoveredEdge,
    highlightedNodeIds, highlightedEdgeIds,
    isLoading,
    workspaceMode, visualConnectMode, connectorSourceNode,
    activeProvider, providerCapabilities,
    selectNode, setHoveredNode, setHoveredEdge, clearHighlights, highlightNeighbors,
    setConnectorSourceNode, setVisualConnectMode, createNewEdge,
    rootNodeId, primaryNodeId, setPrimaryNode,
    fontSizeScale, nodeSizeScale, nodeDistanceScale,
  } = useGraphStore();

  const tooltipContainerRef = useRef<HTMLDivElement>(null);
  const [editingEdge, setEditingEdge] = useState<GraphEdge | null>(null);
  const [creatingEdgeData, setCreatingEdgeData] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isImdb = false;
  const accentColor = providerCapabilities.accentColor;

  function getClusterColor(cluster?: string): string {
    return getCollegeClusterColor(cluster);
  }

  const [mouseGraphPos, setMouseGraphPos] = useState<{ x: number; y: number } | null>(null);

  // Helper to reliably center & zoom in close to the graph network with FIXED, CONSISTENT scale
  const zoomInClose = useCallback(() => {
    if (!graphRef.current) return;
    const fg = graphRef.current;
    const primaryNode = (primaryNodeId ? visibleNodes.find(n => n.id === primaryNodeId || n.publicId === primaryNodeId) : null)
      || visibleNodes.find(n => n.publicId === 'HNP-000001' || n.id === 'f02bb0c5-43e0-4e5e-b54a-033a852f1645' || n.fullName.trim().toLowerCase() === 'rai singh')
      || visibleNodes[0];
    if (primaryNode && typeof primaryNode.x === 'number' && typeof primaryNode.y === 'number' && isFinite(primaryNode.x) && isFinite(primaryNode.y)) {
      fg.centerAt(primaryNode.x, primaryNode.y, 400);
    } else {
      fg.centerAt(0, 0, 400);
    }
    // Fixed constant camera zoom level (2.3x) so node and font sizes are ALWAYS identical
    fg.zoom?.(2.3, 400);
  }, [primaryNodeId, visibleNodes]);

  // ── Node size (WITH NODE SIZE SCALE SLIDER) ───────────────────────────────
  const getNodeSize = useCallback((node: any) => {
    const n = node as GraphNode;
    const base = (isImdb
      ? 2.5 + Math.min((n.influenceScore / 100) * 3.5, 3.5)
      : (n.nodeType === 'REAL' ? 3.5 + Math.min((n.influenceScore / 100) * 3, 3) : 2.8)) * nodeSizeScale;
    if (hoveredNode?.id === n.id) return base * 1.7;
    if (selectedNode?.id === n.id) return base * 1.8;
    return base;
  }, [hoveredNode, selectedNode, isImdb, nodeSizeScale]);

  // ── Auto-center, configure adaptive physics forces, and fit graph on updates ──
  useEffect(() => {
    if (!graphRef.current || visibleNodes.length === 0) return;
    const fg = graphRef.current;

    // Unpin fixed coordinates so force simulation can naturally adjust and untangle
    visibleNodes.forEach((n: any) => {
      n.fx = undefined;
      n.fy = undefined;
    });

    const densityFactor = calculateDensityFactor(visibleNodes.length);

    // 1. Adaptive Link Distance: smaller on dense graphs, larger on sparse graphs
    const adaptiveLinkDistance = (BASE_LINK_DISTANCE / Math.sqrt(densityFactor)) * nodeDistanceScale;
    const layoutAnchorDistance = adaptiveLinkDistance * 1.8;

    fg.d3Force('link')
      ?.distance((link: any) => {
        if (link.isLayoutAnchor || link.edgeType === 'LAYOUT_ANCHOR') return layoutAnchorDistance;
        return adaptiveLinkDistance;
      })
      ?.strength((link: any) => {
        if (link.isLayoutAnchor || link.edgeType === 'LAYOUT_ANCHOR') return 0.12;
        return 0.70;
      });

    // 2. Adaptive Repulsion (Charge): bounded scaling to keep dense graphs untangled without exploding
    const adaptiveChargeStrength = (BASE_CHARGE_STRENGTH * Math.pow(densityFactor, 0.7)) * nodeDistanceScale;
    const adaptiveChargeMax = (BASE_CHARGE_DISTANCE_MAX * Math.sqrt(densityFactor)) * nodeDistanceScale;

    fg.d3Force('charge')
      ?.strength(adaptiveChargeStrength)
      ?.distanceMax(adaptiveChargeMax);

    // 3. Node-Aware Collision: Uses actual rendered node radius + padding (NOT static 24px)
    fg.d3Force('collide', forceCollide((node: any) => {
      const r = getNodeSize(node);
      return r + COLLISION_PADDING;
    }));

    fg.d3ReheatSimulation?.();

    // 4. Camera Zoom Fix: Only auto-zoom on initial mount or when primary focus node changes
    const isPrimaryChanged = prevPrimaryNodeIdRef.current !== primaryNodeId;
    if (!hasInitialZoomedRef.current || isPrimaryChanged) {
      hasInitialZoomedRef.current = true;
      prevPrimaryNodeIdRef.current = primaryNodeId;
      const timer = setTimeout(() => {
        zoomInClose();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [visibleNodes.length, primaryNodeId, zoomInClose, nodeDistanceScale, nodeSizeScale, getNodeSize]);

  // ── Dynamic clean-up when active provider changes ─────────────────────────
  useEffect(() => {
    if (!isImdb && visibleNodes.length > 0) {
      visibleNodes.forEach((n: any) => {
        n.fx = undefined;
        n.fy = undefined;
      });
    }
  }, [isImdb, visibleNodes]);

  // Smoothly center camera on searched node when highlightedNodeIds is updated to a single node
  useEffect(() => {
    if (highlightedNodeIds.size === 1 && graphRef.current) {
      const targetId = Array.from(highlightedNodeIds)[0];
      const targetNode = visibleNodes.find(n => n.id === targetId);
      if (targetNode && typeof targetNode.x === 'number' && typeof targetNode.y === 'number' && isFinite(targetNode.x) && isFinite(targetNode.y)) {
        graphRef.current.centerAt(targetNode.x, targetNode.y, 400);
      }
    }
  }, [highlightedNodeIds, visibleNodes]);



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

    if (isSelected || isConnectedToSelected || isHovered || isHighlighted) return color;
    return hexToRgba(color, 0.70);
  }, [highlightedNodeIds, activeSelectedNode, hoveredNode, connectorSourceNode, selectedNodeConnections, isImdb, accentColor]);


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
      // Hollow circle matching Legend Map
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)'; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2.0; ctx.stroke();
    }

    // Outline / Selection / Highlight ring
    if (isSelected || isConnectorSource) {
      ctx.beginPath(); ctx.arc(node.x, node.y, ar + 1.8, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.8; ctx.stroke();
    } else if (isHovered) {
      ctx.beginPath(); ctx.arc(node.x, node.y, ar + 1.8, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.stroke();
    } else if (highlightedNodeIds.has(n.id)) {
      // White highlight ring matching Screenshot 4 (Tanmay)
      ctx.beginPath(); ctx.arc(node.x, node.y, ar + 2.0, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.0; ctx.stroke();
    } else if (isReal && (!hasActiveSelection || isConnectedToSelected)) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.9; ctx.stroke();
    }

    // ── ZOOM- & DENSITY-AWARE LABELS ──────────────
    if (n.fullName) {
      const isNodeHighlighted = highlightedNodeIds.has(n.id);
      const isTracedEdge = highlightedEdgeIds.size > 0 && Array.from(highlightedEdgeIds).some(edgeId => {
        const link = visibleLinks.find(l => l.id === edgeId);
        if (!link) return false;
        const s = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const t = typeof link.target === 'object' ? (link.target as any).id : link.target;
        return s === n.id || t === n.id;
      });

      // Important nodes MUST always retain their labels regardless of zoom or density
      const isImportantNode =
        isSelected ||
        isConnectorSource ||
        isHovered ||
        isNodeHighlighted ||
        isTracedEdge ||
        isConnectedToSelected;

      // Evaluate visibility for non-important background nodes based on zoom level (globalScale) and graph density (visibleNodes.length)
      let shouldRenderLabel = true;
      let densityAlphaMultiplier = 1.0;

      if (!isImportantNode) {
        if (visibleNodes.length > 60) {
          // Dense graph: hide background labels unless zoomed in close (globalScale >= 1.1)
          if (globalScale < 1.1) {
            shouldRenderLabel = false;
          } else {
            densityAlphaMultiplier = clamp((globalScale - 1.1) / 0.8, 0.2, 1.0);
          }
        } else if (visibleNodes.length > 25) {
          // Medium graph: de-emphasize background labels when zoomed out (globalScale < 0.8)
          if (globalScale < 0.65) {
            shouldRenderLabel = false;
          } else if (globalScale < 1.0) {
            densityAlphaMultiplier = clamp((globalScale - 0.65) / 0.35, 0.3, 1.0);
          }
        } else {
          // Small graph (<= 25 nodes): show labels unless zoomed extremely far out
          if (globalScale < 0.35) {
            shouldRenderLabel = false;
          }
        }
      }

      if (shouldRenderLabel) {
        const displayName = n.fullName.length > 20 ? n.fullName.slice(0, 20) + '…' : n.fullName;
        const isBold = isSelected || isConnectorSource || isHovered || isNodeHighlighted || isTracedEdge;
        const baseFontSize = (isNodeHighlighted || isTracedEdge ? 12 : 9.5) * fontSizeScale;
        const fontSize = Math.max((isNodeHighlighted || isTracedEdge) ? 5.5 : 4.2, baseFontSize / globalScale);

        ctx.font = `${isBold ? 700 : 400} ${fontSize}px Outfit, Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        if (isNodeHighlighted || isSelected || isHovered || isTracedEdge) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 8 / globalScale;
          ctx.fillStyle = '#ffffff';
        } else {
          const labelAlpha = (isConnectedToSelected ? 0.95
            : hasActiveSelection ? 0.65
              : (isImdb ? 0.80 : 0.85)) * densityAlphaMultiplier;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(255,255,255,${labelAlpha})`;
        }

        ctx.fillText(displayName, node.x, node.y + ar + 2.5);
      }
    }

    ctx.restore();
  }, [getNodeColor, getNodeSize, hoveredNode, selectedNode, activeSelectedNode, highlightedNodeIds, highlightedEdgeIds, visibleLinks, connectorSourceNode, bridgeNodes, selectedNodeConnections, isImdb, fontSizeScale, visibleNodes.length]);

  // ── Inject Frontend-Only Invisible Layout Anchors for Isolated/Unreachable Components ─────
  const physicsLinks = useMemo(() => {
    // 1. Sanitize all real visible links to string IDs so D3 forceLink engine never holds stale node object references
    const links: any[] = visibleLinks.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? (l.source as any).id : l.source,
      target: typeof l.target === 'object' ? (l.target as any).id : l.target,
    }));

    if (visibleNodes.length <= 1) return links;

    // Find the primary node object in visibleNodes (or fallback to Rai Singh, then first node)
    const primaryNode = (primaryNodeId ? visibleNodes.find(n => n.id === primaryNodeId || n.publicId === primaryNodeId) : null)
      || visibleNodes.find(n => n.publicId === 'HNP-000001' || n.id === 'f02bb0c5-43e0-4e5e-b54a-033a852f1645' || n.fullName.trim().toLowerCase() === 'rai singh')
      || visibleNodes[0];
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
      if (typeof node.x !== 'number' || typeof node.y !== 'number') {
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
    if (link.isLayoutAnchor || (link.edgeKind as any) === 'LAYOUT_ANCHOR') return 'transparent';
    const e = link as GraphEdge;
    const src = typeof link.source === 'string' ? link.source : (link.source as any).id;
    const tgt = typeof link.target === 'string' ? link.target : (link.target as any).id;
    const isHovered = hoveredEdge?.id === e.id;
    const isTraced = highlightedEdgeIds.has(e.id) || (highlightedEdgeIds.size > 0 && highlightedNodeIds.has(src) && highlightedNodeIds.has(tgt));
    const isConnectedToSelected = selectedNodeConnections.edgeIds.has(e.id);

    if (isTraced) return '#60a5fa'; // Bright glowing sky blue for traced optimal route
    if (isHovered || isConnectedToSelected) return 'rgba(255,255,255,0.95)';
    if (e.edgeType === 'REAL_EDGE' || e.edgeKind === 'REAL_EDGE') {
      return `rgba(255,255,255,${0.25 + e.weight * 0.35})`;
    }
    return `rgba(148,163,184,${0.35 + e.weight * 0.20})`;
  }, [highlightedEdgeIds, highlightedNodeIds, hoveredEdge, selectedNodeConnections]);

  const getLinkWidth = useCallback((link: any) => {
    if (link.isLayoutAnchor || (link.edgeKind as any) === 'LAYOUT_ANCHOR') return 0;
    const e = link as GraphEdge;
    const src = typeof link.source === 'string' ? link.source : (link.source as any).id;
    const tgt = typeof link.target === 'string' ? link.target : (link.target as any).id;
    const isHovered = hoveredEdge?.id === e.id;
    const isTraced = highlightedEdgeIds.has(e.id) || (highlightedEdgeIds.size > 0 && highlightedNodeIds.has(src) && highlightedNodeIds.has(tgt));
    const isConnected = selectedNodeConnections.edgeIds.has(e.id);
    if (isTraced) return 3.5;
    const isReal = e.edgeType === 'REAL_EDGE' || e.edgeKind === 'REAL_EDGE';
    const base = isReal ? 0.8 + e.weight * 0.9 : 0.6 + e.weight * 0.4;
    return (isHovered || isConnected) ? base * 2 : base;
  }, [hoveredEdge, highlightedEdgeIds, highlightedNodeIds, selectedNodeConnections]);

  const getLinkLineDash = useCallback((link: any) => {
    const e = link as GraphEdge;
    if (e.isLayoutAnchor || (e.edgeKind as any) === 'LAYOUT_ANCHOR') return null;
    const isDemo = e.edgeType === 'DEMO_EDGE' || e.edgeKind === 'DEMO_EDGE';
    return isDemo ? [4, 4] : null;
  }, []);

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
          linkLineDash={getLinkLineDash}
          linkCurvature={isImdb ? 0.10 : 0.08}
          linkDirectionalParticles={getLinkDirectionalParticles}
          linkDirectionalParticleWidth={1.4}
          linkDirectionalParticleColor={getLinkDirectionalParticleColor}
          linkDirectionalParticleSpeed={0.002}
          warmupTicks={60}
          cooldownTicks={100}
          cooldownTime={1500}
          d3AlphaDecay={0.018}
          d3VelocityDecay={0.40}
          onNodeClick={(node: any) => {
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
                createNewEdge({
                  sourceId: connectorSourceNode.id,
                  targetId: n.id,
                  relationshipType: 'acquaintance',
                  trustScore: 0.5,
                  interactionFrequency: 0.5,
                  connectorSource: 'Visual Connector',
                });
                setVisualConnectMode(false); setConnectorSourceNode(null);
              }
            } else {
              const now = Date.now();
              const last = lastNodeClickRef.current;
              if (last && last.id === n.id && (now - last.time) < 350) {
                // Double click: open big detail modal directly!
                lastNodeClickRef.current = null;
                selectNode(n);
                setActiveSmallCardNode(null);
              } else {
                lastNodeClickRef.current = { time: now, id: n.id };
                // Single click: open small summary card popover & highlight node
                setActiveSmallCardNode(n);
                highlightNeighbors(n.id);
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
              Expanding Subgraph…
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
          </div>

          <button
            className="glass-button"
            onClick={() => {
              setPrimaryNode(activeSmallCardNode.id);
              setActiveSmallCardNode(null);
            }}
            style={{ width: '100%', fontSize: '10px', padding: '4px 8px', color: '#eab308', borderColor: 'rgba(234,179,8,0.3)' }}
          >
            🎯 Center & Focus Graph
          </button>
          <div style={{ fontSize: '8.5px', color: 'var(--silver-500)', textAlign: 'center', marginTop: '6px', fontStyle: 'italic' }}>
            Tip: Double-click any node to directly open full details.
          </div>
        </div>
      )}

      {/* Empty Graph Canvas Overlay with + Add First Person CTA (ONLY shown when database is truly empty) */}
      {(databaseNodes.length === 0 && !isLoading && isApiHealthy) && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 30 }}>
          <div className="glass-panel" style={{ padding: '32px 40px', textAlign: 'center', maxWidth: 400, pointerEvents: 'auto', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🌐</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--silver-100)', marginBottom: '6px' }}>
              The Graph is Empty
            </div>
            <div style={{ fontSize: '13px', color: 'var(--silver-400)', marginBottom: '20px', lineHeight: 1.5 }}>
              Your database currently contains 0 records. Add your first person to populate the graph network.
            </div>
            {!isImdb && (
              <button
                className="glass-button font-semibold"
                onClick={() => setShowCreateModal(true)}
                style={{
                  margin: '0 auto',
                  padding: '10px 20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  boxShadow: '0 0 16px rgba(255, 255, 255, 0.1)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                + Add First Person
              </button>
            )}
          </div>
        </div>
      )}

      {selectedNode && <NodeProfileModal node={selectedNode} onClose={() => selectNode(null)} />}
      {editingEdge && <EdgeEditorModal edge={editingEdge} onClose={() => setEditingEdge(null)} />}
      {creatingEdgeData && <EdgeEditorModal createData={creatingEdgeData} onClose={() => setCreatingEdgeData(null)} />}
      {showCreateModal && <NodeCreateModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
