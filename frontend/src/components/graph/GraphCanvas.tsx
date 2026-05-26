'use client';

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useGraphStore } from '@/store/graphStore';
import { GraphNode, GraphEdge } from '@/types/graph';
import NodeTooltip from '@/components/ui/NodeTooltip';
import EdgeTooltip from '@/components/ui/EdgeTooltip';
import NodeProfileModal from '@/components/modals/NodeProfileModal';
import EdgeEditorModal from '@/components/modals/EdgeEditorModal';

// react-force-graph-2d: 2D only, no A-Frame / Three.js overhead
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-void)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: '2px solid var(--neon-blue)',
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <span className="text-label" style={{ color: 'var(--neon-blue)' }}>Loading Graph Engine…</span>
      </div>
    </div>
  ),
});

// Community Tailored colors mapping
function getClusterColor(cluster?: string): string {
  if (!cluster) return '#64748b'; // slate
  switch (cluster.toLowerCase()) {
    case 'tech': return '#06b6d4'; // Cyan
    case 'finance': return '#10b981'; // Emerald
    case 'health': return '#f59e0b'; // Amber
    case 'venture': return '#8b5cf6'; // Violet
    case 'academia': return '#6366f1'; // Indigo
    default: return '#64748b';
  }
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(100,116,139,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function GraphCanvas() {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  const {
    visibleNodes, visibleLinks,
    selectedNode, hoveredNode, hoveredEdge,
    highlightedNodeIds, highlightedEdgeIds,
    isLoading,
    workspaceMode, visualConnectMode, connectorSourceNode,
    selectNode, setHoveredNode, setHoveredEdge, clearHighlights,
    setConnectorSourceNode, setVisualConnectMode,
  } = useGraphStore();

  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [edgeTooltipPos, setEdgeTooltipPos] = useState({ x: 0, y: 0 });

  // Workspace Local Modal triggers
  const [editingEdge, setEditingEdge] = useState<GraphEdge | null>(null);
  const [creatingEdgeData, setCreatingEdgeData] = useState<{ sourceId: string; targetId: string } | null>(null);

  // precompute bridge nodes based on visible graph schema
  const bridgeNodes = useMemo(() => {
    const bridgeSet = new Set<string>();
    const clusterMap = new Map<string, string>();
    
    for (const node of visibleNodes) {
      if (node.cluster) clusterMap.set(node.id, node.cluster);
    }
    
    const nodeNeighborClusters = new Map<string, Set<string>>();
    for (const link of visibleLinks) {
      const src = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const tgt = typeof link.target === 'string' ? link.target : (link.target as any).id;
      
      const srcCluster = clusterMap.get(src);
      const tgtCluster = clusterMap.get(tgt);
      
      if (srcCluster) {
        if (!nodeNeighborClusters.has(tgt)) nodeNeighborClusters.set(tgt, new Set());
        nodeNeighborClusters.get(tgt)!.add(srcCluster);
      }
      if (tgtCluster) {
        if (!nodeNeighborClusters.has(src)) nodeNeighborClusters.set(src, new Set());
        nodeNeighborClusters.get(src)!.add(tgtCluster);
      }
    }
    
    for (const [nodeId, clusters] of nodeNeighborClusters.entries()) {
      const node = visibleNodes.find(n => n.id === nodeId);
      if (node && node.cluster) {
        clusters.add(node.cluster);
      }
      if (clusters.size > 1) {
        bridgeSet.add(nodeId);
      }
    }
    
    return bridgeSet;
  }, [visibleNodes, visibleLinks]);

  // Track container dimensions
  useEffect(() => {
    function update() {
      if (containerRef.current) {
        setDimensions({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
        });
      }
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Track mouse for tooltips
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
      setEdgeTooltipPos({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  // Re-center when graph data changes
  useEffect(() => {
    if (graphRef.current) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(600, 80);
      }, 400);
    }
  }, [visibleNodes.length]);

  // ── Node color ──────────────────────────────────────────────
  const getNodeColor = useCallback((node: any) => {
    const n = node as GraphNode;
    const isConnectorSource = connectorSourceNode?.id === n.id;
    const isHighlighted = highlightedNodeIds.size === 0 || highlightedNodeIds.has(n.id);
    const isSelected = selectedNode?.id === n.id;
    const isHovered = hoveredNode?.id === n.id;

    if (isConnectorSource) return '#8b5cf6'; // pulsing violet in linking mode
    if (isSelected) return '#a78bfa'; // focal violet
    
    // Cluster colored community mapping V3.0
    if (n.cluster) {
      const baseColor = getClusterColor(n.cluster);
      if (!isHighlighted) return hexToRgba(baseColor, 0.18);
      if (isHovered) return baseColor;
      return baseColor;
    }

    if (n.nodeType === 'REAL') {
      if (!isHighlighted) return 'rgba(6,182,212,0.2)';
      if (isHovered) return '#67e8f9';
      return '#06b6d4';
    } else {
      if (!isHighlighted) return 'rgba(100,116,139,0.15)';
      if (isHovered) return '#94a3b8';
      return '#64748b';
    }
  }, [highlightedNodeIds, selectedNode, hoveredNode, connectorSourceNode]);

  // ── Node size ───────────────────────────────────────────────
  const getNodeSize = useCallback((node: any) => {
    const n = node as GraphNode;
    const base = n.nodeType === 'REAL' ? 5.5 + (n.influenceScore / 100) * 5 : 4.2;
    if (hoveredNode?.id === n.id) return base * 1.45;
    if (selectedNode?.id === n.id) return base * 1.55;
    return base;
  }, [hoveredNode, selectedNode]);

  // ── Node canvas rendering ────────────────────────────────────
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode;
    if (!isFinite(node.x) || !isFinite(node.y)) return;

    const r = getNodeSize(n);
    const color = getNodeColor(n);
    const isReal = n.nodeType === 'REAL';
    const isHovered = hoveredNode?.id === n.id;
    const isSelected = selectedNode?.id === n.id;
    const isConnectorSource = connectorSourceNode?.id === n.id;
    const isHighlighted = highlightedNodeIds.size === 0 || highlightedNodeIds.has(n.id);

    ctx.save();

    // 1. Soft cluster halos rendering behind nodes (V3.0)
    if (n.cluster && isHighlighted) {
      const clusterColor = getClusterColor(n.cluster);
      const glowScale = isSelected ? 3.0 : isHovered ? 2.6 : 2.2;
      const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * glowScale);
      const alpha = isSelected ? 0.25 : isHovered ? 0.2 : 0.08;
      grad.addColorStop(0, hexToRgba(clusterColor, alpha));
      grad.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * glowScale, 0, 2 * Math.PI);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // 2. Connector linking selection ring
    if (isConnectorSource) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 2.2, 0, 2 * Math.PI);
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]); // reset
    }

    // 3. Special Bridge Node glowing rings (V3.0)
    if (bridgeNodes.has(n.id) && isHighlighted) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 1.5, 0, 2 * Math.PI);
      ctx.strokeStyle = '#8b5cf6'; // glowing violet double-stroke ring
      ctx.lineWidth = isHovered ? 1.5 : 0.9;
      ctx.stroke();
    }

    // Node core circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Stroke
    if (isSelected || isConnectorSource) {
      ctx.strokeStyle = isConnectorSource ? '#8b5cf6' : '#a78bfa';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    } else if (isHovered && isReal) {
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (isReal) {
      ctx.strokeStyle = n.cluster ? hexToRgba(getClusterColor(n.cluster), 0.5) : 'rgba(6,182,212,0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Label — only at zoom > 2 or for hovered
    if (globalScale > 2.2 || isHovered || isSelected || isConnectorSource) {
      ctx.font = `${isSelected || isConnectorSource ? 600 : 400} ${Math.max(3.2, 9 / globalScale)}px Outfit, Inter, sans-serif`;
      ctx.fillStyle = isReal ? '#f1f5f9' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.fullName, node.x, node.y + r + 2.5);
    }

    ctx.restore();
  }, [getNodeColor, getNodeSize, hoveredNode, selectedNode, highlightedNodeIds, connectorSourceNode, bridgeNodes]);


  // ── Link color ──────────────────────────────────────────────
  const getLinkColor = useCallback((link: any) => {
    const e = link as GraphEdge;
    const isHighlighted = highlightedEdgeIds.size === 0 || highlightedEdgeIds.has(e.id);
    const isHovered = hoveredEdge?.id === e.id;
    const isTracedOptimalPath = highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0;

    if (isTracedOptimalPath) return '#a78bfa'; // Bright glowing violet for optimal paths!
    if (e.edgeType === 'REAL_EDGE') {
      if (!isHighlighted) return 'rgba(59,130,246,0.06)';
      if (isHovered) return '#60a5fa';
      return `rgba(59,130,246,${0.25 + e.weight * 0.4})`;
    } else {
      if (!isHighlighted) return 'rgba(71,85,105,0.04)';
      if (isHovered) return '#475569';
      return `rgba(71,85,105,${0.15 + e.weight * 0.25})`;
    }
  }, [highlightedEdgeIds, hoveredEdge]);

  const getLinkWidth = useCallback((link: any) => {
    const e = link as GraphEdge;
    const isHovered = hoveredEdge?.id === e.id;
    const isTracedOptimalPath = highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0;
    
    if (isTracedOptimalPath) return 3.2; // Widen path tracers
    const base = e.edgeType === 'REAL_EDGE' ? 1 + e.weight * 1.5 : 0.5 + e.weight * 0.5;
    return isHovered ? base * 2 : base;
  }, [hoveredEdge, highlightedEdgeIds]);

  return (
    <div
      ref={containerRef}
      className="graph-container"
      onClick={() => clearHighlights()}
    >
      {/* Ambient background */}
      <div className="graph-canvas-bg" />

      {/* Force Graph */}
      {dimensions.w > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={{ nodes: visibleNodes as any, links: visibleLinks as any }}
          width={dimensions.w}
          height={dimensions.h}
          backgroundColor="transparent"
          // Node rendering
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => 'replace'}
          nodeVal={getNodeSize}
          // Link rendering
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          linkCurvature={0.08}
          // Accelerated cinematic path particles (V3.0)
          linkDirectionalParticles={(link: any) => {
            const e = link as GraphEdge;
            if (highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0) return 6; // accelerate!
            return e.edgeType === 'REAL_EDGE' ? 2 : 0;
          }}
          linkDirectionalParticleWidth={(link: any) => {
            const e = link as GraphEdge;
            if (highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0) return 3.5;
            return 1.5 + e.weight;
          }}
          linkDirectionalParticleColor={(link: any) => {
            const e = link as GraphEdge;
            if (highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0) return '#a78bfa';
            return e.edgeType === 'REAL_EDGE' ? '#3b82f6' : '#475569';
          }}
          linkDirectionalParticleSpeed={(link: any) => {
            const e = link as GraphEdge;
            if (highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0) return 0.012; // super accelerated!
            return 0.004;
          }}
          // Physics
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.3}
          cooldownTicks={120}
          // Interactions
          onNodeClick={(node: any) => {
            const n = node as GraphNode;
            if (workspaceMode && visualConnectMode) {
              if (!connectorSourceNode) {
                setConnectorSourceNode(n);
              } else if (connectorSourceNode.id === n.id) {
                setConnectorSourceNode(null);
              } else {
                if (connectorSourceNode.nodeType === 'DEMO' && n.nodeType === 'REAL') {
                  alert('Graph Constraints Blocked: Spawn paths from DEMO expansion nodes into REAL database nodes are strictly prohibited.');
                  setConnectorSourceNode(null);
                  setVisualConnectMode(false);
                  return;
                }
                setCreatingEdgeData({
                  sourceId: connectorSourceNode.id,
                  targetId: n.id,
                });
                setVisualConnectMode(false);
                setConnectorSourceNode(null);
              }
            } else {
              selectNode(n);
            }
          }}
          onNodeHover={(node: any) => {
            setHoveredNode(node ? (node as GraphNode) : null);
            document.body.style.cursor = node ? 'pointer' : 'default';
          }}
          onLinkClick={(link: any) => {
            const e = link as GraphEdge;
            if (workspaceMode) {
              setEditingEdge(e);
            }
          }}
          onLinkHover={(link: any) => {
            setHoveredEdge(link ? (link as GraphEdge) : null);
            if (workspaceMode && link) {
              document.body.style.cursor = 'pointer';
            } else if (!hoveredNode) {
              document.body.style.cursor = 'default';
            }
          }}
          enableNodeDrag={!visualConnectMode}
          enableZoomInteraction
          enablePanInteraction
          minZoom={0.3}
          maxZoom={8}
        />
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(5,5,15,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 36, height: 36,
              border: '2px solid var(--neon-blue)', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
              margin: '0 auto 10px',
            }} />
            <span className="text-label" style={{ color: 'var(--neon-blue)' }}>Expanding Subgraph…</span>
          </div>
        </div>
      )}

      {/* Node tooltip */}
      {hoveredNode && !selectedNode && !visualConnectMode && (
        <NodeTooltip node={hoveredNode} x={tooltipPos.x} y={tooltipPos.y} />
      )}

      {/* Edge tooltip */}
      {hoveredEdge && !hoveredNode && !editingEdge && (
        <EdgeTooltip edge={hoveredEdge} x={edgeTooltipPos.x} y={edgeTooltipPos.y} />
      )}

      {/* Profile modal */}
      {selectedNode && (
        <NodeProfileModal
          node={selectedNode}
          onClose={() => selectNode(null)}
        />
      )}

      {/* Relationship Edge Editor modal */}
      {editingEdge && (
        <EdgeEditorModal
          edge={editingEdge}
          onClose={() => setEditingEdge(null)}
        />
      )}

      {/* Relationship Edge Creator modal */}
      {creatingEdgeData && (
        <EdgeEditorModal
          createData={creatingEdgeData}
          onClose={() => setCreatingEdgeData(null)}
        />
      )}
    </div>
  );
}
