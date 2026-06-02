'use client';

import { GraphNode } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';

interface NodeTooltipProps {
  node: GraphNode;
}

export default function NodeTooltip({ node }: NodeTooltipProps) {
  const { activeProvider, providerCapabilities } = useGraphStore();
  const isImdb = activeProvider === 'imdb';
  const accentColor = providerCapabilities.accentColor;

  const isReal = node.nodeType === 'REAL';
  const connectionRatio = node.connectionCount > 0
    ? Math.round((node.realConnections / node.connectionCount) * 100)
    : 0;

  // IMDb-specific metadata
  const birthYear = node.metadata?.birthYear;
  const appearances = node.metadata?.appearances;
  const rank = node.metadata?.rank;

  return (
    <div
      className="tooltip animate-fade-in"
      style={{
        left: 16,
        top: -10,
        maxWidth: 230,
      }}
    >
      <div className="glass-panel-strong" style={{ padding: '12px 14px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}80`,
            flexShrink: 0,
          }} />
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--silver-100)', flex: 1 }}>
            {node.fullName}
          </span>
        </div>

        {/* Badge row */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {isImdb ? (
            <>
              <span style={{
                fontSize: '9px', padding: '1px 6px', borderRadius: '100px',
                background: `${accentColor}20`, color: accentColor,
                border: `1px solid ${accentColor}40`, fontWeight: 700,
              }}>
                🎬 ACTOR
              </span>
              {node.cluster && (
                <span style={{
                  fontSize: '9px', padding: '1px 6px', borderRadius: '100px',
                  background: 'rgba(255,255,255,0.06)', color: 'var(--silver-300)',
                  border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600,
                }}>
                  {node.cluster}
                </span>
              )}
            </>
          ) : (
            <>
              <span className={`badge ${isReal ? 'badge-real' : 'badge-demo'}`}>
                {isReal ? '● REAL' : '○ DEMO'}
              </span>
              {node.cluster && (
                <span className="badge" style={{
                  background: 'rgba(139,92,246,0.12)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: 'var(--neon-violet)',
                }}>
                  {node.cluster}
                </span>
              )}
            </>
          )}
        </div>
