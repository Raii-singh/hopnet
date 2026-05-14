'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/personal', label: 'Personal Database' },
  { href: '/database', label: 'Universal Database' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar animate-fade-in">
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginRight: '32px' }}>
        {/* Hexagonal graph icon */}
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="7" r="3" fill="#06b6d4" />
          <circle cx="24" cy="14" r="3" fill="#3b82f6" />
          <circle cx="20" cy="24" r="3" fill="#8b5cf6" />
          <circle cx="8" cy="24" r="3" fill="#3b82f6" />
          <circle cx="4" cy="14" r="3" fill="#06b6d4" />
          <circle cx="14" cy="14" r="2.5" fill="white" fillOpacity="0.9" />
          <line x1="14" y1="7" x2="14" y2="14" stroke="#06b6d4" strokeWidth="1.2" strokeOpacity="0.7" />
          <line x1="24" y1="14" x2="14" y2="14" stroke="#3b82f6" strokeWidth="1.2" strokeOpacity="0.7" />
          <line x1="20" y1="24" x2="14" y2="14" stroke="#8b5cf6" strokeWidth="1.2" strokeOpacity="0.7" />
          <line x1="8" y1="24" x2="14" y2="14" stroke="#3b82f6" strokeWidth="1.2" strokeOpacity="0.7" />
          <line x1="4" y1="14" x2="14" y2="14" stroke="#06b6d4" strokeWidth="1.2" strokeOpacity="0.7" />
          <line x1="14" y1="7" x2="24" y2="14" stroke="#3b82f6" strokeWidth="0.8" strokeOpacity="0.4" />
          <line x1="24" y1="14" x2="20" y2="24" stroke="#8b5cf6" strokeWidth="0.8" strokeOpacity="0.4" />
          <line x1="8" y1="24" x2="4" y2="14" stroke="#06b6d4" strokeWidth="0.8" strokeOpacity="0.4" />
          <line x1="4" y1="14" x2="14" y2="7" stroke="#06b6d4" strokeWidth="0.8" strokeOpacity="0.4" />
        </svg>
        <span style={{
          fontSize: '18px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
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
                color: active ? 'var(--neon-cyan)' : 'var(--silver-400)',
                background: active ? 'rgba(6,182,212,0.08)' : 'transparent',
                border: active ? '1px solid rgba(6,182,212,0.25)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Status Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Graph status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'block', width: 7, height: 7, borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px rgba(16,185,129,0.8)',
            animation: 'pulseGlow 2s ease-in-out infinite',
          }} />
          <span className="text-label" style={{ color: 'var(--silver-600)' }}>LIVE</span>
        </div>

        {/* Sign In placeholder */}
        <button className="glass-button" style={{ opacity: 0.5, cursor: 'not-allowed' }} disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Sign In
        </button>
      </div>
    </nav>
  );
}
