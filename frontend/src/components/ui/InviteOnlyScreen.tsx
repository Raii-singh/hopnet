'use client';

/**
 * InviteOnlyScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen experience shown when appMode === 'own'.
 *
 * This is a deliberate product decision, not a placeholder or error state.
 * HOPNet is invite-only. This screen communicates that with intentionality.
 *
 * No fake "Request an Invite" CTA — we have no mechanism for that yet.
 * The visitor is invited to explore the demo instead.
 */

import { useAppStore } from '@/store/appStore';

export default function InviteOnlyScreen() {
  const { setAppMode } = useAppStore();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(2, 2, 8, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '24px',
      }}
    >
      <div
        className="animate-fade-in-scale"
        style={{
          width: '100%',
          maxWidth: 460,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        {/* Heading */}
        <h1
          style={{
            margin: '0 0 12px 0',
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--silver-100)',
          }}
        >
          HOPNet is currently invite-only.
        </h1>

        {/* Body */}
        <p
          style={{
            margin: '0 0 36px 0',
            fontSize: '14px',
            color: 'var(--silver-400)',
            lineHeight: 1.7,
            maxWidth: 360,
          }}
        >
          Explore the demo network to see what HOPNet can do.
          <br />
          Your own network is available by invitation.
        </p>

        {/* Divider */}
        <div
          style={{
            width: 40,
            height: 1,
            background: 'rgba(255,255,255,0.10)',
            marginBottom: 32,
          }}
        />

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: '100%',
            maxWidth: 320,
          }}
        >
          <button
            id="invite-explore-demo-btn"
            onClick={() => setAppMode('demo')}
            style={{
              width: '100%',
              padding: '13px 24px',
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 10,
              cursor: 'pointer',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.35)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
            Explore Demo Network
          </button>
        </div>

        {/* Footer */}
        <p
          style={{
            marginTop: 32,
            fontSize: '10px',
            color: 'var(--silver-600)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          High-Order Path Network Intelligence
        </p>
      </div>
    </div>
  );
}
