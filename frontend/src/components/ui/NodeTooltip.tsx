'use client';

import { GraphNode } from '@/types/graph';

interface NodeTooltipProps {
  node: GraphNode;
  x: number;
  y: number;
}

export default function NodeTooltip({ node, x, y }: NodeTooltipProps) {
  const isReal = node.type === 'REAL';
  const connectionRatio = node.connectionCount > 0
    ? Math.round((node.realConnections / node.connectionCount) * 100)
    : 0;

  return (
    <div
      className="tooltip animate-fade-in"
      style={{
        left: x + 16,
        top: y - 10,
        maxWidth: 220,
      }}
    >
      <div className="glass-panel-strong" style={{ padding: '12px 14px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          {/* Node indicator */}
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: isReal ? 'var(--neon-cyan)' : 'var(--silver-500)',
            boxShadow: isReal ? '0 0 8px rgba(6,182,212,0.7)' : 'none',
            flexShrink: 0,
          }} />
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--silver-100)', flex: 1 }}>
            {node.name}
          </span>
        </div>

        {/* Badge */}
        <div style={{ marginBottom: '10px' }}>
          <span className={`badge ${isReal ? 'badge-real' : 'badge-demo'}`}>
            {isReal ? '● REAL' : '○ DEMO'}
          </span>
          {node.cluster && (
            <span className="badge" style={{
              marginLeft: '4px',
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.3)',
              color: 'var(--neon-violet)',
            }}>
              {node.cluster}
            </span>
          )}
        </div>

        <div className="divider" style={{ margin: '8px 0' }} />

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-label">Connections</span>
            <span className="text-value text-mono">{node.connectionCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-label">Influence</span>
            <span className="text-value text-mono" style={{ color: 'var(--neon-cyan)' }}>
              {node.influenceScore}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-label">Real Ratio</span>
            <span className="text-value text-mono">{connectionRatio}%</span>
          </div>
        </div>

        {/* Connection Ratio bar */}
        <div style={{ marginTop: '10px' }}>
          <div className="progress-bar">
            <div
              className="progress-fill progress-fill-cyan"
              style={{ width: `${connectionRatio}%` }}
            />
          </div>
        </div>

        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--silver-600)', letterSpacing: '0.04em' }}>
          Click to view full profile
        </div>
      </div>
    </div>
  );
}
