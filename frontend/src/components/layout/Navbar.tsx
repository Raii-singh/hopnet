'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGraphStore } from '@/store/graphStore';
import {
  PROVIDER_REGISTRY,
  ProviderId,
  getNavItemsForProvider,
} from '@/providers/graphProvider';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import SudoLoginModal from '@/components/modals/SudoLoginModal';

export default function Navbar() {
  const pathname = usePathname();
  const { isAdmin, checkAuth, logout } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
