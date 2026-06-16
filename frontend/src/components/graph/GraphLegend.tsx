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
  { color: '#60a5fa', label: 'Tech' },
  { color: '#34d399', label: 'Finance' },
  { color: '#f87171', label: 'Health' },
  { color: '#fbbf24', label: 'Venture' },
  { color: '#a78bfa', label: 'Academia' },
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
