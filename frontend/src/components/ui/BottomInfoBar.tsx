'use client';

import { SubgraphMeta } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';

interface BottomInfoBarProps {
  meta: SubgraphMeta | null;
  isLoading?: boolean;
}

export default function BottomInfoBar({ meta, isLoading }: BottomInfoBarProps) {
  const { focusMode, activeProvider, providerCapabilities } = useGraphStore();

  if (!meta || focusMode) return null;

  const isImdb = activeProvider === 'imdb';
  const accentColor = providerCapabilities.accentColor;

  const realRatio = meta.totalNodes > 0
    ? Math.round((meta.realNodes / meta.totalNodes) * 100)
    : 0;

  // Provider-specific stats
  const stats = isImdb
    ? [
        { label: 'Actors', value: meta.totalNodes, color: accentColor },
        { label: 'Collabs', value: meta.totalEdges, color: 'var(--silver-200)' },
        { label: 'Avg Hops', value: meta.avgHopCount.toFixed(1), color: 'var(--silver-200)' },
        { label: 'Depth', value: `${meta.depth ?? 3} hop${(meta.depth ?? 3) !== 1 ? 's' : ''}`, color: 'var(--silver-400)' },
      ]
    : [
        { label: 'Nodes', value: meta.totalNodes, color: 'var(--silver-200)' },
        { label: 'Edges', value: meta.totalEdges, color: 'var(--silver-200)' },
        { label: 'Real', value: meta.realNodes, color: '#ffffff' },
        { label: 'Demo', value: meta.demoNodes, color: 'var(--silver-500)' },
        { label: 'Real Ratio', value: `${realRatio}%`, color: '#ffffff' },
        { label: 'Avg Hop', value: meta.avgHopCount.toFixed(1), color: 'var(--silver-200)' },
        { label: 'Depth', value: `${meta.depth ?? 1} hop${(meta.depth ?? 1) !== 1 ? 's' : ''}`, color: 'var(--silver-400)' },
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
          border: `1px solid ${accentColor}20`,
        }}
      >
        {/* Provider label */}
        <div style={{
          padding: '8px 14px',
          background: `${accentColor}10`,
          borderRight: `1px solid ${accentColor}20`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          {isLoading ? (
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              border: `1.5px solid ${accentColor}`,
              borderTopColor: 'transparent',
              animation: 'spin 0.7s linear infinite',
            }} />
          ) : (
            <span style={{
              display: 'block', width: 7, height: 7, borderRadius: '50%',
              background: accentColor,
              boxShadow: `0 0 8px ${accentColor}80`,
            }} />
          )}
          <span style={{ fontSize: '10px', color: accentColor, letterSpacing: '0.1em', fontWeight: 700 }}>
            {isImdb ? '🎬 IMDB' : 'GRAPH'}
          </span>
        </div>

        {/* Stats */}
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              padding: '8px 16px',
              borderRight: i < stats.length - 1 ? `1px solid ${accentColor}10` : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1px',
              minWidth: 55,
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
