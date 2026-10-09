'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const BASE_URL_V2 = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL + '/v2' : 'http://localhost:3001/api/v2';

export default function SudoLoginModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { checkAuth } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BASE_URL_V2}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      });

      if (res.ok) {
        await checkAuth();
        onClose();
      } else {
        const json = await res.json();
        setError(json.message || json.error?.message || 'Invalid credentials');
      }
    } catch {
      setError('Failed to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '330px',
          padding: '24px',
          background: 'rgba(5, 5, 5, 0.94)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 20px rgba(255,255,255,0.06)',
          borderRadius: '12px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          SUDO Authentication
        </h3>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="password"
            autoFocus
            placeholder="Enter passphrase..."
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '8px',
              color: '#fff',
              outline: 'none',
              fontFamily: 'monospace',
              fontSize: '13px',
              transition: 'border-color 0.2s',
            }}
          />

          {error && <div style={{ color: '#f87171', fontSize: '12px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              className="glass-button"
              onClick={onClose}
              style={{ flex: 1, padding: '10px', fontSize: '13px', borderColor: 'rgba(255,255,255,0.15)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '13px',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 0 12px rgba(255, 255, 255, 0.08)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.5)';
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)';
                }
              }}
            >
              {loading ? 'Authenticating...' : 'Authenticate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
