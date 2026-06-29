'use client';

import { useState, useMemo } from 'react';
import { GraphNode, GraphEdge } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import NodeCreateModal from '@/components/modals/NodeCreateModal';
import NodeProfileModal from '@/components/modals/NodeProfileModal';
import EdgeEditorModal from '@/components/modals/EdgeEditorModal';

type SortKey = 'rank' | 'name' | 'connectionCount' | 'influenceScore' | 'realConnections' | 'avgPathDistance';
type SortDir = 'asc' | 'desc';
type ClusterFilter = 'All' | string;
type TypeFilter = 'All' | 'REAL' | 'DEMO';

function computeRank(node: GraphNode): number {
  return node.realConnections || node.connectionCount || 0;
}

export default function DatabasePage() {
  const router = useRouter();
  const { databaseNodes, visibleLinks, setRootNode, primaryNodeId, setPrimaryNode, removeUserNode, removeEdge, isLoading, refreshDatabase } = useGraphStore();
  const { isAdmin } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [clusterFilter, setClusterFilter] = useState<ClusterFilter>('All');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [page, setPage] = useState(0);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  // Modals state for GUI CRUD
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null);
  const [deletingNode, setDeletingNode] = useState<GraphNode | null>(null);
  const [editingEdge, setEditingEdge] = useState<GraphEdge | null>(null);
  const [creatingEdgeSourceId, setCreatingEdgeSourceId] = useState<string | null>(null);
  const PER_PAGE = 12;

  // Initialize DB data once when page loads & handle client hydration
  React.useEffect(() => {
    setIsMounted(true);
    refreshDatabase();
  }, [refreshDatabase]);

  const clusters = useMemo(() => {
    const s = new Set(databaseNodes.map(n => n.cluster).filter(Boolean) as string[]);
    return ['All', ...Array.from(s).sort()];
  }, [databaseNodes]);

  const ranked = useMemo(() => {
    const list = databaseNodes.map(n => ({ ...n, rankScore: computeRank(n) }));
    list.sort((a, b) => {
      if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
      if (b.influenceScore !== a.influenceScore) return b.influenceScore - a.influenceScore;
      return a.fullName.localeCompare(b.fullName);
    });
    return list;
  }, [databaseNodes]);

  const filtered = useMemo(() => {
    let r = ranked.filter(n => {
      const tagString = n.tags?.join(' ') || '';
      const matchSearch =
        !search ||
        n.fullName.toLowerCase().includes(search.toLowerCase()) ||
        n.company?.toLowerCase().includes(search.toLowerCase()) ||
        tagString.toLowerCase().includes(search.toLowerCase()) ||
        n.cluster?.toLowerCase().includes(search.toLowerCase()) ||
        n.publicId.toLowerCase().includes(search.toLowerCase());
      
      const matchCluster = clusterFilter === 'All' || n.cluster === clusterFilter;
      const matchType = typeFilter === 'All' || n.nodeType === typeFilter;
      return matchSearch && matchCluster && matchType;
    });

    r.sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortKey === 'rank') { va = a.rankScore; vb = b.rankScore; }
      else if (sortKey === 'name') { va = a.fullName; vb = b.fullName; }
      else if (sortKey === 'avgPathDistance') { va = a.avgPathDistance || 99; vb = b.avgPathDistance || 99; }
      else { va = (a as any)[sortKey]; vb = (b as any)[sortKey]; }

      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

    return r;
  }, [ranked, search, clusterFilter, typeFilter, sortKey, sortDir]);

  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ color: 'var(--silver-700)', marginLeft: 4 }}>↕</span>;
    return <span style={{ color: '#ffffff', marginLeft: 4 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>;
  }

  const colStyle = (k: SortKey): React.CSSProperties => ({
    padding: '10px 14px',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    color: sortKey === k ? '#ffffff' : 'var(--silver-500)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  });

  return (
    <div className="page-layout" style={{ overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
      <div className="page-content" style={{ paddingBottom: '48px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '28px' }}>
          <div className="text-label" style={{ color: 'var(--silver-400)', marginBottom: '6px' }}>Universal Database</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.02em', margin: 0 }}>
            Network Intelligence Index
          </h1>
          <p style={{ color: 'var(--silver-500)', fontSize: '13px', marginTop: '6px' }}>
            {databaseNodes.length} professional profiles · {visibleLinks.length} verified connections · sorted by connection count
          </p>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Index', value: databaseNodes.length, color: 'var(--silver-100)' },
            { label: 'Real Identities', value: databaseNodes.filter(n => n.nodeType === 'REAL').length, color: '#ffffff' },
            { label: 'Demo Expanders', value: databaseNodes.filter(n => n.nodeType === 'DEMO').length, color: 'var(--silver-500)' },
            { label: 'Graph Pathways', value: visibleLinks.length, color: 'var(--silver-300)' },
          ].map(s => (
            <div key={s.label} className="glass-panel" style={{ padding: '12px 16px' }}>
              <div className="text-label" style={{ marginBottom: '4px' }}>{s.label}</div>
              <div className="text-mono" style={{ fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="glass-panel" style={{ padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--silver-600)' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="glass-input"
              placeholder="Search name, ID, company or tags…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              style={{ paddingLeft: 30 }}
            />
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['All', 'REAL', 'DEMO'] as TypeFilter[]).map(t => (
              <button
                key={t}
                className={`glass-button ${typeFilter === t ? 'active' : ''}`}
                onClick={() => { setTypeFilter(t); setPage(0); }}
                style={{ padding: '6px 12px' }}
              >
                {t === 'REAL' && <span style={{ color: '#ffffff' }}>●</span>}
                {t === 'DEMO' && <span style={{ color: 'var(--silver-500)' }}>○</span>}
                {t}
              </button>
            ))}
          </div>

          {/* Cluster filter */}
          <select
            className="glass-input"
            value={clusterFilter}
            onChange={e => { setClusterFilter(e.target.value); setPage(0); }}
            style={{ width: 'auto', background: 'var(--bg-glass)', cursor: 'pointer' }}
          >
            {clusters.map(c => <option key={c} value={c} style={{ background: '#020202' }}>{c} Cluster</option>)}
          </select>

          {/* Lock state badge */}
          <div style={{
            padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600,
            background: isAdmin ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
            color: isAdmin ? '#4ade80' : 'var(--silver-400)',
            border: `1px solid ${isAdmin ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span>{isAdmin ? '🔓 SUDO ACTIVE' : '🔒 SUDO LOCKED'}</span>
          </div>

          <span className="text-label" style={{ whiteSpace: 'nowrap' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>

          {/* Add Person CTA */}
          <button
            id="db-add-person-btn"
            className="glass-button font-semibold"
            onClick={() => setShowCreateModal(true)}
            disabled={!isAdmin}
            title={!isAdmin ? 'SUDO Authentication Required' : 'Add new person'}
            style={{
              padding: '6px 14px',
              background: !isAdmin ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
              borderColor: !isAdmin ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              opacity: !isAdmin ? 0.4 : 1,
              cursor: !isAdmin ? 'not-allowed' : 'pointer',
              marginLeft: 'auto',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            + Add Person {!isAdmin && '🔒'}
          </button>
        </div>

        {/* ── Table ── */}
        <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={colStyle('rank')} onClick={() => toggleSort('rank')}>Rank (Connections) <SortIcon k="rank" /></th>
                  <th style={colStyle('name')} onClick={() => toggleSort('name')}>Public ID & Name <SortIcon k="name" /></th>
                  <th style={{ ...colStyle('rank'), cursor: 'default' }}>Type</th>
                  <th style={{ ...colStyle('rank'), cursor: 'default' }}>Company Footprint</th>
                  <th style={colStyle('connectionCount')} onClick={() => toggleSort('connectionCount')}>Connections <SortIcon k="connectionCount" /></th>
                  <th style={colStyle('realConnections')} onClick={() => toggleSort('realConnections')}>Real <SortIcon k="realConnections" /></th>
                  <th style={colStyle('influenceScore')} onClick={() => toggleSort('influenceScore')}>Influence <SortIcon k="influenceScore" /></th>
                  <th style={colStyle('avgPathDistance')} onClick={() => toggleSort('avgPathDistance')}>Avg Hop <SortIcon k="avgPathDistance" /></th>
                  <th style={{ ...colStyle('rank'), cursor: 'default', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading || !isMounted ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', height: '56px' }}>
                      <td style={{ padding: '12px 14px' }}><div className="animate-pulse" style={{ width: 30, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} /></td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="animate-pulse" style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div className="animate-pulse" style={{ width: 120, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
                            <div className="animate-pulse" style={{ width: 60, height: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 2 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}><div className="animate-pulse" style={{ width: 45, height: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} /></td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="animate-pulse" style={{ width: 80, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
                        <div className="animate-pulse" style={{ width: 40, height: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 2, marginTop: 4 }} />
                      </td>
                      <td style={{ padding: '12px 14px' }}><div className="animate-pulse" style={{ width: 30, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} /></td>
                      <td style={{ padding: '12px 14px' }}><div className="animate-pulse" style={{ width: 20, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} /></td>
                      <td style={{ padding: '12px 14px' }}><div className="animate-pulse" style={{ width: 100, height: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 2 }} /></td>
                      <td style={{ padding: '12px 14px' }}><div className="animate-pulse" style={{ width: 20, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--silver-500)', fontSize: '13px' }}>
                      🚫 No matching professional intelligence footprints found in the directory.
                    </td>
                  </tr>
                ) : (
                  paginated.map((node) => {
                    const globalRank = ranked.findIndex(n => n.id === node.id) + 1;
                    const isReal = node.nodeType === 'REAL';
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <React.Fragment key={node.id}>
                        <tr
                          onClick={() => setSelectedNode(isSelected ? null : node)}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-glass)'; }}
                          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          {/* Rank */}
                          <td style={{ padding: '12px 14px', minWidth: 60 }}>
                            <span className="text-mono" style={{
                              fontSize: '13px', fontWeight: 700,
                              color: globalRank <= 3 ? '#ffffff' : 'var(--silver-600)',
                            }}>
                              {globalRank === 1 ? '🏆 #1' : globalRank <= 3 ? ['🥈 #2','🥉 #3'][globalRank - 2] : `#${globalRank}`}
                            </span>
                          </td>

                          {/* Public ID & Name */}
                          <td style={{ padding: '12px 14px', minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                background: isReal ? 'rgba(255,255,255,0.06)' : 'rgba(100,116,139,0.15)',
                                border: `1px solid ${isReal ? 'rgba(255,255,255,0.25)' : 'rgba(100,116,139,0.3)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 700,
                                color: isReal ? '#ffffff' : 'var(--silver-500)',
                              }}>
                                {node.fullName.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--silver-100)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {node.fullName}
                                  {(primaryNodeId === node.id || primaryNodeId === node.publicId) && (
                                    <span style={{
                                      padding: '1px 6px', borderRadius: '100px', fontSize: '9.5px', fontWeight: 700,
                                      background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)',
                                    }}>
                                      ⭐ Primary
                                    </span>
                                  )}
                                </div>
                                <div className="text-mono" style={{ fontSize: '10px', color: 'var(--silver-500)' }}>
                                  {node.publicId}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Type */}
                          <td style={{ padding: '12px 14px' }}>
                            <span className={`badge ${isReal ? 'badge-real' : 'badge-demo'}`}>
                              {isReal ? '● REAL' : '○ DEMO'}
                            </span>
                          </td>

                          {/* Company & Cluster */}
                          <td style={{ padding: '12px 14px', minWidth: 160 }}>
                            <div style={{ fontSize: '12px', color: 'var(--silver-200)', fontWeight: 500 }}>{node.company || '—'}</div>
                            <div style={{ fontSize: '10px', color: 'var(--silver-400)', fontWeight: 600 }}>{node.cluster || '—'}</div>
                          </td>

                          {/* Connections */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span className="text-mono" style={{ color: 'var(--silver-200)', fontWeight: 700 }}>{node.connectionCount}</span>
                          </td>

                          {/* Real */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span className="text-mono" style={{ color: '#ffffff', fontWeight: 700 }}>{node.realConnections}</span>
                          </td>

                          {/* Influence */}
                          <td style={{ padding: '12px 14px', minWidth: 120 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="text-mono" style={{ color: '#ffffff', minWidth: 28, fontSize: '12px' }}>
                                {node.influenceScore}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div className="progress-bar">
                                  <div className="progress-fill" style={{ width: `${node.influenceScore}%`, background: 'linear-gradient(90deg, #cbd5e1, #475569)' }} />
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Avg Hop */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span className="text-mono" style={{ color: 'var(--silver-400)', fontSize: '12px' }}>
                              {node.avgPathDistance?.toFixed(1) || '—'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                className="glass-button"
                                style={{ padding: '4px 8px', fontSize: '11px', color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.25)' }}
                                title="Focus & Center Graph on this Person"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrimaryNode(node.id);
                                  router.push('/');
                                }}
                              >
                                Focus Graph
                              </button>
                              {(primaryNodeId !== node.id && primaryNodeId !== node.publicId) && (
                                <button
                                  className="glass-button"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  title="Set as Global Primary Node"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrimaryNode(node.id);
                                  }}
                                >
                                  Set Primary
                                </button>
                              )}
                              <button
                                className="glass-button"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                title="View Node Profile"
                                onClick={(e) => { e.stopPropagation(); setSelectedNode(isSelected ? null : node); }}
                              >
                                {isSelected ? 'Hide' : 'View'}
                              </button>
                              <button
                                className="glass-button"
                                disabled={!isAdmin}
                                title={!isAdmin ? 'SUDO Mode Required' : 'Edit Person Details'}
                                style={{
                                  padding: '4px 8px', fontSize: '11px', color: '#ffffff',
                                  opacity: !isAdmin ? 0.4 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer'
                                }}
                                onClick={(e) => { e.stopPropagation(); setEditingNode(node); }}
                              >
                                Edit {!isAdmin && '🔒'}
                              </button>
                              <button
                                className="glass-button"
                                disabled={!isAdmin}
                                title={!isAdmin ? 'SUDO Mode Required' : 'Delete Person'}
                                style={{
                                  padding: '4px 8px', fontSize: '11px', color: 'rgba(244,63,94,0.9)', borderColor: 'rgba(244,63,94,0.3)',
                                  opacity: !isAdmin ? 0.4 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer'
                                }}
                                onClick={(e) => { e.stopPropagation(); setDeletingNode(node); }}
                              >
                                Delete {!isAdmin && '🔒'}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline Expandable Details Panel directly under clicked row */}
                        {isSelected && (
                          <tr style={{ background: 'rgba(15, 23, 42, 0.85)', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                            <td colSpan={9} style={{ padding: '20px 24px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                                  <div style={{ flex: 1, minWidth: 280 }}>
                                    <div className="text-label" style={{ marginBottom: '4px' }}>Professional Footprint Tags</div>
                                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                      {node.tags && node.tags.length > 0 ? (
                                        node.tags.map(t => (
                                          <span key={t} style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '10px', background: 'var(--bg-glass)', border: '1px solid var(--glass-border)', color: 'var(--silver-300)' }}>{t}</span>
                                        ))
                                      ) : (
                                        <span style={{ fontSize: '11px', color: 'var(--silver-500)' }}>No tags registered</span>
                                      )}
                                    </div>
                                    <div className="text-mono" style={{ fontSize: '11px', color: 'var(--silver-500)' }}>
                                      Footprint Sources: <span style={{ color: '#ffffff' }}>{node.sourceConnectors?.join(', ') || 'Manual Workspace'}</span>
                                    </div>
                                  </div>
                                  
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      className="glass-button"
                                      disabled={!isAdmin}
                                      title={!isAdmin ? 'SUDO Mode Required' : ''}
                                      style={{ color: '#ffffff', opacity: !isAdmin ? 0.4 : 1, cursor: !isAdmin ? 'not-allowed' : 'pointer' }}
                                      onClick={() => setEditingNode(node)}
                                    >
                                      ✏️ Edit Person {!isAdmin && '🔒'}
                                    </button>
                                    <Link href={`/profile/${node.publicId}`} style={{ textDecoration: 'none' }}>
                                      <button className="glass-button">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
                                        </svg>
                                        Full Profile
                                      </button>
                                    </Link>
                                    <button className="glass-button" onClick={() => { setRootNode(node.id); setPrimaryNode(node.id); router.push('/'); }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                                      </svg>
                                      Focus Graph
                                    </button>
                                  </div>
                                </div>

                                {/* Direct Relationships Manager */}
                                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div className="text-label" style={{ color: '#ffffff', fontWeight: 700 }}>Direct Graph Relationships ({visibleLinks.filter(e => {
                                      const src = typeof e.source === 'string' ? e.source : (e.source as any).id;
                                      const tgt = typeof e.target === 'string' ? e.target : (e.target as any).id;
                                      return src === node.id || tgt === node.id;
                                    }).length})</div>
                                    <button
                                      className="glass-button font-semibold"
                                      disabled={!isAdmin}
                                      title={!isAdmin ? 'SUDO Mode Required' : ''}
                                      onClick={() => setCreatingEdgeSourceId(node.id)}
