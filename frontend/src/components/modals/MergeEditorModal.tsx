'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { fetchDuplicates } from '@/services/api';

interface MergeEditorModalProps {
  onClose: () => void;
}

export default function MergeEditorModal({ onClose }: MergeEditorModalProps) {
  const { executeMerge } = useGraphStore();

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [mergingPairId, setMergingPairId] = useState<string | null>(null);

  async function loadDuplicates() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchDuplicates();
      if (res && res.suggestions) {
        setSuggestions(res.suggestions);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to detect duplicates from database ledger.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDuplicates();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleMerge(userA: any, userB: any, survivingUserId: string) {
    const sourceId = survivingUserId === userA.id ? userB.id : userA.id;
    const targetId = survivingUserId;

    const sourceName = survivingUserId === userA.id ? userB.fullName : userA.fullName;
    const targetName = survivingUserId === userA.id ? userA.fullName : userB.fullName;

    if (!confirm(`Are you sure you want to merge "${sourceName}" into "${targetName}"?\n\nThis will reassign all relationships to "${targetName}", combine tags/metadata, and soft-delete "${sourceName}" permanently.`)) {
      return;
    }

    const pairId = `${userA.id}-${userB.id}`;
    setMergingPairId(pairId);
    setErrorMsg('');

    try {
      await executeMerge(sourceId, targetId);
      // Reload duplicate suggestions
      await loadDuplicates();
    } catch (err: any) {
      setErrorMsg(err.message || 'Merge identity execution failed.');
      setMergingPairId(null);
    }
  }

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-panel-strong animate-fade-in-scale"
        style={{
          width: 520,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          padding: 0,
        }}
      >
        {/* Top Accent line */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, var(--neon-emerald), var(--neon-cyan))',
          borderRadius: '12px 12px 0 0',
        }} />

        <div style={{ padding: '20px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neon-emerald)" strokeWidth="2.5">
                <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              </svg>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>
                Duplicate Identity Manager Suggestions
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'var(--silver-500)',
                cursor: 'pointer',
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--silver-100)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--silver-500)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <p style={{ color: 'var(--silver-500)', fontSize: '11px', lineHeight: 1.5, margin: '0 0 18px' }}>
            Fuzzy matching algorithms have flagged the following human nodes as potential duplicate profile records based on shared e-mail prefixes, identical companies, and matching full name structures.
          </p>

          {errorMsg && (
            <div className="glass-panel" style={{
              background: 'rgba(244,63,94,0.06)',
              borderColor: 'rgba(244,63,94,0.3)',
              color: 'rgba(244,63,94,0.9)',
              padding: '10px 14px',
              fontSize: '12px',
              marginBottom: '16px',
              borderRadius: '8px',
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
              <div style={{ width: 28, height: 28, border: '2px solid var(--neon-emerald)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
              <span className="text-label" style={{ color: 'var(--neon-emerald)', fontSize: '11px' }}>Scanning relationship index ledger…</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', background: 'rgba(16,185,129,0.01)', borderColor: 'rgba(16,185,129,0.1)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--neon-emerald)" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.8 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--silver-200)', marginBottom: '4px' }}>No duplicates flagged</div>
              <div style={{ fontSize: '11px', color: 'var(--silver-600)' }}>The network database currently satisfies full data uniqueness constraints.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              {suggestions.map((s, index) => {
                const pairId = `${s.userA.id}-${s.userB.id}`;
                const isMerging = mergingPairId === pairId;
                return (
                  <div key={pairId} className="glass-panel" style={{
                    padding: '14px 16px',
                    borderColor: 'rgba(16,185,129,0.15)',
                    background: 'rgba(255,255,255,0.01)',
                  }}>
                    {/* Badge similarity */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--silver-400)', fontWeight: 600 }}>Flagged Pair #{index + 1}</span>
                      <span className="text-mono" style={{
                        fontSize: '10px', fontWeight: 700,
                        background: 'rgba(16,185,129,0.15)',
                        border: '1px solid rgba(16,185,129,0.4)',
                        padding: '1px 6px', borderRadius: '100px',
                        color: 'var(--neon-emerald)',
                      }}>
                        {s.similarity}% Similarity Score
                      </span>
                    </div>

                    {/* Nodes side by side comparisons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                      {/* User A */}
                      <div className="glass-panel" style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.15)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--silver-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profile A</div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--silver-200)', marginTop: '4px' }}>{s.userA.fullName}</div>
                        <div className="text-mono" style={{ fontSize: '9.5px', color: 'var(--silver-500)', marginTop: '2px' }}>{s.userA.publicId}</div>
                        {s.userA.company && <div style={{ fontSize: '10.5px', color: 'var(--silver-400)', marginTop: '4px' }}>🏢 {s.userA.company}</div>}
                        {s.userA.email && <div style={{ fontSize: '10px', color: 'var(--neon-cyan)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>✉️ {s.userA.email}</div>}
                      </div>

                      {/* User B */}
                      <div className="glass-panel" style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.15)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--silver-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profile B</div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--silver-200)', marginTop: '4px' }}>{s.userB.fullName}</div>
                        <div className="text-mono" style={{ fontSize: '9.5px', color: 'var(--silver-500)', marginTop: '2px' }}>{s.userB.publicId}</div>
                        {s.userB.company && <div style={{ fontSize: '10.5px', color: 'var(--silver-400)', marginTop: '4px' }}>🏢 {s.userB.company}</div>}
                        {s.userB.email && <div style={{ fontSize: '10px', color: 'var(--neon-cyan)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>✉️ {s.userB.email}</div>}
                      </div>
                    </div>

                    {/* Reason statement */}
                    <div style={{ fontSize: '11px', color: 'var(--silver-400)', fontStyle: 'italic', marginBottom: '12px' }}>
                      Reason: <span style={{ color: 'var(--silver-300)', fontWeight: 500 }}>{s.reason}</span>
                    </div>

                    {/* Merge action buttons */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--silver-600)', alignSelf: 'center', marginRight: 'auto' }}>Surviving Node:</span>
                      <button
                        className="glass-button"
                        onClick={() => handleMerge(s.userA, s.userB, s.userA.id)}
                        disabled={isMerging}
                        style={{ fontSize: '10.5px', padding: '4px 10px', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--neon-emerald)' }}
                      >
                        {isMerging ? 'Merging...' : 'Keep A'}
                      </button>
                      <button
                        className="glass-button"
                        onClick={() => handleMerge(s.userA, s.userB, s.userB.id)}
                        disabled={isMerging}
                        style={{ fontSize: '10.5px', padding: '4px 10px', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--neon-emerald)' }}
                      >
                        {isMerging ? 'Merging...' : 'Keep B'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
