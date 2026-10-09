'use client';

/**
 * DemoBanner
 * ─────────────────────────────────────────────────────────────────────────────
 * A small, non-intrusive persistent indicator shown when appMode === 'demo'.
 * The graph is the star — this banner should never compete with it.
 *
 * Renders as a fixed bottom-right pill above the BottomInfoBar.
 */

import { useAppStore } from '@/store/appStore';

export default function DemoBanner() {
  const { setAppMode } = useAppStore();

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        bottom: 48,
        right: 24,
        zIndex: 450,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px 8px 12px',
        background: 'rgba(5, 5, 5, 0.90)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        borderRadius: 100,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Pulse dot */}
      <span
        style={{
          display: 'block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
          flexShrink: 0,
          animation: 'pulseGlow 2s ease-in-out infinite',
        }}
      />

      {/* Label */}
      <span
        style={{
          fontSize: '10.5px',
          fontWeight: 700,
          color: 'var(--silver-300)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Demo Network
      </span>

      {/* Divider */}
      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '12px' }}>·</span>

      {/* CTA */}
      <button
        id="demo-banner-build-own-btn"
        onClick={() => setAppMode('own')}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--silver-400)',
          fontSize: '10.5px',
          fontWeight: 600,
          letterSpacing: '0.03em',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ffffff'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--silver-400)'; }}
      >
        Build Your Own
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
