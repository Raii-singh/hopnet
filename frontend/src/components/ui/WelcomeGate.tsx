'use client';

/**
 * WelcomeGate
 * ─────────────────────────────────────────────────────────────────────────────
 * Centered welcome box shown on the landing page over the Vanta Cells background.
 * Uses 100% shared Golden Standard design tokens (`glass-panel-strong`, `glass-button`, `glass-button-golden`)
 * with zero custom inline background or opacity overrides.
 */

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { prewarmBackend } from '@/services/api';

export default function WelcomeGate() {
  const { setAppMode } = useAppStore();
  const { isChecking } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [serverStatus, setServerStatus] = useState<'warming' | 'ready' | 'idle'>('warming');
  const [showNotification, setShowNotification] = useState(true);

  // Avoid SSR mismatch and trigger pre-warm ping on mount
  useEffect(() => {
    setMounted(true);
    let isSubscribed = true;
    prewarmBackend().then((ok) => {
      if (isSubscribed) {
        setServerStatus(ok ? 'ready' : 'idle');
      }
    });
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Don't flash anything while auth is resolving
  if (!mounted || isChecking) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        padding: '24px',
        overflow: 'hidden',
      }}
    >
      {/* Top-Right Free Tier Hosting Cold-Start Notification */}
      {showNotification && (
        <aside
          aria-label="Cloud Server Hosting Status"
          className="glass-panel animate-fade-in"
          style={{
            position: 'fixed',
            top: 'calc(var(--navbar-height, 64px) + 14px)',
            right: '20px',
            zIndex: 99999,
            width: 'calc(100vw - 40px)',
            maxWidth: '340px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'rgba(10, 15, 29, 0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: serverStatus === 'ready'
              ? '1px solid rgba(34, 197, 94, 0.35)'
              : '1px solid rgba(234, 179, 8, 0.35)',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 255, 255, 0.03)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          {/* Animated Status Indicator Dot */}
          <div style={{ marginTop: '3px', flexShrink: 0 }}>
            {serverStatus === 'ready' ? (
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 10px #22c55e',
                }}
              />
            ) : (
              <span
                className="animate-pulse"
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#eab308',
                  boxShadow: '0 0 10px #eab308',
                }}
              />
            )}
          </div>

          {/* Message Text */}
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: serverStatus === 'ready' ? '#4ade80' : '#facc15',
                }}
              >
                {serverStatus === 'ready' ? 'Cloud Server Ready' : 'Free Tier Cold-Start'}
              </span>
              <button
                onClick={() => setShowNotification(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--silver-400)',
                  cursor: 'pointer',
                  padding: '0 2px',
                  fontSize: '15px',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '11.5px',
                color: 'var(--silver-300)',
                lineHeight: 1.45,
              }}
            >
              {serverStatus === 'ready'
                ? 'Backend is warm & connected. Graph intelligence will load instantly.'
                : 'Current hosting uses Render free tier (hibernates on idle). Pre-warming server now — first load may take ~30s.'}
            </p>
          </div>
        </aside>
      )}

      {/* Centered Welcome Modal Box — Pure Golden Standard Glass Theme */}
      <div
        className="glass-panel-strong animate-fade-in-scale"
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 460,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px 32px 32px',
        }}
      >
        {/* HOPNet Monochromatic Logo */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <svg
            width="56"
            height="56"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.35))',
            }}
          >
            <circle cx="14" cy="7" r="3" fill="#ffffff" />
            <circle cx="24" cy="14" r="3" fill="#e2e8f0" />
            <circle cx="20" cy="24" r="3" fill="#cbd5e1" />
            <circle cx="8" cy="24" r="3" fill="#94a3b8" />
            <circle cx="4" cy="14" r="3" fill="#64748b" />
            <circle cx="14" cy="14" r="2.5" fill="white" fillOpacity="0.95" />
            <line x1="14" y1="7" x2="14" y2="14" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.6" />
            <line x1="24" y1="14" x2="14" y2="14" stroke="#e2e8f0" strokeWidth="1.2" strokeOpacity="0.6" />
            <line x1="20" y1="24" x2="14" y2="14" stroke="#cbd5e1" strokeWidth="1.2" strokeOpacity="0.6" />
            <line x1="8" y1="24" x2="14" y2="14" stroke="#94a3b8" strokeWidth="1.2" strokeOpacity="0.6" />
            <line x1="4" y1="14" x2="14" y2="14" stroke="#64748b" strokeWidth="1.2" strokeOpacity="0.6" />
          </svg>
        </div>

        {/* Metallic Chrome Title: Welcome to HOPNet */}
        <h1
          style={{
            margin: '0 0 8px 0',
            fontSize: '32px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.2))',
          }}
        >
          Welcome to HOPNet
        </h1>

        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '13.5px',
            color: 'var(--silver-400)',
            lineHeight: 1.6,
            maxWidth: 360,
            fontWeight: 400,
          }}
        >
          High-order graph platform for discovering people, relationship paths, and intelligent social networks.
        </p>

        {/* Spatial Silver Divider */}
        <div
          style={{
            width: 44,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            marginBottom: 24,
          }}
        />

        {/* Actions Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: '100%',
            maxWidth: 340,
          }}
        >
          {/* Primary Active CTA: Explore Demo Network */}
          <button
            id="welcome-explore-demo-btn"
            onClick={() => setAppMode('demo')}
            className="glass-button"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px 20px',
              fontSize: '13.5px',
              fontWeight: 600,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
            </svg>
            Explore Demo Network
          </button>

          {/* Golden Exclusivity Secondary Button: Multi-User Network (Invite Only) */}
          <button
            id="welcome-build-own-btn"
            disabled
            className="glass-button-golden"
            title="Multi-user graph network features are currently invite-only."
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px 20px',
              fontSize: '13px',
              cursor: 'not-allowed',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span
              style={{
                color: '#eab308',
                letterSpacing: '0.01em',
              }}
            >
              Multi-User Network
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                background: 'linear-gradient(135deg, #fef08a 0%, #facc15 50%, #eab308 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                textTransform: 'uppercase',
                boxShadow: '0 0 10px rgba(234, 179, 8, 0.2)',
              }}
            >
              ✨ INVITE ONLY
            </span>
          </button>
        </div>

        {/* Footer note */}
        <p
          style={{
            marginTop: 26,
            fontSize: '10px',
            color: 'var(--silver-500)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          HIGH-ORDER PATH NETWORK INTELLIGENCE
        </p>
      </div>
    </div>
  );
}
