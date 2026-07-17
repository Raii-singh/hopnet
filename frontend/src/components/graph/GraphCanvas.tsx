'use client';

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useGraphStore } from '@/store/graphStore';
import { GraphNode, GraphEdge } from '@/types/graph';
import NodeTooltip from '@/components/ui/NodeTooltip';
import EdgeTooltip from '@/components/ui/EdgeTooltip';
import NodeProfileModal from '@/components/modals/NodeProfileModal';
import EdgeEditorModal from '@/components/modals/EdgeEditorModal';

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

// ── College cluster palette ──────────────────────────────────────────────────
function getCollegeClusterColor(cluster?: string): string {
  if (!cluster) return '#64748b';
  switch (cluster.toLowerCase()) {
    case 'tech': return '#3b82f6';
    case 'finance': return '#10b981';
    case 'health': return '#f43f5e';
    case 'venture': return '#f59e0b';
    case 'academia': return '#8b5cf6';
    default: return '#64748b';
  }
}

// ── IMDb franchise palette ───────────────────────────────────────────────────
function getImdbClusterColor(cluster?: string): string {
  if (!cluster) return '#f59e0b';
  switch (cluster.toUpperCase()) {
    case 'MCU':    return '#ef4444';   // red
    case 'GOT':    return '#8b5cf6';   // purple
    case 'HP':     return '#3b82f6';   // blue
    case 'SW':     return '#14b8a6';   // teal
    case 'DC':     return '#f97316';   // orange
    case 'ACTION': return '#f59e0b';   // amber
    case 'GENZ':   return '#ec4899';   // pink
    case 'DRAMA':  return '#22c55e';   // green
    default:       return '#64748b';
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
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });

  const {
    visibleNodes, visibleLinks,
    selectedNode, hoveredNode, hoveredEdge,
    highlightedNodeIds, highlightedEdgeIds,
    isLoading,
    workspaceMode, visualConnectMode, connectorSourceNode,
    activeProvider, providerCapabilities,
    selectNode, setHoveredNode, setHoveredEdge, clearHighlights,
    setConnectorSourceNode, setVisualConnectMode,
    rootNodeId,
  } = useGraphStore();

  const tooltipContainerRef = useRef<HTMLDivElement>(null);
  const [editingEdge, setEditingEdge] = useState<GraphEdge | null>(null);
  const [creatingEdgeData, setCreatingEdgeData] = useState<{ sourceId: string; targetId: string } | null>(null);

  const isImdb = activeProvider === 'imdb';
  const accentColor = providerCapabilities.accentColor;

  function getClusterColor(cluster?: string): string {
    return isImdb ? getImdbClusterColor(cluster) : getCollegeClusterColor(cluster);
  }

  // ── Apply stronger physics forces for IMDb (spread nodes out) ──────────────
  useEffect(() => {
    const t = setTimeout(() => {
      if (!graphRef.current || !isImdb) return;
      const charge = graphRef.current.d3Force('charge');
      if (charge) charge.strength(-280);
      const link = graphRef.current.d3Force('link');
      if (link) link.distance(55);
      graphRef.current.d3ReheatSimulation?.();
    }, 150);
    return () => clearTimeout(t);
  }, [isImdb, visibleNodes.length]);

  // ── Auto-zoom-in and lock node coordinates for stable IMDb layout ──────────────
  useEffect(() => {
    if (!graphRef.current || visibleNodes.length === 0) return;

    // Timeout to let layout adjust before zooming in and freezing coordinates
    const timer = setTimeout(() => {
      // 1. Zoom in by default to show detailed premium view
      const rootNode = visibleNodes.find(n => n.id === rootNodeId) || visibleNodes[0];
      if (rootNode && typeof rootNode.x === 'number' && typeof rootNode.y === 'number') {
        graphRef.current.centerAt(rootNode.x, rootNode.y, 1000);
        graphRef.current.zoom(isImdb ? 2.6 : 2.0, 1000);
      }

      // 2. Lock IMDb node positions fully to completely stop drifting/jittering
      if (isImdb) {
        visibleNodes.forEach((n: any) => {
          if (typeof n.x === 'number' && typeof n.y === 'number') {
            n.fx = n.x;
            n.fy = n.y;
          }
        });
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [visibleNodes.length, rootNodeId, isImdb]);

  // ── Dynamic clean-up: un-freeze College graph nodes when active provider changes ──
  useEffect(() => {
    if (!isImdb && visibleNodes.length > 0) {
      visibleNodes.forEach((n: any) => {
        n.fx = undefined;
        n.fy = undefined;
      });
    }
  }, [isImdb, visibleNodes]);

  // ── Magnifier Map (PiP) Render Loop ───────────────────────────────────────
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas || visibleNodes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Find full graph coordinates bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    visibleNodes.forEach(n => {
      if (typeof n.x === 'number' && typeof n.y === 'number') {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      }
    });

    if (minX === Infinity) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padding = 10;
    const graphW = (maxX - minX) || 1;
    const graphH = (maxY - minY) || 1;
    const scale = Math.min((w - padding * 2) / graphW, (h - padding * 2) / graphH);
    const offsetX = (w - graphW * scale) / 2;
    const offsetY = (h - graphH * scale) / 2;

    // 1. Draw connections faintly to avoid clutter
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    visibleLinks.forEach(link => {
      const src = typeof link.source === 'object' ? link.source : visibleNodes.find(n => n.id === link.source);
      const tgt = typeof link.target === 'object' ? link.target : visibleNodes.find(n => n.id === link.target);
      if (src && tgt && typeof src.x === 'number' && typeof src.y === 'number' && typeof tgt.x === 'number' && typeof tgt.y === 'number') {
        ctx.beginPath();
        ctx.moveTo((src.x - minX) * scale + offsetX, (src.y - minY) * scale + offsetY);
        ctx.lineTo((tgt.x - minX) * scale + offsetX, (tgt.y - minY) * scale + offsetY);
        ctx.stroke();
      }
    });

    // 2. Draw nodes as tiny colored dots
    visibleNodes.forEach(n => {
      if (typeof n.x === 'number' && typeof n.y === 'number') {
        ctx.beginPath();
        ctx.arc((n.x - minX) * scale + offsetX, (n.y - minY) * scale + offsetY, n.influenceScore > 80 ? 2 : 1, 0, 2 * Math.PI);
        ctx.fillStyle = getClusterColor(n.cluster);
        ctx.fill();
      }
    });

    // 3. Draw viewport bounding box (red PiP indicator)
    const { k, x, y } = transform;
    const viewportMinX = -x / k;
    const viewportMinY = -y / k;
    const viewportMaxX = (dimensions.w - x) / k;
    const viewportMaxY = (dimensions.h - y) / k;

    const vx1 = (viewportMinX - minX) * scale + offsetX;
    const vy1 = (viewportMinY - minY) * scale + offsetY;
    const vx2 = (viewportMaxX - minX) * scale + offsetX;
    const vy2 = (viewportMaxY - minY) * scale + offsetY;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.beginPath();
    ctx.rect(vx1, vy1, vx2 - vx1, vy2 - vy1);
    ctx.fill();
    ctx.stroke();

  }, [visibleNodes, visibleLinks, transform, dimensions, isImdb]);

  // ── Hover connection sets ──────────────────────────────────────────────────
  const hoveredNodeConnections = useMemo(() => {
    if (!hoveredNode) return { nodeIds: new Set<string>(), edgeIds: new Set<string>() };
    const nodeIds = new Set<string>([hoveredNode.id]);
    const edgeIds = new Set<string>();
    for (const link of visibleLinks) {
      const src = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const tgt = typeof link.target === 'string' ? link.target : (link.target as any).id;
      if (src === hoveredNode.id) { nodeIds.add(tgt); edgeIds.add(link.id); }
      if (tgt === hoveredNode.id) { nodeIds.add(src); edgeIds.add(link.id); }
    }
    return { nodeIds, edgeIds };
  }, [hoveredNode, visibleLinks]);

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

  // ── Mouse tracking (Direct DOM manipulation for 60fps performance without React re-renders) ───────────────────────────────────
  useEffect(() => {
    function onMM(e: MouseEvent) {
      if (tooltipContainerRef.current) {
        tooltipContainerRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    }
    window.addEventListener('mousemove', onMM);
    return () => window.removeEventListener('mousemove', onMM);
  }, []);

  // ── Node color ────────────────────────────────────────────────────────────
  const getNodeColor = useCallback((node: any) => {
    const n = node as GraphNode;
    const isHighlighted = highlightedNodeIds.size === 0 || highlightedNodeIds.has(n.id);
    const isConnectorSource = connectorSourceNode?.id === n.id;
    const isSelected = selectedNode?.id === n.id;
    const isHovered = hoveredNode?.id === n.id;
    const isConnectedToHovered = hoveredNodeConnections.nodeIds.has(n.id);
    const hasActiveHover = hoveredNode !== null;

    let color: string;
    if (isImdb) {
      color = n.cluster ? getImdbClusterColor(n.cluster) : accentColor;
    } else {
      if (isConnectorSource || isSelected) color = '#ffffff';
      else if (n.cluster) color = getCollegeClusterColor(n.cluster);
      else if (n.nodeType === 'REAL') color = '#ffffff';
      else color = '#64748b';
    }

    if (!isHighlighted) return hexToRgba(color, 0.12);
    if (hasActiveHover && !isHovered && !isConnectedToHovered) return hexToRgba(color, 0.12);
    if (isHovered || isConnectedToHovered) return color;
    return hexToRgba(color, 0.88);
  }, [highlightedNodeIds, selectedNode, hoveredNode, connectorSourceNode, hoveredNodeConnections, isImdb, accentColor]);

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
    const isConnectedToHovered = hoveredNodeConnections.nodeIds.has(n.id);
    const hasActiveHover = hoveredNode !== null;

    // Subtle breathing
    const charCode = n.fullName?.charCodeAt(0) ?? n.id?.charCodeAt(0) ?? 0;
    const breathingOffset = Math.sin(Date.now() * 0.002 + charCode) * 0.15;
    const ar = r + breathingOffset;

    ctx.save();

    // Cluster halo
    if (n.cluster && isHighlighted && (!hasActiveHover || isHovered || isConnectedToHovered)) {
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
    if (bridgeNodes.has(n.id) && isHighlighted && (!hasActiveHover || isHovered || isConnectedToHovered)) {
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
    } else if (isReal && (!hasActiveHover || isConnectedToHovered)) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.9; ctx.stroke();
    }

    // ── ALWAYS-VISIBLE LABELS ──────────────────────────────────────────────
    if (n.fullName) {
      const displayName = n.fullName.length > 20 ? n.fullName.slice(0, 20) + '…' : n.fullName;
      // Font scales with zoom but stays readable: constant screen size ~8px
      const fontSize = Math.max(3.5, 8 / globalScale);
      const isBold = isSelected || isConnectorSource || isHovered;
      const labelAlpha = isSelected || isHovered || isConnectorSource ? 1.0
        : isConnectedToHovered ? 0.95
        : hasActiveHover ? 0.08
        : (!isHighlighted ? 0.07 : (isImdb ? 0.80 : 0.75));

      ctx.font = `${isBold ? 600 : 400} ${fontSize}px Outfit, Inter, sans-serif`;
      ctx.fillStyle = `rgba(255,255,255,${labelAlpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(displayName, node.x, node.y + ar + 2.5);
    }

    ctx.restore();
  }, [getNodeColor, getNodeSize, hoveredNode, selectedNode, highlightedNodeIds, connectorSourceNode, bridgeNodes, hoveredNodeConnections, isImdb]);

  // ── Link color ────────────────────────────────────────────────────────────
  const getLinkColor = useCallback((link: any) => {
    const e = link as GraphEdge;
    const isHighlighted = highlightedEdgeIds.size === 0 || highlightedEdgeIds.has(e.id);
    const isHovered = hoveredEdge?.id === e.id;
    const isTraced = highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0;
    const isConnectedToHovered = hoveredNodeConnections.edgeIds.has(e.id);
    const hasActiveHover = hoveredNode !== null;

    if (hasActiveHover && !isConnectedToHovered) return 'rgba(255,255,255,0.012)';
    if (isTraced) return isImdb ? accentColor : '#ffffff';
    if (isHovered || isConnectedToHovered) return isImdb ? `${accentColor}cc` : 'rgba(255,255,255,0.9)';
    if (e.edgeType === 'REAL_EDGE') {
      if (!isHighlighted) return 'rgba(255,255,255,0.05)';
      return isImdb ? hexToRgba(accentColor, 0.22 + e.weight * 0.28) : `rgba(255,255,255,${0.20 + e.weight * 0.22})`;
    }
    if (!isHighlighted) return 'rgba(255,255,255,0.025)';
    return `rgba(255,255,255,${0.08 + e.weight * 0.08})`;
  }, [highlightedEdgeIds, hoveredEdge, hoveredNode, hoveredNodeConnections, isImdb, accentColor]);

  const getLinkWidth = useCallback((link: any) => {
    const e = link as GraphEdge;
    const isHovered = hoveredEdge?.id === e.id;
    const isTraced = highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0;
    const isConnected = hoveredNodeConnections.edgeIds.has(e.id);
    if (isTraced) return 3;
    const base = e.edgeType === 'REAL_EDGE' ? 0.8 + e.weight * 0.9 : 0.5 + e.weight * 0.4;
    return (isHovered || isConnected) ? base * 2 : base;
  }, [hoveredEdge, highlightedEdgeIds, hoveredNodeConnections]);

  return (
    <div ref={containerRef} className="graph-container" onClick={() => clearHighlights()}>
      <div className="graph-canvas-bg" />

      {dimensions.w > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={{ nodes: visibleNodes as any, links: visibleLinks as any }}
          width={dimensions.w}
          height={dimensions.h}
          backgroundColor="transparent"
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => 'replace'}
          nodeVal={getNodeSize}
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          linkCurvature={isImdb ? 0.10 : 0.08}
          linkDirectionalParticles={(link: any) => {
            const e = link as GraphEdge;
            return e.edgeType === 'REAL_EDGE' ? 2 : 0;
          }}
          linkDirectionalParticleWidth={1.4}
          linkDirectionalParticleColor={() => isImdb ? accentColor : '#ffffff'}
          linkDirectionalParticleSpeed={0.003}
          // Pre-run layout then keep engine alive forever for always-on particles
          warmupTicks={isImdb ? 180 : 0}
          cooldownTicks={Infinity}
          cooldownTime={Infinity}
          d3AlphaDecay={isImdb ? 0.03 : 0.015}
          d3VelocityDecay={isImdb ? 0.4 : 0.3}
          onZoom={(t) => setTransform({ k: t.k, x: t.x, y: t.y })}
          onNodeClick={(node: any) => {
            const n = node as GraphNode;
            if (workspaceMode && visualConnectMode) {
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
              selectNode(n);
            }
          }}
          onNodeHover={(node: any) => {
            // Keep locked position on hover
            if (hoveredNodeRef.current && hoveredNodeRef.current !== node) {
              if (!isImdb) {
                hoveredNodeRef.current.fx = undefined;
                hoveredNodeRef.current.fy = undefined;
              }
            }
            if (node) {
              node.fx = node.x;
              node.fy = node.y;
              hoveredNodeRef.current = node;
            } else {
              if (!isImdb) hoveredNodeRef.current = null;
            }
            setHoveredNode(node ? (node as GraphNode) : null);
            document.body.style.cursor = node ? 'pointer' : 'default';
          }}
          onNodeDrag={(node: any) => {
            node.fx = node.x;
            node.fy = node.y;
          }}
          onNodeDragEnd={(node: any) => {
            if (isImdb) {
              node.fx = node.x;
              node.fy = node.y; // Pin position stably after drag
            } else {
              node.fx = undefined;
              node.fy = undefined;
            }
          }}
          onLinkClick={(link: any) => { if (workspaceMode) setEditingEdge(link as GraphEdge); }}
          onLinkHover={(link: any) => {
            setHoveredEdge(link ? (link as GraphEdge) : null);
            document.body.style.cursor = (workspaceMode && link) ? 'pointer' : 'default';
          }}
          enableNodeDrag={!visualConnectMode}
          enableZoomInteraction
          enablePanInteraction
          minZoom={0.15}
          maxZoom={10}
        />
      )}

      {/* Floating Picture-in-Picture Magnifier Map (PiP Overview) */}
      {dimensions.w > 0 && visibleNodes.length > 0 && !isLoading && (
        <div className="pip-zoom-minimap glass-panel animate-fade-in" style={{
          position: 'fixed',
          bottom: 24,
          left: 268,
          width: 172,
          height: 122,
          zIndex: 500,
          padding: '6px',
          background: 'rgba(5, 5, 5, 0.72)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          pointerEvents: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
            <span style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--silver-400)', fontWeight: 700 }}>Overview Map (PiP)</span>
            <span style={{ fontSize: '7.5px', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444' }} />
              PIP
            </span>
          </div>
          <div style={{ position: 'relative', width: '100%', height: 96, background: 'rgba(0,0,0,0.35)', borderRadius: '4px', overflow: 'hidden' }}>
            <canvas ref={minimapCanvasRef} width={158} height={96} style={{ display: 'block' }} />
          </div>
        </div>
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

      {/* Floating Tooltip Container (Directly animated in DOM to ensure no re-renders and smooth particles) */}
      <div
        ref={tooltipContainerRef}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          pointerEvents: 'none',
          zIndex: 1000,
          display: (hoveredNode && !selectedNode && !visualConnectMode) || (hoveredEdge && !hoveredNode && !editingEdge) ? 'block' : 'none',
          transform: 'translate3d(0, 0, 0)',
        }}
      >
        {hoveredNode && !selectedNode && !visualConnectMode && (
          <NodeTooltip node={hoveredNode} />
        )}
        {hoveredEdge && !hoveredNode && !editingEdge && (
          <EdgeTooltip edge={hoveredEdge} />
        )}
      </div>
      {selectedNode && <NodeProfileModal node={selectedNode} onClose={() => selectNode(null)} />}
      {editingEdge && <EdgeEditorModal edge={editingEdge} onClose={() => setEditingEdge(null)} />}
      {creatingEdgeData && <EdgeEditorModal createData={creatingEdgeData} onClose={() => setCreatingEdgeData(null)} />}
    </div>
  );
}
