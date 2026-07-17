'use client';

import { useGraphStore } from '@/store/graphStore';

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── College cluster definitions ───────────────────────────────────────────────
const COLLEGE_CLUSTERS = [
  { color: '#3b82f6', label: 'Tech' },
  { color: '#10b981', label: 'Finance' },
  { color: '#f43f5e', label: 'Health' },
  { color: '#f59e0b', label: 'Venture' },
  { color: '#8b5cf6', label: 'Academia' },
];

// ── IMDb birth-decade definitions ─────────────────────────────────────────────
const IMDB_DECADE_CLUSTERS = [
  { color: '#ef4444', label: '1920s' },
  { color: '#f97316', label: '1930s' },
  { color: '#eab308', label: '1940s' },
  { color: '#84cc16', label: '1950s' },
  { color: '#22c55e', label: '1960s' },
  { color: '#14b8a6', label: '1970s' },
  { color: '#3b82f6', label: '1980s' },
  { color: '#8b5cf6', label: '1990s' },
];

export default function GraphLegend() {
  const { focusMode, activeProvider, providerCapabilities } = useGraphStore();

  if (focusMode) return null;

  const isImdb = activeProvider === 'imdb';
  const accentColor = providerCapabilities.accentColor;

  const clusterList = isImdb ? IMDB_DECADE_CLUSTERS : COLLEGE_CLUSTERS;

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxWidth: 230,
      }}
    >
      <div className="glass-panel" style={{ padding: '10px 12px' }}>
        {/* Provider badge header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px' }}>{providerCapabilities.icon}</span>
          <div className="text-label" style={{ fontSize: '10px', color: 'var(--silver-300)' }}>
            LEGEND MAP
          </div>
          <div style={{
            marginLeft: 'auto', fontSize: '8px', padding: '1px 5px', borderRadius: '100px',
            background: `${accentColor}20`, color: accentColor,
            border: `1px solid ${accentColor}40`, fontWeight: 700,
          }}>
            {providerCapabilities.displayName.toUpperCase()}
          </div>
        </div>

        {/* ── Core elements ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
          {/* Primary node */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: accentColor,
              boxShadow: `0 0 6px ${hexToRgba(accentColor, 0.5)}`,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '10.5px', color: 'var(--silver-400)' }}>
              {isImdb ? 'Actor Node' : 'Real Node'}
            </span>
          </div>

          {/* Demo node — only college */}
          {!isImdb && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                border: '2px solid #64748b',
                background: 'transparent',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '10.5px', color: 'var(--silver-400)' }}>Demo Node</span>
            </div>
          )}

          {/* Primary edge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 14, height: 2, borderRadius: 1,
              background: isImdb ? hexToRgba(accentColor, 0.6) : 'rgba(255,255,255,0.4)',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '10.5px', color: 'var(--silver-400)' }}>
              {isImdb ? 'Collaboration Edge' : 'Real Edge'}
            </span>
          </div>

          {/* Demo edge — only college */}
          {!isImdb && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 14, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
              <span style={{ fontSize: '10.5px', color: 'var(--silver-400)' }}>Demo Edge</span>
            </div>
          )}
        </div>

        <div className="divider" style={{ margin: '6px 0' }} />

        {/* ── Clusters ── */}
        <div className="text-label" style={{ marginBottom: '6px', fontSize: '9px', color: 'var(--silver-500)' }}>
          {isImdb ? 'BIRTH DECADES' : 'COMMUNITIES'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '6px' }}>
          {clusterList.map(c => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: c.color,
                boxShadow: `0 0 4px ${hexToRgba(c.color, 0.4)}`,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '9px', color: 'var(--silver-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.label}
              </span>
            </div>
          ))}
          {/* Bridge nodes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', gridColumn: 'span 2' }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'transparent',
              border: '1.5px double #ffffff',
              boxShadow: '0 0 4px rgba(255,255,255,0.3)',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '9px', color: 'var(--silver-300)', fontWeight: 600 }}>
              Bridge Node (Multi-{isImdb ? 'Era' : 'Cluster'})
            </span>
          </div>
        </div>

        {/* ── Provider-specific note ── */}
        <div style={{
          padding: '4px 6px',
          background: `${accentColor}08`,
          border: `1px solid ${accentColor}20`,
          borderRadius: '4px',
          fontSize: '9px',
          color: 'var(--silver-400)',
          lineHeight: 1.3,
          textAlign: 'center',
        }}>
          {isImdb
            ? '🎬 Movies → Edges Only (Actors = Nodes)'
            : '⚡ REAL→DEMO→REAL blocked'}
        </div>
      </div>
    </div>
  );
}
