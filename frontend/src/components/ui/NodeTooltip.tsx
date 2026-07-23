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

        <div className="divider" style={{ margin: '8px 0' }} />

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {isImdb ? (
            <>
              {birthYear && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-label">Birth Year</span>
                  <span className="text-value text-mono">{birthYear}</span>
                </div>
              )}
              {appearances !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-label">Appearances</span>
                  <span className="text-value text-mono">{appearances}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-label">Collaborations</span>
                <span className="text-value text-mono" style={{ color: accentColor }}>{node.connectionCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-label">Influence Score</span>
                <span className="text-value text-mono" style={{ color: accentColor }}>{node.influenceScore}</span>
              </div>
              {rank && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-label">Global Rank</span>
                  <span className="text-value text-mono">#{rank}</span>
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Connection/Influence bar */}
        {!isImdb && (
          <div style={{ marginTop: '10px' }}>
            <div className="progress-bar">
              <div
                className="progress-fill progress-fill-cyan"
                style={{ width: `${connectionRatio}%` }}
              />
            </div>
          </div>
        )}

        {isImdb && node.influenceScore > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div className="progress-bar">
              <div
                style={{
                  height: '100%', borderRadius: '100px',
                  background: accentColor,
                  width: `${Math.min(node.influenceScore, 100)}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--silver-600)', letterSpacing: '0.04em' }}>
          Click to view full profile
        </div>
      </div>
    </div>
  );
}
