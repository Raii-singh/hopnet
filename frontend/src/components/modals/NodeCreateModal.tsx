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
        createdBy: 'Manual Workspace',
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
        {/* Top Accent line — amber for DEMO, white for REAL */}
        <div style={{
          height: 3,
          background: nodeType === 'DEMO'
            ? 'linear-gradient(90deg, #f59e0b, #d97706)'
            : 'linear-gradient(90deg, #ffffff, var(--silver-500))',
          borderRadius: '12px 12px 0 0',
          transition: 'background 0.3s',
        }} />

        <div style={{ padding: '20px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
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

          {/* DEMO TYPE WARNING BANNER */}
          {nodeType === 'DEMO' && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.07)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '8px',
              padding: '9px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11.5px',
              color: 'rgba(245, 158, 11, 0.9)',
              fontWeight: 600,
              marginBottom: '4px',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Creating a DEMO node — this will be synthetic / hypothetical data, not a real identity.
            </div>
          )}


          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {errorMsg && (
              <div className="glass-panel" style={{
                background: 'rgba(244,63,94,0.06)',
                borderColor: 'rgba(244,63,94,0.3)',
                color: 'rgba(244,63,94,0.9)',
                padding: '10px 14px',
                fontSize: '12px',
                marginBottom: '4px',
                borderRadius: '8px',
              }}>
                ⚠️ {errorMsg}
              </div>
            )}

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
                  <option value="REAL" style={{ background: '#020202', color: '#fff' }}>REAL</option>
                  <option value="DEMO" style={{ background: '#020202', color: '#fff' }}>DEMO</option>
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
                  <option value="" style={{ background: '#020202' }}>-- None --</option>
                  <option value="Tech" style={{ background: '#020202' }}>Tech</option>
                  <option value="Finance" style={{ background: '#020202' }}>Finance</option>
                  <option value="Health" style={{ background: '#020202' }}>Health</option>
                  <option value="Venture" style={{ background: '#020202' }}>Venture</option>
