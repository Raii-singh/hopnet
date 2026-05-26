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
          width: 32, height: 32, border: '2px solid rgba(255,255,255,0.2)',
          borderTopColor: '#ffffff', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <span className="text-label" style={{ color: 'var(--silver-400)' }}>Syncing Spatial Matrix…</span>
      </div>
    </div>
  ),
});

// Community Tailored colors mapping (Monochromatic Silver/Chrome shades V3.5)
function getClusterColor(cluster?: string): string {
  if (!cluster) return '#64748b'; // Slate slate
  switch (cluster.toLowerCase()) {
    case 'tech': return '#ffffff';      // Pure White Highlight
    case 'finance': return '#f1f5f9';   // Platinum Light
    case 'health': return '#cbd5e1';    // Titanium Silver
    case 'venture': return '#94a3b8';   // Silver Steel
    case 'academia': return '#475569';  // Muted Slate
    default: return '#64748b';
  }
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
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

  // Compute active connection sets on hover for propagation responses V3.5
  const hoveredNodeConnections = useMemo(() => {
    if (!hoveredNode) return { nodeIds: new Set<string>(), edgeIds: new Set<string>() };
    const nodeIds = new Set<string>([hoveredNode.id]);
    const edgeIds = new Set<string>();
    
    for (const link of visibleLinks) {
      const src = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const tgt = typeof link.target === 'string' ? link.target : (link.target as any).id;
      if (src === hoveredNode.id) {
        nodeIds.add(tgt);
        edgeIds.add(link.id);
      }
      if (tgt === hoveredNode.id) {
        nodeIds.add(src);
        edgeIds.add(link.id);
      }
    }
    return { nodeIds, edgeIds };
  }, [hoveredNode, visibleLinks]);

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
    const isConnectedToHovered = hoveredNodeConnections.nodeIds.has(n.id);
    const hasActiveHover = hoveredNode !== null;

    let color = '#ffffff';

    if (isConnectorSource) color = '#ffffff'; // pure white in linking mode
    else if (isSelected) color = '#ffffff';
    else if (n.cluster) {
      color = getClusterColor(n.cluster);
    } else if (n.nodeType === 'REAL') {
      color = '#e2e8f0'; // platinum
    } else {
      color = '#475569'; // charcoal slate
    }

    // High Depth Fading: if static highlight selection is active and this node is skipped
    if (!isHighlighted) {
      return hexToRgba(color, 0.08);
    }

    // High Depth Fading: if hovering a node and this node is not connected to it
    if (hasActiveHover && !isHovered && !isConnectedToHovered) {
      return hexToRgba(color, 0.08);
    }

    // Bright highlights on hover focus
    if (isHovered || isConnectedToHovered) {
      return color;
    }

    return hexToRgba(color, 0.7);
  }, [highlightedNodeIds, selectedNode, hoveredNode, connectorSourceNode, hoveredNodeConnections]);

  // ── Node size ───────────────────────────────────────────────
  const getNodeSize = useCallback((node: any) => {
    const n = node as GraphNode;
    const base = n.nodeType === 'REAL' ? 5.5 + (n.influenceScore / 100) * 5 : 4.2;
    if (hoveredNode?.id === n.id) return base * 1.35;
    if (selectedNode?.id === n.id) return base * 1.45;
    return base;
  }, [hoveredNode, selectedNode]);

  // ── Node canvas rendering (High-End Spatial Outlines V3.5) ──
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
    const isConnectedToHovered = hoveredNodeConnections.nodeIds.has(n.id);
    const hasActiveHover = hoveredNode !== null;

    // Subtle node breathing animation (lerp sync wave)
    const time = Date.now() * 0.0022;
    const breathingOffset = Math.sin(time + n.fullName.charCodeAt(0)) * 0.22;
    const adjustedRadius = r + breathingOffset;

    ctx.save();

    // 1. Soft cluster halos rendering behind nodes (Translucent Platinum glow)
    if (n.cluster && isHighlighted && (!hasActiveHover || isHovered || isConnectedToHovered)) {
      const clusterColor = getClusterColor(n.cluster);
      const glowScale = isSelected ? 3.0 : isHovered ? 2.6 : 2.2;
      const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, adjustedRadius * glowScale);
      const alpha = isSelected ? 0.16 : isHovered ? 0.1 : 0.04;
      grad.addColorStop(0, hexToRgba(clusterColor, alpha));
      grad.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, adjustedRadius * glowScale, 0, 2 * Math.PI);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // 2. Connector linking selection ring (Faint chrome dash)
    if (isConnectorSource) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, adjustedRadius * 2.2, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]); // reset
    }

    // 3. Special Bridge Node glowing rings (Sleek Silver Double-Stroke)
    if (bridgeNodes.has(n.id) && isHighlighted && (!hasActiveHover || isHovered || isConnectedToHovered)) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, adjustedRadius * 1.5, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = isHovered ? 1.2 : 0.8;
      ctx.stroke();
    }

    // Node core circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, adjustedRadius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Outlines
    if (isSelected || isConnectorSource) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else if (isHovered && isReal) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (isReal && (!hasActiveHover || isConnectedToHovered)) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    } else if (isReal) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }

    // Label — spatial Outfit typography hierarchy
    const labelAlpha = isSelected || isHovered || isConnectorSource ? 1.0 : isConnectedToHovered ? 0.8 : hasActiveHover ? 0.06 : 0.55;
    if (globalScale > 2.2 || isHovered || isSelected || isConnectorSource || isConnectedToHovered) {
      ctx.font = `${isSelected || isConnectorSource ? 600 : 400} ${Math.max(3.2, 8.5 / globalScale)}px Outfit, Inter, sans-serif`;
      ctx.fillStyle = isReal ? `rgba(255, 255, 255, ${labelAlpha})` : `rgba(148, 163, 184, ${labelAlpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.fullName, node.x, node.y + adjustedRadius + 3.0);
    }

    ctx.restore();
  }, [getNodeColor, getNodeSize, hoveredNode, selectedNode, highlightedNodeIds, connectorSourceNode, bridgeNodes, hoveredNodeConnections]);

  // ── Link color (Monochromatic Silver flow) ──────────────────
  const getLinkColor = useCallback((link: any) => {
    const e = link as GraphEdge;
    const isHighlighted = highlightedEdgeIds.size === 0 || highlightedEdgeIds.has(e.id);
    const isHovered = hoveredEdge?.id === e.id;
    const isTracedOptimalPath = highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0;
    const isConnectedToHovered = hoveredNodeConnections.edgeIds.has(e.id);
    const hasActiveHover = hoveredNode !== null;

    // Cinematic Hover Depth Fading: dim unconnected paths
    if (hasActiveHover && !isConnectedToHovered) {
      return 'rgba(255, 255, 255, 0.015)';
    }

    if (isTracedOptimalPath) return '#ffffff'; // Glowing white for optimal paths
    if (isHovered || isConnectedToHovered) return 'rgba(255, 255, 255, 0.5)'; // bright silver

    if (e.edgeType === 'REAL_EDGE') {
      if (!isHighlighted) return 'rgba(255, 255, 255, 0.03)';
      return `rgba(255, 255, 255, ${0.1 + e.weight * 0.15})`;
    } else {
      if (!isHighlighted) return 'rgba(255, 255, 255, 0.01)';
      return `rgba(255, 255, 255, ${0.03 + e.weight * 0.05})`;
    }
  }, [highlightedEdgeIds, hoveredEdge, hoveredNode, hoveredNodeConnections]);

  const getLinkWidth = useCallback((link: any) => {
    const e = link as GraphEdge;
    const isHovered = hoveredEdge?.id === e.id;
    const isTracedOptimalPath = highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0;
    const isConnectedToHovered = hoveredNodeConnections.edgeIds.has(e.id);
    
    if (isTracedOptimalPath) return 2.6; // Widen path route
    const base = e.edgeType === 'REAL_EDGE' ? 0.8 + e.weight * 0.8 : 0.4 + e.weight * 0.4;
    return (isHovered || isConnectedToHovered) ? base * 1.6 : base;
  }, [hoveredEdge, highlightedEdgeIds, hoveredNodeConnections]);

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
          // Accelerated cinematic path particles (White flow V3.5)
          linkDirectionalParticles={(link: any) => {
            const e = link as GraphEdge;
            const isConnectedToHovered = hoveredNodeConnections.edgeIds.has(e.id);
            if (highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0) return 6; // optimal path trace!
            if (isConnectedToHovered) return 3; // send flow to neighbors on hover!
            return e.edgeType === 'REAL_EDGE' ? 1 : 0;
          }}
          linkDirectionalParticleWidth={(link: any) => {
            const e = link as GraphEdge;
            if (highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0) return 2.6;
            return 1.2;
          }}
          linkDirectionalParticleColor={() => '#ffffff'}
          linkDirectionalParticleSpeed={(link: any) => {
            const e = link as GraphEdge;
            if (highlightedEdgeIds.has(e.id) && highlightedEdgeIds.size > 0) return 0.015; // super accelerated!
            return 0.003;
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
          background: 'rgba(2,2,2,0.65)',
          backdropFilter: 'blur(10px)',
          zIndex: 50,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 32, height: 32,
              border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#ffffff',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
              margin: '0 auto 10px',
            }} />
            <span className="text-label" style={{ color: 'var(--silver-400)' }}>Expanding Subgraph…</span>
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
