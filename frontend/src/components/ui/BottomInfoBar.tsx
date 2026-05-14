'use client';

import { SubgraphMeta } from '@/types/graph';

interface BottomInfoBarProps {
  meta: SubgraphMeta | null;
  isLoading?: boolean;
}

export default function BottomInfoBar({ meta, isLoading }: BottomInfoBarProps) {
  if (!meta) return null;

  const realRatio = meta.totalNodes > 0
    ? Math.round((meta.realNodes / meta.totalNodes) * 100)
    : 0;

  const stats = [
    { label: 'Nodes', value: meta.totalNodes, color: 'var(--silver-200)' },
    { label: 'Edges', value: meta.totalEdges, color: 'var(--silver-200)' },
    { label: 'Real', value: meta.realNodes, color: 'var(--neon-cyan)' },
    { label: 'Demo', value: meta.demoNodes, color: 'var(--silver-500)' },
    { label: 'Real Ratio', value: `${realRatio}%`, color: 'var(--neon-cyan)' },
    { label: 'Avg Hop', value: meta.avgHopCount.toFixed(1), color: 'var(--neon-blue)' },
    { label: 'Depth', value: `${meta.depth} hop${meta.depth !== 1 ? 's' : ''}`, color: 'var(--neon-violet)' },
  ];

  return (
    <div
      className="animate-slide-in-up"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        gap: '0',
      }}
    >
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* HOPNet label */}
        <div style={{
          padding: '8px 14px',
          background: 'rgba(59,130,246,0.08)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          {isLoading ? (
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              border: '1.5px solid var(--neon-blue)',
              borderTopColor: 'transparent',
              animation: 'spin 0.7s linear infinite',
            }} />
          ) : (
            <span style={{
              display: 'block', width: 7, height: 7, borderRadius: '50%',
              background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.8)',
            }} />
          )}
          <span className="text-label" style={{ color: 'var(--neon-blue)', letterSpacing: '0.1em' }}>
            GRAPH
          </span>
        </div>

        {/* Stats */}
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              padding: '8px 16px',
              borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1px',
              minWidth: 60,
            }}
          >
            <span className="text-mono" style={{ fontSize: '13px', fontWeight: 600, color: stat.color }}>
              {stat.value}
            </span>
            <span className="text-label" style={{ fontSize: '9px' }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
