'use client';

import { GraphNode } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';
import { useEffect } from 'react';

interface NodeProfileModalProps {
  node: GraphNode;
  onClose: () => void;
}

function StatRow({ label, value, color = 'var(--silver-200)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
      <span className="text-label">{label}</span>
      <span className="text-mono" style={{ fontSize: '13px', fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

export default function NodeProfileModal({ node, onClose }: NodeProfileModalProps) {
  const { setRootNode, highlightNeighbors, clearHighlights, visibleLinks } = useGraphStore();
  const isReal = node.type === 'REAL';

  const totalConn = node.connectionCount || 0;
  const realRatio = totalConn > 0 ? Math.round((node.realConnections / totalConn) * 100) : 0;
  const influencePercent = Math.min(100, node.influenceScore);
  const centralityPercent = Math.round((node.centrality || 0) * 100);

  // Find strongest connection
  const myEdges = visibleLinks.filter(e => {
    const src = typeof e.source === 'string' ? e.source : e.source.id;
    const tgt = typeof e.target === 'string' ? e.target : e.target.id;
    return (src === node.id || tgt === node.id) && e.edgeType === 'REAL_EDGE';
  });
  const strongestEdge = myEdges.sort((a, b) => b.weight - a.weight)[0];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-panel-strong animate-fade-in-scale"
        style={{
          width: 420,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          padding: 0,
          position: 'relative',
        }}
      >
        {/* ── TOP ACCENT BAR ── */}
        <div style={{
          height: 3,
          background: isReal
            ? 'linear-gradient(90deg, var(--neon-cyan), var(--neon-blue), var(--neon-violet))'
            : 'linear-gradient(90deg, var(--silver-700), var(--silver-600))',
          borderRadius: '12px 12px 0 0',
        }} />

        <div style={{ padding: '20px 24px' }}>
          {/* ── HEADER ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Avatar circle */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: isReal
                  ? 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.3))'
                  : 'linear-gradient(135deg, rgba(100,116,139,0.3), rgba(71,85,105,0.3))',
                border: `2px solid ${isReal ? 'rgba(6,182,212,0.5)' : 'rgba(100,116,139,0.4)'}`,
                boxShadow: isReal ? '0 0 20px rgba(6,182,212,0.2)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 700,
                color: isReal ? 'var(--neon-cyan)' : 'var(--silver-500)',
                flexShrink: 0,
              }}>
                {node.name.charAt(0)}
              </div>

              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--silver-100)', margin: 0, lineHeight: 1.3 }}>
                  {node.name}
                </h2>
                <div style={{ display: 'flex', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
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
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              id="modal-close-btn"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'var(--silver-500)',
                cursor: 'pointer',
                width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--silver-100)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--silver-500)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Bio */}
          {node.bio && (
            <p style={{ fontSize: '12px', color: 'var(--silver-500)', lineHeight: 1.5, marginBottom: '14px' }}>
              {node.bio}
            </p>
          )}

          {/* Tags */}
          {node.tags && node.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {node.tags.map(tag => (
                <span key={tag} style={{
                  padding: '2px 8px', borderRadius: '100px',
                  fontSize: '10px', fontWeight: 500,
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--silver-400)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="divider" />

          {/* ── STATS SECTION ── */}
          <div style={{ marginBottom: '16px' }}>
            <div className="text-label" style={{ marginBottom: '10px', color: 'var(--neon-blue)' }}>Network Metrics</div>
            <StatRow label="Total Connections" value={totalConn} />
            <StatRow label="Real Connections" value={node.realConnections} color="var(--neon-cyan)" />
            <StatRow label="Demo Connections" value={node.demoConnections} color="var(--silver-500)" />
            <StatRow label="Influence Score" value={node.influenceScore} color="var(--neon-cyan)" />
            <StatRow label="Centrality" value={`${centralityPercent}%`} color="var(--neon-blue)" />
            {node.avgPathDistance && (
              <StatRow label="Avg Path Distance" value={node.avgPathDistance.toFixed(1)} />
            )}
            {strongestEdge && (
              <StatRow
                label="Strongest Link Score"
                value={Math.round(strongestEdge.weight * 100)}
                color="var(--neon-emerald)"
              />
            )}
          </div>

          {/* ── MINI VISUALIZATIONS ── */}
          <div style={{ marginBottom: '16px' }}>
            <div className="text-label" style={{ marginBottom: '10px', color: 'var(--neon-blue)' }}>Visual Metrics</div>

            {/* Real connection ratio */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '11px', color: 'var(--silver-400)' }}>Connection Score Ratio</span>
                <span className="text-mono" style={{ fontSize: '11px', color: 'var(--neon-cyan)' }}>{realRatio}%</span>
              </div>
              <div className="progress-bar" style={{ height: 6 }}>
                <div className="progress-fill progress-fill-cyan" style={{ width: `${realRatio}%` }} />
              </div>
            </div>

            {/* Influence meter */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '11px', color: 'var(--silver-400)' }}>Influence Score</span>
                <span className="text-mono" style={{ fontSize: '11px', color: 'var(--neon-blue)' }}>{influencePercent}</span>
              </div>
              <div className="progress-bar" style={{ height: 6 }}>
                <div className="progress-fill progress-fill-blue" style={{ width: `${influencePercent}%` }} />
              </div>
            </div>

            {/* Centrality meter */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '11px', color: 'var(--silver-400)' }}>Network Centrality</span>
                <span className="text-mono" style={{ fontSize: '11px', color: 'var(--neon-violet)' }}>{centralityPercent}%</span>
              </div>
              <div className="progress-bar" style={{ height: 6 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${centralityPercent}%`,
                    background: 'linear-gradient(90deg, var(--neon-violet), var(--neon-blue))',
                    boxShadow: '0 0 8px rgba(139,92,246,0.5)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* ── ACTIONS ── */}
          <div className="text-label" style={{ marginBottom: '10px', color: 'var(--neon-blue)' }}>Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <button
              id="highlight-neighbors-btn"
              className="glass-button"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={() => { highlightNeighbors(node.id); onClose(); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
              Highlight Neighbors
            </button>

            <button
              id="focus-node-btn"
              className="glass-button"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={() => { setRootNode(node.id); onClose(); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Focus Graph Here
            </button>

            <button
              id="view-database-btn"
              className="glass-button"
              style={{ width: '100%', justifyContent: 'flex-start', opacity: 0.6 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
              View in Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
