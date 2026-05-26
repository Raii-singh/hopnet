'use client';

import { GraphNode } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface NodeProfileModalProps {
  node: GraphNode;
  onClose: () => void;
}

function StatRow({ label, value, color = 'var(--silver-200)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
      <span className="text-label">{label}</span>
      <span className="text-mono" style={{ fontSize: '13px', fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

export default function NodeProfileModal({ node, onClose }: NodeProfileModalProps) {
  const {
    workspaceMode,
    modifyUserNode,
    removeUserNode,
    setRootNode,
    highlightNeighbors,
    visibleLinks,
  } = useGraphStore();

  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  const isReal = node.nodeType === 'REAL';

  // Form states
  const [fullName, setFullName] = useState(node.fullName);
  const [nodeType, setNodeType] = useState<'REAL' | 'DEMO'>(node.nodeType);
  const [username, setUsername] = useState(node.username || '');
  const [email, setEmail] = useState(node.email || '');
  const [phone, setPhone] = useState(node.phone || '');
  const [company, setCompany] = useState(node.company || '');
  const [cluster, setCluster] = useState(node.cluster || '');
  const [tagsInput, setTagsInput] = useState(node.tags ? node.tags.join(', ') : '');
  const [influenceScore, setInfluenceScore] = useState(node.influenceScore || 50);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if node changes
  useEffect(() => {
    setFullName(node.fullName);
    setNodeType(node.nodeType);
    setUsername(node.username || '');
    setEmail(node.email || '');
    setPhone(node.phone || '');
    setCompany(node.company || '');
    setCluster(node.cluster || '');
    setTagsInput(node.tags ? node.tags.join(', ') : '');
    setInfluenceScore(node.influenceScore || 50);
    setActiveTab('view');
    setErrorMsg('');
  }, [node]);

  const totalConn = node.connectionCount || 0;
  const realRatio = totalConn > 0 ? Math.round((node.realConnections / totalConn) * 100) : 0;
  const influencePercent = Math.min(100, node.influenceScore);
  const centralityPercent = Math.round((node.centrality || 0) * 100);

  // Find strongest connection
  const myEdges = visibleLinks.filter(e => {
    const src = typeof e.source === 'string' ? e.source : e.source.id;
    const tgt = typeof e.target === 'string' ? e.target : e.target.id;
    return (src === node.id || tgt === node.id) && e.edgeType === 'REAL_EDGE';
  });
  const strongestEdge = myEdges.sort((a, b) => b.weight - a.weight)[0];

  // Derive Advanced Relationship Intelligence V3.0
  const strategicReach = totalConn + Math.round((node.influenceScore / 100) * 12 * 0.4);
  const warmIntroPct = Math.min(99, Math.round(node.influenceScore * 0.85));
  const propagationScore = Math.min(98, Math.round(node.influenceScore * 0.92 + (node.realConnections * 1.5)));
  const connectorClassification = node.realConnections > 5 ? 'Community Hub Bridger' : 'Cluster Connector';

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSave(e: React.FormEvent) {
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

      await modifyUserNode(node.id, {
        fullName: fullName.trim(),
        nodeType,
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        cluster: cluster.trim() || undefined,
        tags,
        influenceScore,
      });
      setActiveTab('view');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update node configuration.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSoftDelete() {
    if (!confirm(`Are you sure you want to soft delete "${node.fullName}"?\n\nThis will hide the node from the network, but retain the metadata record in database archives.`)) {
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await removeUserNode(node.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete node.');
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-panel-strong animate-fade-in-scale"
        style={{
          width: 420,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          padding: 0,
          position: 'relative',
        }}
      >
        {/* ── TOP ACCENT BAR ── */}
        <div style={{
          height: 3,
          background: isReal
            ? 'linear-gradient(90deg, var(--neon-cyan), var(--neon-blue), var(--neon-violet))'
            : 'linear-gradient(90deg, var(--silver-700), var(--silver-600))',
          borderRadius: '12px 12px 0 0',
        }} />

        {/* ── TABS (Only in Workspace Mode) ── */}
        {workspaceMode && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--glass-border)',
            background: 'rgba(0,0,0,0.15)',
          }}>
            <button
              onClick={() => setActiveTab('view')}
              style={{
                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                background: activeTab === 'view' ? 'transparent' : 'transparent',
                borderBottom: activeTab === 'view' ? '2px solid var(--neon-cyan)' : '2px solid transparent',
                color: activeTab === 'view' ? 'var(--neon-cyan)' : 'var(--silver-500)',
                fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                transition: 'all 0.2s',
              }}
            >
              Details View
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              style={{
                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                background: activeTab === 'edit' ? 'transparent' : 'transparent',
                borderBottom: activeTab === 'edit' ? '2px solid var(--neon-violet)' : '2px solid transparent',
                color: activeTab === 'edit' ? 'var(--neon-violet)' : 'var(--silver-500)',
                fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                transition: 'all 0.2s',
              }}
            >
              Edit Node Details
            </button>
          </div>
        )}

        <div style={{ padding: '20px 24px' }}>
          {activeTab === 'view' ? (
            <>
              {/* ── HEADER ── */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Avatar circle */}
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: isReal
                      ? 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.3))'
                      : 'linear-gradient(135deg, rgba(100,116,139,0.3), rgba(71,85,105,0.3))',
                    border: `2px solid ${isReal ? 'rgba(6,182,212,0.5)' : 'rgba(100,116,139,0.4)'}`,
                    boxShadow: isReal ? '0 0 20px rgba(6,182,212,0.2)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: isReal ? 'var(--neon-cyan)' : 'var(--silver-500)',
                    flexShrink: 0,
                  }}>
                    {node.fullName.charAt(0)}
                  </div>

                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--silver-100)', margin: 0, lineHeight: 1.3 }}>
                      {node.fullName}
                    </h2>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
                      <span className={`badge ${isReal ? 'badge-real' : 'badge-demo'}`}>
                        {isReal ? '● REAL' : '○ DEMO'}
                      </span>
                      {node.cluster && (
                        <span className="badge" style={{
                          background: 'rgba(139,92,246,0.12)',
                          border: '1px solid rgba(139,92,246,0.3)',
                          color: 'var(--neon-violet)',
                        }}>
                          {node.cluster}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Close button */}
                <button
                  id="modal-close-btn"
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    color: 'var(--silver-500)',
                    cursor: 'pointer',
                    width: 30, height: 30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
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

              {/* Public ID and Company */}
              <div className="text-mono" style={{ fontSize: '11px', color: 'var(--silver-400)', marginBottom: '8px', marginTop: '-8px', display: 'flex', gap: '8px' }}>
                <span>ID: <span style={{ color: 'var(--neon-cyan)', fontWeight: 600 }}>{node.publicId}</span></span>
                {node.company && <span style={{ color: 'var(--silver-600)' }}>| {node.company}</span>}
              </div>

              {/* Tags */}
              {node.tags && node.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {node.tags.map(tag => (
                    <span key={tag} style={{
                      padding: '2px 8px', borderRadius: '100px',
                      fontSize: '10px', fontWeight: 500,
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--silver-400)',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="divider" />

              {/* ── RELATIONSHIP INTELLIGENCE INSIGHTS (V3.0) ── */}
              <div className="glass-panel" style={{
                padding: '12px 14px',
                background: 'rgba(139,92,246,0.02)',
                borderColor: 'rgba(139,92,246,0.2)',
                marginBottom: '16px',
              }}>
                <div className="text-label" style={{ marginBottom: '10px', color: 'var(--neon-violet)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 17 22 12"/>
                  </svg>
                  Relationship Intelligence
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '8px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--silver-500)', fontSize: '8px', textTransform: 'uppercase' }}>Classification</div>
                    <div style={{ fontWeight: 600, color: 'var(--silver-200)', marginTop: '2px' }}>{connectorClassification}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--silver-500)', fontSize: '8px', textTransform: 'uppercase' }}>Strategic Reach</div>
                    <div style={{ fontWeight: 600, color: 'var(--neon-cyan)', marginTop: '2px' }}>{strategicReach} Nodes</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--silver-500)', fontSize: '8px', textTransform: 'uppercase' }}>Intro Potential</div>
                    <div style={{ fontWeight: 600, color: 'var(--neon-emerald)', marginTop: '2px' }}>{warmIntroPct}% Success</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--silver-500)', fontSize: '8px', textTransform: 'uppercase' }}>Influence Spread</div>
                    <div style={{ fontWeight: 600, color: 'var(--neon-violet)', marginTop: '2px' }}>{propagationScore}% Power</div>
                  </div>
                </div>
              </div>

              {/* ── STATS SECTION ── */}
              <div style={{ marginBottom: '16px' }}>
                <div className="text-label" style={{ marginBottom: '10px', color: 'var(--neon-blue)' }}>Network Metrics</div>
                <StatRow label="Total Connections" value={totalConn} />
                <StatRow label="Real Connections" value={node.realConnections} color="var(--neon-cyan)" />
                <StatRow label="Demo Connections" value={node.demoConnections} color="var(--silver-500)" />
                <StatRow label="Influence Score" value={node.influenceScore} color="var(--neon-cyan)" />
                {centralityPercent > 0 && (
                  <StatRow label="Centrality" value={`${centralityPercent}%`} color="var(--neon-blue)" />
                )}
                {strongestEdge && (
                  <StatRow
                    label="Strongest Link Score"
                    value={Math.round(strongestEdge.weight * 100)}
                    color="var(--neon-emerald)"
                  />
                )}
              </div>

              {/* ── MINI VISUALIZATIONS ── */}
              <div style={{ marginBottom: '16px' }}>
                <div className="text-label" style={{ marginBottom: '10px', color: 'var(--neon-blue)' }}>Visual Metrics</div>

                {/* Real connection ratio */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--silver-400)' }}>Connection Score Ratio</span>
                    <span className="text-mono" style={{ fontSize: '11px', color: 'var(--neon-cyan)' }}>{realRatio}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-fill progress-fill-cyan" style={{ width: `${realRatio}%` }} />
                  </div>
                </div>

                {/* Influence meter */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--silver-400)' }}>Influence Power</span>
                    <span className="text-mono" style={{ fontSize: '11px', color: 'var(--neon-blue)' }}>{influencePercent}</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-fill progress-fill-blue" style={{ width: `${influencePercent}%` }} />
                  </div>
                </div>
              </div>

              <div className="divider" />

              {/* ── ACTIONS ── */}
              <div className="text-label" style={{ marginBottom: '10px', color: 'var(--neon-blue)' }}>Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                
                <Link href={`/profile/${node.publicId}`} style={{ textDecoration: 'none' }} onClick={() => onClose()}>
                  <button
                    id="view-profile-btn"
                    className="glass-button"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
                    </svg>
                    Explore Full Profile & Trust Path
                  </button>
                </Link>

                <button
                  id="highlight-neighbors-btn"
                  className="glass-button"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                  onClick={() => { highlightNeighbors(node.id); onClose(); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                  </svg>
                  Highlight Neighbors
                </button>

                <button
                  id="focus-node-btn"
                  className="glass-button"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                  onClick={() => { setRootNode(node.id); onClose(); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  Focus Graph Here
                </button>
              </div>
            </>
          ) : (
            /* ── EDIT TAB FORM ── */
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {errorMsg && (
                <div className="glass-panel" style={{
                  background: 'rgba(244,63,94,0.06)',
                  borderColor: 'rgba(244,63,94,0.3)',
                  color: 'rgba(244,63,94,0.9)',
                  padding: '8px 12px',
                  fontSize: '11px',
                  borderRadius: '6px',
                }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Full Name & Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="text-label" style={{ marginBottom: '4px', display: 'block' }}>Full Name *</label>
                  <input
                    required
                    className="glass-input"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-label" style={{ marginBottom: '4px', display: 'block' }}>Type</label>
                  <select
                    className="glass-input"
                    value={nodeType}
                    onChange={e => setNodeType(e.target.value as any)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="REAL" style={{ background: '#0a0a18' }}>REAL</option>
                    <option value="DEMO" style={{ background: '#0a0a18' }}>DEMO</option>
                  </select>
                </div>
              </div>

              {/* Username & Company */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="text-label" style={{ marginBottom: '4px', display: 'block' }}>Username</label>
                  <input
                    className="glass-input"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-label" style={{ marginBottom: '4px', display: 'block' }}>Company</label>
                  <input
                    className="glass-input"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
                <div>
                  <label className="text-label" style={{ marginBottom: '4px', display: 'block' }}>E-mail Address</label>
                  <input
                    type="email"
                    className="glass-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-label" style={{ marginBottom: '4px', display: 'block' }}>Phone Number</label>
                  <input
                    className="glass-input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Cluster & Tags */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="text-label" style={{ marginBottom: '4px', display: 'block' }}>Cluster Hub</label>
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
                  <label className="text-label" style={{ marginBottom: '4px', display: 'block' }}>Tags</label>
                  <input
                    className="glass-input"
                    value={tagsInput}
                    onChange={e => setTagsInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Influence score */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="text-label">Influence Score</label>
                  <span className="text-mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-violet)' }}>{influenceScore}</span>
                </div>
                <input
                  type="range"
                  min={1} max={100}
                  value={influenceScore}
                  onChange={e => setInfluenceScore(Number(e.target.value))}
                  className="hop-slider"
                  style={{
                    background: `linear-gradient(to right, var(--neon-violet) 0%, var(--neon-violet) ${influenceScore}%, rgba(255,255,255,0.1) ${influenceScore}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
              </div>

              <div className="divider" style={{ margin: '8px 0 2px' }} />

              {/* Form Controls */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleSoftDelete}
                  disabled={isSubmitting}
                  className="glass-button"
                  style={{
                    borderColor: 'rgba(244,63,94,0.3)',
                    color: 'rgba(244,63,94,0.8)',
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                >
                  Delete Node
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="glass-button"
                    onClick={() => setActiveTab('view')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="glass-button font-semibold"
                    disabled={isSubmitting}
                    style={{
                      borderColor: 'rgba(139,92,246,0.5)',
                      color: 'var(--neon-violet)',
                      background: 'rgba(139,92,246,0.08)',
                      boxShadow: '0 0 10px rgba(139,92,246,0.15)',
                    }}
                  >
                    {isSubmitting ? 'Syncing...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
