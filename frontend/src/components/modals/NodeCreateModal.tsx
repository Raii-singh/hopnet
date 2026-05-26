'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';

interface NodeCreateModalProps {
  onClose: () => void;
}

export default function NodeCreateModal({ onClose }: NodeCreateModalProps) {
  const { createNewNode } = useGraphStore();

  const [fullName, setFullName] = useState('');
  const [nodeType, setNodeType] = useState<'REAL' | 'DEMO'>('REAL');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [cluster, setCluster] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [influenceScore, setInfluenceScore] = useState(50);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const parsedData = {
        fullName: fullName.trim(),
        nodeType,
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        cluster: cluster.trim() || undefined,
        influenceScore,
        tags,
        sourceConnectors: ['Manual Workspace'],
      };

      await createNewNode(parsedData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user node.');
    } finally {
      setIsSubmitting(false);
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
          width: 440,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          padding: 0,
        }}
      >
        {/* Top Accent line */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-blue))',
          borderRadius: '12px 12px 0 0',
        }} />

        <div style={{ padding: '20px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2.5">
                <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M2 21v-2a4 4 0 0 1 9-3.87"/>
              </svg>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>Create Intelligence Node</h2>
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Full Name & Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label className="text-label" style={{ marginBottom: '6px', display: 'block' }}>Full Name *</label>
                <input
                  required
                  className="glass-input"
                  placeholder="e.g. Satoshi Nakamoto"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-label" style={{ marginBottom: '6px', display: 'block' }}>Node Type</label>
                <select
                  className="glass-input"
                  value={nodeType}
                  onChange={e => setNodeType(e.target.value as any)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="REAL" style={{ background: '#0a0a18', color: '#fff' }}>REAL</option>
                  <option value="DEMO" style={{ background: '#0a0a18', color: '#fff' }}>DEMO</option>
                </select>
              </div>
            </div>

            {/* Username & Company */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="text-label" style={{ marginBottom: '6px', display: 'block' }}>Username</label>
                <input
                  className="glass-input"
                  placeholder="e.g. satoshi"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="text-label" style={{ marginBottom: '6px', display: 'block' }}>Company</label>
                <input
                  className="glass-input"
                  placeholder="e.g. Bitcoin Corp"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
              <div>
                <label className="text-label" style={{ marginBottom: '6px', display: 'block' }}>E-mail Address</label>
                <input
                  type="email"
                  className="glass-input"
                  placeholder="satoshi@bitcoin.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-label" style={{ marginBottom: '6px', display: 'block' }}>Phone Number</label>
                <input
                  className="glass-input"
                  placeholder="+1 555-0199"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Cluster Hub & Tags */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="text-label" style={{ marginBottom: '6px', display: 'block' }}>Cluster Assignment</label>
                <select
                  className="glass-input"
                  value={cluster}
                  onChange={e => setCluster(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="" style={{ background: '#0a0a18' }}>-- None --</option>
                  <option value="Tech" style={{ background: '#0a0a18' }}>Tech</option>
                  <option value="Finance" style={{ background: '#0a0a18' }}>Finance</option>
                  <option value="Health" style={{ background: '#0a0a18' }}>Health</option>
                  <option value="Venture" style={{ background: '#0a0a18' }}>Venture</option>
                  <option value="Academia" style={{ background: '#0a0a18' }}>Academia</option>
                </select>
              </div>

              <div>
                <label className="text-label" style={{ marginBottom: '6px', display: 'block' }}>Tags (comma-separated)</label>
                <input
                  className="glass-input"
                  placeholder="crypto, founder, anon"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                />
              </div>
            </div>

            {/* Influence Score Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="text-label">Influence Score</label>
                <span className="text-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neon-cyan)' }}>{influenceScore}</span>
              </div>
              <input
                type="range"
                min={1} max={100}
                value={influenceScore}
                onChange={e => setInfluenceScore(Number(e.target.value))}
                className="hop-slider"
                style={{
                  background: `linear-gradient(to right, var(--neon-cyan) 0%, var(--neon-cyan) ${influenceScore}%, rgba(255,255,255,0.1) ${influenceScore}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
            </div>

            <div className="divider" style={{ margin: '10px 0 6px' }} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="glass-button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.5 : 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glass-button font-semibold"
                disabled={isSubmitting}
                style={{
                  borderColor: 'rgba(6,182,212,0.5)',
                  color: 'var(--neon-cyan)',
                  background: 'rgba(6,182,212,0.08)',
                  boxShadow: '0 0 15px rgba(6,182,212,0.15)',
                  opacity: isSubmitting ? 0.5 : 1,
                }}
              >
                {isSubmitting ? 'Establishing Ledger...' : 'Establish Node'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
