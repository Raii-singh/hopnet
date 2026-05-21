'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGraphStore } from '@/store/graphStore';
import { GraphNode, GraphEdge } from '@/types/graph';
import NodeTooltip from '@/components/ui/NodeTooltip';
import EdgeTooltip from '@/components/ui/EdgeTooltip';
import NodeProfileModal from '@/components/modals/NodeProfileModal';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph').then(m => m.ForceGraph2D), {
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

export default function GraphCanvas() {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  const {
    visibleNodes, visibleLinks,
    selectedNode, hoveredNode, hoveredEdge,
    highlightedNodeIds, highlightedEdgeIds,
    isLoading,
    selectNode, setHoveredNode, setHoveredEdge, clearHighlights,
  } = useGraphStore();

  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [edgeTooltipPos, setEdgeTooltipPos] = useState({ x: 0, y: 0 });

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
    const isHighlighted = highlightedNodeIds.size === 0 || highlightedNodeIds.has(n.id);
    const isSelected = selectedNode?.id === n.id;
    const isHovered = hoveredNode?.id === n.id;

    if (isSelected) return '#a78bfa'; // violet
    if (n.type === 'REAL') {
      if (!isHighlighted) return 'rgba(6,182,212,0.2)';
      if (isHovered) return '#67e8f9';
      return '#06b6d4';
    } else {
      if (!isHighlighted) return 'rgba(100,116,139,0.15)';
      if (isHovered) return '#94a3b8';
      return '#64748b';
    }
  }, [highlightedNodeIds, selectedNode, hoveredNode]);

  // ── Node size ───────────────────────────────────────────────
  const getNodeSize = useCallback((node: any) => {
    const n = node as GraphNode;
    const base = n.type === 'REAL' ? 5 + (n.influenceScore / 100) * 5 : 4;
    if (hoveredNode?.id === n.id) return base * 1.5;
    if (selectedNode?.id === n.id) return base * 1.6;
    return base;
  }, [hoveredNode, selectedNode]);

  // ── Node canvas rendering ────────────────────────────────────
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode;
    const r = getNodeSize(n);
    const color = getNodeColor(n);
    const isReal = n.type === 'REAL';
    const isHovered = hoveredNode?.id === n.id;
    const isSelected = selectedNode?.id === n.id;

    ctx.save();

    // Outer glow for REAL nodes
    if (isReal && (isHovered || isSelected || highlightedNodeIds.size === 0 || highlightedNodeIds.has(n.id))) {
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 2.5);
      gradient.addColorStop(0, isSelected ? 'rgba(167,139,250,0.25)' : 'rgba(6,182,212,0.2)');
      gradient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Stroke
    if (isSelected) {
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (isHovered && isReal) {
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (isReal) {
      ctx.strokeStyle = 'rgba(6,182,212,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Label — only at zoom > 2 or for hovered
    if (globalScale > 2 || isHovered || isSelected) {
      ctx.font = `${isSelected ? 600 : 400} ${Math.max(3, 9 / globalScale)}px Inter, sans-serif`;
      ctx.fillStyle = isReal ? '#e0f7fa' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.name, node.x, node.y + r + 2);
    }

    ctx.restore();
  }, [getNodeColor, getNodeSize, hoveredNode, selectedNode, highlightedNodeIds]);

  // ── Link color ──────────────────────────────────────────────
  const getLinkColor = useCallback((link: any) => {
    const e = link as GraphEdge;
    const isHighlighted = highlightedEdgeIds.size === 0 || highlightedEdgeIds.has(e.id);
    const isHovered = hoveredEdge?.id === e.id;

    if (e.edgeType === 'REAL_EDGE') {
      if (!isHighlighted) return 'rgba(59,130,246,0.1)';
      if (isHovered) return '#60a5fa';
      return `rgba(59,130,246,${0.3 + e.weight * 0.4})`;
    } else {
      if (!isHighlighted) return 'rgba(71,85,105,0.08)';
      if (isHovered) return '#475569';
      return `rgba(71,85,105,${0.2 + e.weight * 0.3})`;
    }
  }, [highlightedEdgeIds, hoveredEdge]);

  const getLinkWidth = useCallback((link: any) => {
    const e = link as GraphEdge;
    const isHovered = hoveredEdge?.id === e.id;
    const base = e.edgeType === 'REAL_EDGE' ? 1 + e.weight * 1.5 : 0.5 + e.weight * 0.5;
    return isHovered ? base * 2 : base;
  }, [hoveredEdge]);

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
          linkCurvature={0.1}
          linkDirectionalParticles={(link: any) => {
            const e = link as GraphEdge;
            return e.edgeType === 'REAL_EDGE' ? 2 : 0;
          }}
          linkDirectionalParticleWidth={(link: any) => {
            const e = link as GraphEdge;
            return 1.5 + e.weight;
          }}
          linkDirectionalParticleColor={(link: any) => {
            const e = link as GraphEdge;
            return e.edgeType === 'REAL_EDGE' ? '#3b82f6' : '#475569';
          }}
          linkDirectionalParticleSpeed={0.004}
          // Physics
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.3}
          cooldownTicks={120}
          // Interactions
          onNodeClick={(node: any) => {
            selectNode(node as GraphNode);
          }}
          onNodeHover={(node: any) => {
            setHoveredNode(node ? (node as GraphNode) : null);
            document.body.style.cursor = node ? 'pointer' : 'default';
          }}
          onLinkHover={(link: any) => {
            setHoveredEdge(link ? (link as GraphEdge) : null);
          }}
          enableNodeDrag
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
      {hoveredNode && !selectedNode && (
        <NodeTooltip node={hoveredNode} x={tooltipPos.x} y={tooltipPos.y} />
      )}

      {/* Edge tooltip */}
      {hoveredEdge && !hoveredNode && (
        <EdgeTooltip edge={hoveredEdge} x={edgeTooltipPos.x} y={edgeTooltipPos.y} />
      )}

      {/* Profile modal */}
      {selectedNode && (
        <NodeProfileModal
          node={selectedNode}
          onClose={() => selectNode(null)}
        />
      )}
    </div>
  );
}
