'use client';

import { GraphEdge, GraphNode } from '@/types/graph';

interface EdgeTooltipProps {
  edge: GraphEdge;
  x: number;
  y: number;
}

function resolveNode(n: string | GraphNode): { id: string; fullName?: string; nodeType?: string } {
  if (typeof n === 'string') return { id: n };
  return { id: n.id, fullName: n.fullName, nodeType: n.nodeType };
}

export default function EdgeTooltip({ edge, x, y }: EdgeTooltipProps) {
  const isReal = edge.edgeType === 'REAL_EDGE';
  const src = resolveNode(edge.source);
  const tgt = resolveNode(edge.target);
  const weight = Math.round(edge.weight * 100);
  const trust = Math.round(edge.trustScore * 100);
  const interaction = Math.round(edge.interactionFrequency * 100);

  return (
    <div
      className="tooltip animate-fade-in"
      style={{ left: x + 12, top: y - 12, maxWidth: 200 }}
    >
      <div className="glass-panel-strong" style={{ padding: '10px 12px' }}>
        {/* Edge type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <div style={{
            width: 24, height: 2, borderRadius: 1,
            background: isReal
              ? 'linear-gradient(90deg, #ffffff, #cbd5e1)'
              : 'rgba(255, 255, 255, 0.1)',
            boxShadow: 'none',
          }} />
          <span className={`badge ${isReal ? 'badge-real-edge' : 'badge-demo'}`}>
            {isReal ? 'REAL EDGE' : 'DEMO EDGE'}
          </span>
        </div>

        {/* Connection label */}
        {(src.fullName || tgt.fullName) && (
          <div style={{ marginBottom: '8px', fontSize: '11px', color: 'var(--silver-400)' }}>
            {src.fullName || src.id.slice(0, 8)} → {tgt.fullName || tgt.id.slice(0, 8)}
          </div>
        )}

        <div className="divider" style={{ margin: '6px 0' }} />

        {/* Scores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-label">Relationship Score</span>
            <span className="text-value text-mono" style={{ color: isReal ? '#ffffff' : 'var(--silver-400)' }}>
              {weight}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-label">Type</span>
            <span className="text-value text-mono" style={{ color: '#ffffff', fontSize: '11px' }}>
              {edge.relationshipType}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-label">Trust</span>
            <span className="text-value text-mono">{trust}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-label">Interaction</span>
            <span className="text-value text-mono">{interaction}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-label">Source</span>
            <span className="text-value text-mono" style={{ fontSize: '11px' }}>{edge.connectorSource}</span>
          </div>
        </div>

        {/* Weight bar */}
        <div style={{ marginTop: '8px' }}>
          <div className="progress-bar">
            <div
              className={`progress-fill ${isReal ? 'progress-fill-blue' : ''}`}
              style={{
                width: `${weight}%`,
                background: isReal ? undefined : 'var(--silver-700)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
