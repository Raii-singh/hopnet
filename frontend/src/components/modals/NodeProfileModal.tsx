'use client';

import { GraphNode } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

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
  const { isAdmin } = useAuthStore();

  const {
    workspaceMode,
    modifyUserNode,
    removeUserNode,
    setRootNode,
    primaryNodeId,
    setPrimaryNode,
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
    // Initial optimistic state from the graph
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

    // Fetch live, fresh data from the server
    let active = true;
    import('@/services/api').then(({ fetchNodeV2 }) => {
      fetchNodeV2(node.id).then(liveNode => {
        if (!active) return;
        setFullName(liveNode.fullName);
        setNodeType(liveNode.nodeType);
        setUsername(liveNode.username || '');
        setEmail(liveNode.email || '');
        setPhone(liveNode.phone || '');
        setCompany(liveNode.company || '');
        setCluster(liveNode.cluster || '');
        setTagsInput(liveNode.tags ? liveNode.tags.join(', ') : '');
        setInfluenceScore(liveNode.influenceScore || 50);
      }).catch(err => console.warn('Failed to fetch live node details:', err));
    });

    return () => { active = false; };
  }, [node.id]); // only refetch if node ID changes, optimistic update otherwise

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
        // nodeType is intentionally omitted — it is immutable after creation.
        // The graphStore strips it before calling the v2 API.
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
        {/* ── TOP ACCENT BAR — color-coded by nodeType ── */}
        <div style={{
          height: 3,
          background: isReal
            ? 'linear-gradient(90deg, var(--neon-cyan), var(--neon-blue), var(--neon-violet))'
            : 'linear-gradient(90deg, #f59e0b, #d97706, #b45309)',
          borderRadius: '12px 12px 0 0',
        }} />

        {/* ── DEMO WARNING BANNER ── */}
        {!isReal && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            padding: '7px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11.5px',
            color: 'rgba(245, 158, 11, 0.9)',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            DEMO NODE — Synthetic / hypothetical data. Not a verified real-world identity.
          </div>
        )}

        {/* ── TABS ── */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--glass-border)',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <button
            onClick={() => setActiveTab('view')}
            style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
              background: 'transparent',
              borderBottom: activeTab === 'view' ? '2px solid #ffffff' : '2px solid transparent',
              color: activeTab === 'view' ? '#ffffff' : 'var(--silver-500)',
              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
              transition: 'all 0.2s',
            }}
          >
            Details View
          </button>
          <button
            onClick={() => isAdmin && setActiveTab('edit')}
            disabled={!isAdmin}
            title={!isAdmin ? 'SUDO Mode Required' : ''}
            style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: !isAdmin ? 'not-allowed' : 'pointer',
              background: 'transparent',
              borderBottom: activeTab === 'edit' ? '2px solid #ffffff' : '2px solid transparent',
              color: activeTab === 'edit' ? '#ffffff' : 'var(--silver-500)',
              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
              transition: 'all 0.2s',
              opacity: !isAdmin ? 0.4 : 1,
            }}
          >
            Edit Node Details {isAdmin ? '' : '🔒'}
          </button>
        </div>

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
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'
                      : 'linear-gradient(135deg, rgba(100,116,139,0.15), rgba(71,85,105,0.15))',
                    border: `2px solid ${isReal ? 'rgba(255,255,255,0.25)' : 'rgba(100,116,139,0.4)'}`,
                    boxShadow: isReal ? '0 0 20px rgba(255,255,255,0.05)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: isReal ? '#ffffff' : 'var(--silver-500)',
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
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#ffffff',
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
                <span>ID: <span style={{ color: '#ffffff', fontWeight: 600 }}>{node.publicId}</span></span>
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
                background: 'rgba(255,255,255,0.01)',
                borderColor: 'rgba(255,255,255,0.08)',
                marginBottom: '16px',
              }}>
                <div className="text-label" style={{ marginBottom: '10px', color: 'var(--silver-400)', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                    <div style={{ fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>{strategicReach} Nodes</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--silver-500)', fontSize: '8px', textTransform: 'uppercase' }}>Intro Potential</div>
                    <div style={{ fontWeight: 600, color: 'var(--silver-200)', marginTop: '2px' }}>{warmIntroPct}% Success</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '6px 8px', borderRadius: '4px' }}>
                    <div style={{ color: 'var(--silver-500)', fontSize: '8px', textTransform: 'uppercase' }}>Influence Spread</div>
                    <div style={{ fontWeight: 600, color: 'var(--silver-400)', marginTop: '2px' }}>{propagationScore}% Power</div>
                  </div>
                </div>
              </div>

              {/* ── STATS SECTION ── */}
              <div style={{ marginBottom: '16px' }}>
                <div className="text-label" style={{ marginBottom: '10px', color: '#ffffff' }}>Network Metrics</div>
                <StatRow label="Total Connections" value={totalConn} />
                <StatRow label="Real Connections" value={node.realConnections} color="#ffffff" />
                <StatRow label="Demo Connections" value={node.demoConnections} color="var(--silver-500)" />
                <StatRow label="Influence Score" value={node.influenceScore} color="#ffffff" />
                {centralityPercent > 0 && (
                  <StatRow label="Centrality" value={`${centralityPercent}%`} color="#ffffff" />
                )}
                {strongestEdge && (
                  <StatRow
                    label="Strongest Link Score"
                    value={Math.round(strongestEdge.weight * 100)}
                    color="#ffffff"
                  />
                )}
              </div>

              {/* ── MINI VISUALIZATIONS ── */}
              <div style={{ marginBottom: '16px' }}>
                <div className="text-label" style={{ marginBottom: '10px', color: '#ffffff' }}>Visual Metrics</div>

                {/* Real connection ratio */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--silver-400)' }}>Connection Score Ratio</span>
                    <span className="text-mono" style={{ fontSize: '11px', color: '#ffffff' }}>{realRatio}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-fill progress-fill-cyan" style={{ width: `${realRatio}%`, background: 'linear-gradient(90deg, #ffffff, #cbd5e1)' }} />
                  </div>
                </div>

                {/* Influence meter */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--silver-400)' }}>Influence Power</span>
                    <span className="text-mono" style={{ fontSize: '11px', color: '#ffffff' }}>{influencePercent}</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-fill progress-fill-blue" style={{ width: `${influencePercent}%`, background: 'linear-gradient(90deg, #cbd5e1, #475569)' }} />
                  </div>
