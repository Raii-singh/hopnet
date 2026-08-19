'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGraphStore } from '@/store/graphStore';
import {
  PROVIDER_REGISTRY,
  ProviderId,
  getNavItemsForProvider,
} from '@/providers/graphProvider';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const {
    workspaceMode,
    toggleWorkspaceMode,
    focusMode,
    toggleFocusMode,
    activeProvider,
    providerCapabilities,
    switchProvider,
    isLoading,
  } = useGraphStore();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const navItems = getNavItemsForProvider(activeProvider);

  const accentColor = providerCapabilities.accentColor;

  return (
    <nav className="navbar animate-fade-in" style={{ position: 'relative', zIndex: 1000 }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginRight: '24px', flexShrink: 0 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="7" r="3" fill="#ffffff" />
          <circle cx="24" cy="14" r="3" fill="#e2e8f0" />
          <circle cx="20" cy="24" r="3" fill="#cbd5e1" />
          <circle cx="8" cy="24" r="3" fill="#94a3b8" />
          <circle cx="4" cy="14" r="3" fill="#64748b" />
          <circle cx="14" cy="14" r="2.5" fill="white" fillOpacity="0.9" />
          <line x1="14" y1="7" x2="14" y2="14" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.5" />
          <line x1="24" y1="14" x2="14" y2="14" stroke="#e2e8f0" strokeWidth="1.2" strokeOpacity="0.5" />
          <line x1="20" y1="24" x2="14" y2="14" stroke="#cbd5e1" strokeWidth="1.2" strokeOpacity="0.5" />
          <line x1="8" y1="24" x2="14" y2="14" stroke="#94a3b8" strokeWidth="1.2" strokeOpacity="0.5" />
          <line x1="4" y1="14" x2="14" y2="14" stroke="#64748b" strokeWidth="1.2" strokeOpacity="0.5" />
        </svg>
        <span style={{
          fontSize: '18px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #ffffff, #94a3b8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          HOP<span style={{ WebkitTextFillColor: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>Net</span>
        </span>
      </Link>

      {/* ── Provider Switcher ── */}
      <div style={{ position: 'relative', marginRight: '16px', flexShrink: 0 }}>
        <button
          id="provider-switcher-btn"
          onClick={() => setSwitcherOpen(s => !s)}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px 5px 10px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${accentColor}55`,
            borderRadius: '10px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ fontSize: '15px', lineHeight: 1 }}>{providerCapabilities.icon}</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: accentColor, letterSpacing: '0.01em' }}>
            {providerCapabilities.displayName}
          </span>
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke={accentColor} strokeWidth="2.5"
            style={{ opacity: 0.7, transform: switcherOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Dropdown */}
        {switcherOpen && (
          <div
            className="glass-panel animate-fade-in"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              minWidth: 280,
              zIndex: 2000,
              padding: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ padding: '6px 10px 4px', fontSize: '9px', color: 'var(--silver-600)', letterSpacing: '0.1em', fontWeight: 700 }}>
              GRAPH PROVIDERS
            </div>
            {(Object.keys(PROVIDER_REGISTRY) as ProviderId[]).map(pid => {
              const caps = PROVIDER_REGISTRY[pid];
              const isActive = pid === activeProvider;
              const isAvailable = caps.available;
              return (
                <button
                  key={pid}
                  id={`provider-${pid}-btn`}
                  disabled={!isAvailable || isLoading}
                  onClick={async () => {
                    setSwitcherOpen(false);
                    if (pid !== activeProvider) await switchProvider(pid);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    background: isActive ? `${caps.accentColor}18` : 'transparent',
                    border: `1px solid ${isActive ? caps.accentColor + '40' : 'transparent'}`,
                    borderRadius: '8px',
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                    opacity: isAvailable ? 1 : 0.4,
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    marginBottom: '2px',
                  }}
                  onMouseEnter={e => { if (isAvailable && !isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive ? `${caps.accentColor}18` : 'transparent'; }}
                >
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>{caps.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: isActive ? caps.accentColor : 'var(--silver-200)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {caps.displayName}
                      {isActive && (
                        <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '100px', background: `${caps.accentColor}30`, color: caps.accentColor, border: `1px solid ${caps.accentColor}60` }}>
                          ACTIVE
                        </span>
                      )}
                      {!isAvailable && (
                        <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '100px', background: 'rgba(255,255,255,0.04)', color: 'var(--silver-600)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          SOON
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '9.5px', color: 'var(--silver-500)', marginTop: '1px', lineHeight: 1.3 }}>{caps.description}</div>
                  </div>
                  {isActive && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={caps.accentColor} strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Nav Links (capability-aware) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
        {navItems.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSwitcherOpen(false)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                color: active ? '#ffffff' : 'var(--silver-400)',
                background: active ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                border: active ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.25s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* ── Status & Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Focus Mode Toggle */}
        <button
          onClick={toggleFocusMode}
          className="glass-button"
          style={{
            borderColor: focusMode ? 'rgba(255, 255, 255, 0.4)' : 'var(--glass-border)',
            color: focusMode ? '#ffffff' : 'var(--silver-400)',
            background: focusMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
            boxShadow: focusMode ? '0 0 12px rgba(255, 255, 255, 0.2)' : 'none',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            padding: '6px 12px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {focusMode ? (
              <>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </>
            ) : (
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            )}
          </svg>
        </button>

        {/* Workspace Mode Toggle — only for hasCRUD providers */}
        {providerCapabilities.hasWorkspaceMode && (
          <button
            onClick={toggleWorkspaceMode}
            className="glass-button"
            style={{
              borderColor: workspaceMode ? 'rgba(255, 255, 255, 0.25)' : 'var(--glass-border)',
              color: workspaceMode ? '#ffffff' : 'var(--silver-400)',
              background: workspaceMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              boxShadow: workspaceMode ? '0 0 12px rgba(255, 255, 255, 0.1)' : 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{
              filter: workspaceMode ? 'drop-shadow(0 0 3px rgba(255,255,255,0.4))' : 'none'
            }}>
              {workspaceMode ? (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </>
              ) : (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </>
              )}
            </svg>
          </button>
        )}

        {/* Graph status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'block', width: 6, height: 6, borderRadius: '50%',
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}80`,
            animation: 'pulseGlow 2s ease-in-out infinite',
          }} />
          <span className="text-label" style={{ color: 'var(--silver-600)', fontSize: '11px', letterSpacing: '0.05em' }}>LIVE</span>
        </div>
      </div>

      {/* Backdrop to close switcher */}
      {switcherOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1999 }}
          onClick={() => setSwitcherOpen(false)}
        />
      )}
    </nav>
  );
}
