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

// ── Cluster palette (Raj & Rai Network Pastels) ────────────────────────────
function getCollegeClusterColor(cluster?: string): string {
  if (!cluster) return '#94a3b8';
  const c = cluster.toLowerCase();
  if (c.includes('podcast') || c.includes('media')) return '#f59e0b';
  if (c.includes('shark tank') || c.includes('d2c')) return '#ec4899';
  if (c.includes('open source') || c.includes('system')) return '#06b6d4';
  if (c.includes('tech') || c.includes('ai')) return '#60a5fa';
  if (c.includes('venture') || c.includes('startup')) return '#10b981';
  if (c.includes('finance') || c.includes('market')) return '#34d399';
  if (c.includes('corporate') || c.includes('leadership')) return '#8b5cf6';
  if (c.includes('politic') || c.includes('policy')) return '#ef4444';
  if (c.includes('author') || c.includes('intellectual')) return '#f97316';
  if (c.includes('entertainment') || c.includes('art')) return '#d946ef';
  if (c.includes('sport') || c.includes('athletic')) return '#eab308';
  if (c.includes('science') || c.includes('longevity') || c.includes('health')) return '#22c55e';
  if (c.includes('academia')) return '#a78bfa';
  switch (c) {
    case 'tech': return '#60a5fa';
    case 'finance': return '#34d399';
    case 'health': return '#f87171';
    case 'venture': return '#fbbf24';
    case 'academia': return '#a78bfa';
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
  const isModifierPressedRef = useRef(false);
  const isIsolatedDragRef = useRef(false);
  const prevLinkStrengthRef = useRef<any>(null);

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
    showNodeLabels, edgeOpacity, autoFreezeLayout,
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
      || visibleNodes.find(n => n.publicId === 'HNP-000001' || n.id === 'ba81e688-04a2-401a-8ede-9059f4a030fa' || n.id === 'f02bb0c5-43e0-4e5e-b54a-033a852f1645' || n.fullName.trim().toLowerCase() === 'rai' || n.fullName.trim().toLowerCase() === 'rai singh')
      || visibleNodes[0];
    if (primaryNode && typeof primaryNode.x === 'number' && typeof primaryNode.y === 'number' && isFinite(primaryNode.x) && isFinite(primaryNode.y)) {
      fg.centerAt(primaryNode.x, primaryNode.y, 400);
    } else {
      fg.centerAt(0, 0, 400);
    }
    // Fixed constant camera zoom level (2.3x) so node and font sizes are ALWAYS identical
    fg.zoom?.(2.3, 400);
  }, [primaryNodeId, visibleNodes]);

  // ── High-performance O(1) Lookup Maps ─────────────────────────────────────────
  const nodeMap = useMemo(() => new Map<string, GraphNode>(visibleNodes.map(n => [n.id, n])), [visibleNodes]);
  const linkMap = useMemo(() => new Map<string, GraphEdge>(visibleLinks.map(l => [l.id, l])), [visibleLinks]);

  // Pre-calculate visible degree map for connection-proportional physics & rendering
  const degreeMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const link of visibleLinks) {
      const srcId = typeof link.source === 'string' ? link.source : (link.source as any)?.id;
      const tgtId = typeof link.target === 'string' ? link.target : (link.target as any)?.id;
      if (srcId) map.set(srcId, (map.get(srcId) || 0) + 1);
      if (tgtId) map.set(tgtId, (map.get(tgtId) || 0) + 1);
    }
    return map;
  }, [visibleLinks]);

  // ── Node size: Connection- & Influence-based hierarchy (STABLE: independent of hover/selection so physics never restarts on cursor movement) ──
  const getNodeSize = useCallback((node: any) => {
    const n = node as GraphNode;
    const conns = Math.max(1, degreeMap.get(n.id) || n.connectionCount || (n as any).realConnections || (n as any).subgraphDegree || 1);

    // For large networks, scale gracefully by degree so leaf nodes stay delicate and hubs stand out
    let base: number;
    if (visibleNodes.length > 100) {
      if (conns >= 30) {
        base = 5.8 + Math.min(conns * 0.04, 3.2); // Primary hubs (e.g. Raj, Elon, Modi, Rogan)
      } else if (conns >= 10) {
        base = 4.0 + Math.min(conns * 0.07, 1.8); // Secondary connectors
      } else if (conns >= 4) {
        base = 2.8;
      } else {
        base = 1.9; // Leaf nodes: small, clean, prevents overlapping blob
      }
    } else {
      base = (n.nodeType === 'REAL' ? 3.5 + Math.min((n.influenceScore / 100) * 3, 3) : 2.8);
    }

    return base * nodeSizeScale;
  }, [visibleNodes.length, nodeSizeScale, degreeMap]);

  // ── Auto-center, configure connection-based physics forces, and fit graph on updates ──
  useEffect(() => {
    if (!graphRef.current || visibleNodes.length === 0) return;
    const fg = graphRef.current;

    // Unpin fixed coordinates so force simulation can naturally adjust and untangle initially
    visibleNodes.forEach((n: any) => {
      if (!n.__userPinned) {
        n.fx = undefined;
        n.fy = undefined;
      }
    });

    const nodeCount = visibleNodes.length;
    const densityFactor = calculateDensityFactor(nodeCount);

    // 1. Connection-Aware Link Distance & Adaptive Spring Tension:
    // Hub-to-Hub bridges need expansive breathing room; high-degree springs are softened to let repulsion spread them out
    const adaptiveLinkDistance = (BASE_LINK_DISTANCE / Math.sqrt(densityFactor)) * nodeDistanceScale;
    const layoutAnchorDistance = adaptiveLinkDistance * 1.8;

    fg.d3Force('link')
      ?.distance((link: any) => {
        if (link.isLayoutAnchor || link.edgeType === 'LAYOUT_ANCHOR') return layoutAnchorDistance;
        const srcNode = typeof link.source === 'object' ? link.source : nodeMap.get(link.source);
        const tgtNode = typeof link.target === 'object' ? link.target : nodeMap.get(link.target);
        const srcConns = Math.max(1, degreeMap.get(srcNode?.id) || srcNode?.connectionCount || srcNode?.realConnections || 1);
        const tgtConns = Math.max(1, degreeMap.get(tgtNode?.id) || tgtNode?.connectionCount || tgtNode?.realConnections || 1);
        const maxConns = Math.max(srcConns, tgtConns);
        const minConns = Math.min(srcConns, tgtConns);

        // Major hub-to-hub bridges (between prominent nodes) need generous spacing so distinct communities separate cleanly
        if (minConns >= 10) {
          return Math.max(adaptiveLinkDistance * 2.2, 110 * nodeDistanceScale);
        }
        if (minConns >= 5) {
          return Math.max(adaptiveLinkDistance * 1.6, 80 * nodeDistanceScale);
        }
        // Hub-to-leaf / peripheral nodes: scale slightly with the hub's connection count so they fan out around the hub
        const hubDegreeBonus = Math.min(60, Math.sqrt(maxConns) * 4.5);
        return (adaptiveLinkDistance + hubDegreeBonus) * (nodeCount > 1000 ? 0.9 : 1.0);
      })
      ?.strength((link: any) => {
        if (link.isLayoutAnchor || link.edgeType === 'LAYOUT_ANCHOR') return 0.08;
        const srcNode = typeof link.source === 'object' ? link.source : nodeMap.get(link.source);
        const tgtNode = typeof link.target === 'object' ? link.target : nodeMap.get(link.target);
        const srcConns = Math.max(1, degreeMap.get(srcNode?.id) || srcNode?.connectionCount || srcNode?.realConnections || 1);
        const tgtConns = Math.max(1, degreeMap.get(tgtNode?.id) || tgtNode?.connectionCount || tgtNode?.realConnections || 1);
        const maxConns = Math.max(srcConns, tgtConns);
        // Soften spring tension on high-degree nodes so repulsion forces can spread them out into open space
        return Math.max(0.08, Math.min(0.65, 1.8 / Math.sqrt(maxConns)));
      });

    // 2. Connection-Based Repulsion (Gravity):
    // Higher the connections, higher the repulsive force so the graph takes proper space without clumping
    fg.d3Force('charge')
      ?.strength((node: any) => {
        const visibleDeg = degreeMap.get(node.id) || 0;
        const dbConns = node.connectionCount ?? node.realConnections ?? 0;
        const conns = Math.max(1, visibleDeg, dbConns);

        if (nodeCount > 1500) {
          const hubBoost = Math.min(conns * 14, 1400);
          return (-45 - hubBoost) * nodeDistanceScale;
        } else if (nodeCount > 500) {
          const hubBoost = Math.min(conns * 18, 1200);
          return (-65 - hubBoost) * nodeDistanceScale;
        } else if (nodeCount > 100) {
          const hubBoost = Math.min(conns * 22, 950);
          return (-90 - hubBoost) * nodeDistanceScale;
        } else {
          const hubBoost = Math.min(conns * 28, 700);
          return (-140 - hubBoost) * nodeDistanceScale;
        }
      })
      ?.distanceMax(Math.max(1400, 2000 * nodeDistanceScale))
      ?.distanceMin(10);

    // 3. Soft, gentle boundary positioning forces:
    // Scale inverse to nodeDistanceScale so increasing spacing lets nodes spread out widely without centripetal compression
    fg.d3Force('center', null);
    const softCenterStrength = (nodeCount > 1500 ? 0.003 : nodeCount > 500 ? 0.008 : 0.025) / Math.max(0.4, Math.sqrt(nodeDistanceScale));
    fg.d3Force('x', forceX(0).strength(softCenterStrength));
    fg.d3Force('y', forceY(0).strength(softCenterStrength));

    // 4. Node-Aware Collision: Uses actual rendered node radius + padding (disabled on > 1200 nodes for 60 FPS)
    if (nodeCount <= 1200) {
      fg.d3Force('collide', forceCollide((node: any) => {
        const r = getNodeSize(node);
        const padding = (nodeCount > 400 ? 3 : COLLISION_PADDING) * Math.min(1.5, Math.max(0.8, nodeDistanceScale));
        return r + padding;
      }).iterations(2));
    } else {
      fg.d3Force('collide', null);
    }

    fg.d3ReheatSimulation?.();

    // 5. Camera Zoom Fix: Only auto-zoom on initial mount or when primary focus node changes
    const isPrimaryChanged = prevPrimaryNodeIdRef.current !== primaryNodeId;
    if (!hasInitialZoomedRef.current || isPrimaryChanged) {
      hasInitialZoomedRef.current = true;
      prevPrimaryNodeIdRef.current = primaryNodeId;
      const timer = setTimeout(() => {
        zoomInClose();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [visibleNodes.length, visibleLinks.length, primaryNodeId, activeProvider, zoomInClose, nodeDistanceScale, nodeSizeScale, getNodeSize, degreeMap, nodeMap]);

  // ── Dynamic clean-up ONLY when active provider actually changes ─────────────────────────
  useEffect(() => {
    if (visibleNodes.length > 0) {
      visibleNodes.forEach((n: any) => {
        n.fx = undefined;
        n.fy = undefined;
      });
      graphRef.current?.d3ReheatSimulation?.();
    }
  }, [activeProvider]);

  // ── Dynamic live simulation physics when autoFreezeLayout is toggled ───
  useEffect(() => {
    if (!autoFreezeLayout && graphRef.current) {
      graphRef.current.d3AlphaTarget?.(0.015);
      graphRef.current.d3ReheatSimulation?.();
    } else if (autoFreezeLayout && graphRef.current) {
      graphRef.current.d3AlphaTarget?.(0);
    }
  }, [autoFreezeLayout]);

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

  // ── Bridge nodes (O(E) indexed cluster adjacency; skipped on huge graphs) ───────────────────
  const bridgeNodes = useMemo(() => {
    if (visibleNodes.length > 500) return new Set<string>();
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
      const c = clusterMap.get(nodeId);
      if (c) clusters.add(c);
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

  // ── Keyboard Modifier Tracking (Shift / Ctrl / Cmd / Alt for isolated single-node drag) ──
  useEffect(() => {
    function onKD(e: KeyboardEvent) {
      if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) {
        isModifierPressedRef.current = true;
      }
    }
    function onKU(e: KeyboardEvent) {
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        isModifierPressedRef.current = false;
      }
    }
    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup', onKU);
    return () => {
      window.removeEventListener('keydown', onKD);
      window.removeEventListener('keyup', onKU);
    };
  }, []);

  // ── Intercept Mousedown on Canvas to allow Ctrl+Drag and prevent whole-graph panning ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onMouseDownCapture(e: MouseEvent) {
      if ((e as any).__hopnetSynthesized) return;

      const isMod = e.shiftKey || e.ctrlKey || e.metaKey || e.altKey;
      if (isMod) {
        isModifierPressedRef.current = true;
      }

      // If user holds Ctrl while clicking on a node:
      // d3-drag defaultFilter rejects any event with ctrlKey=true (!event.ctrlKey).
      // We re-dispatch a synthetic mousedown with ctrlKey=false so d3-drag can engage the node,
      // while keeping isModifierPressedRef.current=true for isolated single-node dragging.
      if (e.ctrlKey && hoveredNodeRef.current && e.button === 0) {
        e.stopImmediatePropagation();
        e.preventDefault();
        const synthetic = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window,
          detail: e.detail,
          screenX: e.screenX,
          screenY: e.screenY,
          clientX: e.clientX,
          clientY: e.clientY,
          ctrlKey: false,
          shiftKey: e.shiftKey,
          metaKey: e.metaKey,
          altKey: e.altKey,
          button: 0,
          buttons: e.buttons || 1,
        });
        (synthetic as any).__hopnetSynthesized = true;
        e.target?.dispatchEvent(synthetic);
      }
    }

    container.addEventListener('mousedown', onMouseDownCapture, true);
    return () => {
      container.removeEventListener('mousedown', onMouseDownCapture, true);
    };
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

    const baseR = getNodeSize(n);
    const color = getNodeColor(n);
    const isReal = n.nodeType === 'REAL' || isImdb;
    const isHovered = hoveredNode?.id === n.id;
    const isSelected = selectedNode?.id === n.id;
    const isConnectorSource = connectorSourceNode?.id === n.id;
    const isHighlighted = highlightedNodeIds.size === 0 || highlightedNodeIds.has(n.id);
    const isConnectedToSelected = selectedNodeConnections.nodeIds.has(n.id);
    const hasActiveSelection = activeSelectedNode !== null;

    // Hover or select gets a visual scale boost without altering physics simulation
    const r = (isSelected || isConnectorSource) ? baseR * 1.8 : isHovered ? baseR * 1.6 : baseR;

    // Subtle breathing
    const charCode = n.fullName?.charCodeAt(0) ?? n.id?.charCodeAt(0) ?? 0;
    const breathingOffset = Math.sin(Date.now() * 0.002 + charCode) * 0.15;
    const ar = r + breathingOffset;

    ctx.save();

    // Cluster halo
    if (n.cluster && isHighlighted && (!hasActiveSelection || isSelected || isConnectedToSelected)) {
      if (visibleNodes.length <= 500 || isSelected || isHovered || globalScale >= 1.2) {
        const cc = getClusterColor(n.cluster);
        const glowScale = isSelected ? 5 : isHovered ? 4 : 3;
        const alpha = isSelected ? 0.4 : isHovered ? 0.25 : 0.10;
        const glowRadius = Math.max(1, ar * glowScale);
        if (isFinite(glowRadius) && glowRadius > 0 && isFinite(node.x) && isFinite(node.y)) {
          const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
          grad.addColorStop(0, hexToRgba(cc, alpha));
          grad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }
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
        const link = linkMap.get(edgeId);
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

      // 1. Check user preference: if hide names toggle is active, only show when hovered or selected
      if (!showNodeLabels && !isHovered && !isSelected) {
        shouldRenderLabel = false;
      } else if (!isImportantNode) {
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

        // 1. Crisp dark halo outline around names so letters are never obscured by edge lines
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(8, 10, 16, 0.95)';
        ctx.lineWidth = Math.max(2.2, 3.2 / globalScale);
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(displayName, node.x, node.y + ar + 2.5);
        ctx.restore();

        // 2. Fill text with appropriate hierarchy
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
  }, [getNodeColor, getNodeSize, hoveredNode, selectedNode, activeSelectedNode, highlightedNodeIds, highlightedEdgeIds, visibleLinks, connectorSourceNode, bridgeNodes, selectedNodeConnections, isImdb, fontSizeScale, visibleNodes.length, showNodeLabels]);

  // ── Inject Frontend-Only Invisible Layout Anchors for Isolated/Unreachable Components ─────
  const physicsLinks = useMemo(() => {
    // 1. Sanitize all real visible links to string IDs so D3 forceLink engine never holds stale node object references
    const links: any[] = visibleLinks.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? (l.source as any).id : l.source,
      target: typeof l.target === 'object' ? (l.target as any).id : l.target,
    }));

    if (visibleNodes.length <= 1 || visibleNodes.length > 300) return links;

    // Find the primary node object in visibleNodes (or fallback to first visible node)
    const primaryNode = (primaryNodeId ? nodeMap.get(primaryNodeId) : null) || visibleNodes[0];
    if (!primaryNode) return links;

    // 2. Perform fast O(V+E) BFS with adjacency list
    const adj = new Map<string, string[]>();
    for (const l of links) {
      const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
      if (!adj.has(s)) adj.set(s, []);
      if (!adj.has(t)) adj.set(t, []);
      adj.get(s)!.push(t);
      adj.get(t)!.push(s);
    }

    const connectedToPrimary = new Set<string>([primaryNode.id]);
    const queue = [primaryNode.id];
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      const neighbors = adj.get(curr);
      if (neighbors) {
        for (let i = 0; i < neighbors.length; i++) {
          const nbr = neighbors[i];
          if (!connectedToPrimary.has(nbr)) {
            connectedToPrimary.add(nbr);
            queue.push(nbr);
          }
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
    if (edgeOpacity <= 0.001) return 'transparent';
    const e = link as GraphEdge;
    const src = typeof link.source === 'string' ? link.source : (link.source as any).id;
    const tgt = typeof link.target === 'string' ? link.target : (link.target as any).id;
    const isHovered = hoveredEdge?.id === e.id;
    const isTraced = highlightedEdgeIds.has(e.id) || (highlightedEdgeIds.size > 0 && highlightedNodeIds.has(src) && highlightedNodeIds.has(tgt));
    const isConnectedToSelected = selectedNodeConnections.edgeIds.has(e.id);

    if (isTraced) return '#60a5fa'; // Bright glowing sky blue for traced optimal route
    if (isHovered || isConnectedToSelected) return 'rgba(255,255,255,0.95)';
    if (e.edgeType === 'REAL_EDGE' || e.edgeKind === 'REAL_EDGE') {
      const baseAlpha = visibleNodes.length > 500 ? 0.20 : (visibleNodes.length > 100 ? 0.35 : 0.50);
      const alpha = Math.min(1.0, (baseAlpha + e.weight * 0.30) * edgeOpacity);
      return `rgba(255,255,255,${alpha.toFixed(2)})`;
    }
    const baseAlpha = 0.25 + e.weight * 0.25;
    const alpha = Math.min(1.0, baseAlpha * edgeOpacity);
    return `rgba(148,163,184,${alpha.toFixed(2)})`;
  }, [highlightedEdgeIds, highlightedNodeIds, hoveredEdge, selectedNodeConnections, visibleNodes.length, edgeOpacity]);

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
    // Generous hit radius clamped between reasonable bounds so zoomed out shadow canvas doesn't explode
    const hitRadius = Math.min(24, Math.max(8 / globalScale, r * 1.6));
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

  // Memoize particle accessors with stable function identity (disabled for large graphs to guarantee 60 FPS)
  const getLinkDirectionalParticles = useCallback((link: any) => {
    if (visibleLinks.length > 300) return 0;
    const e = link as GraphEdge;
    return e.edgeType === 'REAL_EDGE' ? 2 : 0;
  }, [visibleLinks.length]);

  const getLinkDirectionalParticleColor = useCallback(() => {
    return isImdb ? accentColor : 'rgba(255, 255, 255, 0.92)';
  }, [isImdb, accentColor]);

  // ── Dynamic Auto-Freeze Simulation Parameters based on node count ───────────────
  const simulationParams = useMemo(() => {
    const n = visibleNodes.length;
    if (!autoFreezeLayout) {
      return {
        warmupTicks: n > 1000 ? 10 : 30,
        cooldownTicks: Infinity,
        cooldownTime: Infinity,
        d3AlphaDecay: 0.003,
        d3VelocityDecay: 0.28,
      };
    }

    if (n <= 300) {
      return {
        warmupTicks: 30,
        cooldownTicks: 160,
        cooldownTime: 3500,
        d3AlphaDecay: 0.020,
        d3VelocityDecay: 0.38,
      };
    } else if (n <= 1000) {
      return {
        warmupTicks: 20,
        cooldownTicks: 280,
        cooldownTime: 7000,
        d3AlphaDecay: 0.012,
        d3VelocityDecay: 0.35,
      };
    } else if (n <= 2000) {
      return {
        warmupTicks: 15,
        cooldownTicks: 420,
        cooldownTime: 11000,
        d3AlphaDecay: 0.007,
        d3VelocityDecay: 0.31,
      };
    } else {
      // Massive graphs (2000+ nodes): ample time & low velocity friction to untangle and glide into equilibrium
      return {
        warmupTicks: 10,
        cooldownTicks: 600,
        cooldownTime: 16000,
        d3AlphaDecay: 0.0045,
        d3VelocityDecay: 0.26,
      };
    }
  }, [visibleNodes.length, autoFreezeLayout]);

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
          warmupTicks={simulationParams.warmupTicks}
          cooldownTicks={simulationParams.cooldownTicks}
          cooldownTime={simulationParams.cooldownTime}
          d3AlphaDecay={simulationParams.d3AlphaDecay}
          d3VelocityDecay={simulationParams.d3VelocityDecay}
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
            hoveredNodeRef.current = node ? (node as GraphNode) : null;
            setHoveredNode(node ? (node as GraphNode) : null);
            document.body.style.cursor = node ? 'pointer' : 'default';
          }}
          onNodeDrag={(node: any) => {
            const isIsolated = isModifierPressedRef.current || isIsolatedDragRef.current;

            if (isIsolated) {
              isIsolatedDragRef.current = true;

              // 1. Keep simulation alpha target at 0 so no kinetic energy is pumped into the network
              graphRef.current?.d3AlphaTarget?.(0);

              // 2. Temporarily set link force strength to 0 so no connected nodes (even 1st-hop) are pulled
              const linkForce = graphRef.current?.d3Force?.('link');
              if (linkForce && prevLinkStrengthRef.current === null) {
                prevLinkStrengthRef.current = linkForce.strength();
                linkForce.strength(0);
              }

              // 3. Fix ALL other nodes at their exact coordinates so not even 1st-hop neighbors move
              const internalData = graphRef.current?.graphData?.();
              const allNodes = internalData?.nodes || visibleNodes;
              for (let i = 0; i < allNodes.length; i++) {
                const n = allNodes[i] as any;
                if (n.id !== node.id && typeof n.x === 'number' && typeof n.y === 'number') {
                  n.fx = n.x;
                  n.fy = n.y;
                  n.vx = 0;
                  n.vy = 0;
                }
              }

              // 4. Move ONLY the dragged node with the cursor
              node.fx = node.x;
              node.fy = node.y;
              node.vx = 0;
              node.vy = 0;
            } else {
              // Elastic move (Normal spring drag without modifier keys):
              // Dragging this node pulls connected nodes with spring physics
              isIsolatedDragRef.current = false;

              // Restore link strength if returning to normal spring drag
              if (prevLinkStrengthRef.current !== null) {
                const linkForce = graphRef.current?.d3Force?.('link');
                linkForce?.strength?.(prevLinkStrengthRef.current);
                prevLinkStrengthRef.current = null;
              }

              // Unpin nodes that aren't permanently pinned
              const internalData = graphRef.current?.graphData?.();
              const allNodes = internalData?.nodes || visibleNodes;
              for (let i = 0; i < allNodes.length; i++) {
                const n = allNodes[i] as any;
                if (n.id !== node.id && !n.__userPinned) {
                  n.fx = undefined;
                  n.fy = undefined;
                }
              }
              node.fx = node.x;
              node.fy = node.y;
            }
          }}
          onNodeDragEnd={(node: any) => {
            const isIsolated = isIsolatedDragRef.current;

            // Restore link force if it was zeroed
            if (prevLinkStrengthRef.current !== null) {
              const linkForce = graphRef.current?.d3Force?.('link');
              linkForce?.strength?.(prevLinkStrengthRef.current);
              prevLinkStrengthRef.current = null;
            }

            if (isIsolated) {
              // Isolated single node move finished:
              // Keep this node pinned at its newly placed location!
              node.fx = node.x;
              node.fy = node.y;
              node.vx = 0;
              node.vy = 0;
              node.__userPinned = true;

              // Release other nodes so future normal drags can move them
              const internalData = graphRef.current?.graphData?.();
              const allNodes = internalData?.nodes || visibleNodes;
              for (let i = 0; i < allNodes.length; i++) {
                const n = allNodes[i] as any;
                if (n.id !== node.id && !n.__userPinned) {
                  n.fx = undefined;
                  n.fy = undefined;
                }
              }
            } else {
              // Normal spring drag: unpin dragged node so it settles naturally with the network
              if (!node.__userPinned) {
                node.fx = undefined;
                node.fy = undefined;
              }
            }

            if (!autoFreezeLayout) {
              graphRef.current?.d3AlphaTarget?.(0.015);
              graphRef.current?.d3ReheatSimulation?.();
            } else {
              graphRef.current?.d3AlphaTarget?.(0);
            }
            isIsolatedDragRef.current = false;
            isModifierPressedRef.current = false;
          }}
          onLinkClick={(link: any) => setEditingEdge(link as GraphEdge)}
          onLinkHover={(link: any) => {
            setHoveredEdge(link ? (link as GraphEdge) : null);
            document.body.style.cursor = link ? 'pointer' : 'default';
          }}
          enableNodeDrag={!visualConnectMode}
          enableZoomInteraction
          enablePanInteraction={(ev: any) => {
            // When any modifier key is held, NEVER pan canvas (user intends single-node move)
            if (ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.altKey || isModifierPressedRef.current) {
              return false;
            }
            // When mouse is over a node, NEVER pan canvas
            if (hoveredNodeRef.current) return false;
            return true;
          }}
          minZoom={0.15}
          maxZoom={10}
        />
      )}

      {isLoading && visibleNodes.length > 0 && (
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
