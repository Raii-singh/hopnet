'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGraphStore } from '@/store/graphStore';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/personal', label: 'Personal Database' },
  { href: '/database', label: 'Universal Database' },
  { href: '/connectors', label: 'Integrations' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { workspaceMode, toggleWorkspaceMode } = useGraphStore();

  return (
    <nav className="navbar animate-fade-in">
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginRight: '32px' }}>
        {/* Hexagonal graph icon (Silver-Chrome Monochromatic Theme) */}
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
          <line x1="14" y1="7" x2="24" y2="14" stroke="#e2e8f0" strokeWidth="0.8" strokeOpacity="0.3" />
          <line x1="24" y1="14" x2="20" y2="24" stroke="#cbd5e1" strokeWidth="0.8" strokeOpacity="0.3" />
          <line x1="8" y1="24" x2="4" y2="14" stroke="#64748b" strokeWidth="0.8" strokeOpacity="0.3" />
          <line x1="4" y1="14" x2="14" y2="7" stroke="#64748b" strokeWidth="0.8" strokeOpacity="0.3" />
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

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
        {navLinks.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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

      {/* Status & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Workspace Mode Toggle */}
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
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </>
            ) : (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </>
            )}
          </svg>
          {workspaceMode ? 'WORKSPACE ACTIVE' : 'WORKSPACE MODE'}
        </button>

        {/* Graph status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'block', width: 6, height: 6, borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
            animation: 'pulseGlow 2s ease-in-out infinite',
          }} />
          <span className="text-label" style={{ color: 'var(--silver-600)', fontSize: '11px', letterSpacing: '0.05em' }}>LIVE</span>
        </div>
      </div>
    </nav>
  );
}
