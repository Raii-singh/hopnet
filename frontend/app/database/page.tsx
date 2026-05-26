'use client';

import { useState, useMemo } from 'react';
import { GraphNode } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';

type SortKey = 'rank' | 'name' | 'connectionCount' | 'influenceScore' | 'realConnections' | 'avgPathDistance';
type SortDir = 'asc' | 'desc';
type ClusterFilter = 'All' | string;
type TypeFilter = 'All' | 'REAL' | 'DEMO';

function computeRank(node: GraphNode): number {
  return Math.round(
    node.realConnections * 4 +
    node.influenceScore * 0.35 +
    (node.centrality || 0) * 25
  );
}

export default function DatabasePage() {
  const { allNodes, allEdges, setRootNode } = useGraphStore();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [clusterFilter, setClusterFilter] = useState<ClusterFilter>('All');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [page, setPage] = useState(0);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const PER_PAGE = 12;

  const clusters = useMemo(() => {
    const s = new Set(allNodes.map(n => n.cluster).filter(Boolean) as string[]);
    return ['All', ...Array.from(s).sort()];
  }, [allNodes]);

  const ranked = useMemo(() => {
    return allNodes.map(n => ({ ...n, rankScore: computeRank(n) }));
  }, [allNodes]);

  const filtered = useMemo(() => {
    let r = ranked.filter(n => {
      const matchSearch = !search || n.name.toLowerCase().includes(search.toLowerCase()) || n.cluster?.toLowerCase().includes(search.toLowerCase());
      const matchCluster = clusterFilter === 'All' || n.cluster === clusterFilter;
      const matchType = typeFilter === 'All' || n.type === typeFilter;
      return matchSearch && matchCluster && matchType;
    });

    r.sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortKey === 'rank') { va = a.rankScore; vb = b.rankScore; }
      else if (sortKey === 'name') { va = a.name; vb = b.name; }
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
    return <span style={{ color: 'var(--neon-cyan)', marginLeft: 4 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>;
  }

  const colStyle = (k: SortKey): React.CSSProperties => ({
    padding: '10px 14px',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    color: sortKey === k ? 'var(--neon-cyan)' : 'var(--silver-500)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  });

  return (
    <div className="page-layout">
      <div className="page-content">

        {/* ── Header ── */}
        <div style={{ marginBottom: '28px' }}>
          <div className="text-label" style={{ color: 'var(--neon-blue)', marginBottom: '6px' }}>Universal Database</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.02em', margin: 0 }}>
            Network Intelligence Index
          </h1>
          <p style={{ color: 'var(--silver-500)', fontSize: '13px', marginTop: '6px' }}>
            {allNodes.length} nodes · {allEdges.length} edges · ranked by weighted connection score
          </p>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Nodes', value: allNodes.length, color: 'var(--silver-100)' },
            { label: 'Real Nodes', value: allNodes.filter(n => n.type === 'REAL').length, color: 'var(--neon-cyan)' },
            { label: 'Demo Nodes', value: allNodes.filter(n => n.type === 'DEMO').length, color: 'var(--silver-500)' },
            { label: 'Total Edges', value: allEdges.length, color: 'var(--neon-blue)' },
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
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--silver-600)' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="glass-input"
              placeholder="Search name or cluster…"
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
                {t === 'REAL' && <span style={{ color: 'var(--neon-cyan)' }}>●</span>}
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
            {clusters.map(c => <option key={c} value={c} style={{ background: '#0d0d24' }}>{c}</option>)}
          </select>

          <span className="text-label" style={{ whiteSpace: 'nowrap' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Table ── */}
        <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={colStyle('rank')} onClick={() => toggleSort('rank')}>Rank <SortIcon k="rank" /></th>
                  <th style={colStyle('name')} onClick={() => toggleSort('name')}>Name <SortIcon k="name" /></th>
                  <th style={{ ...colStyle('rank'), cursor: 'default' }}>Type</th>
                  <th style={{ ...colStyle('rank'), cursor: 'default' }}>Cluster</th>
                  <th style={colStyle('connectionCount')} onClick={() => toggleSort('connectionCount')}>Connections <SortIcon k="connectionCount" /></th>
                  <th style={colStyle('realConnections')} onClick={() => toggleSort('realConnections')}>Real <SortIcon k="realConnections" /></th>
                  <th style={colStyle('influenceScore')} onClick={() => toggleSort('influenceScore')}>Influence <SortIcon k="influenceScore" /></th>
                  <th style={colStyle('avgPathDistance')} onClick={() => toggleSort('avgPathDistance')}>Avg Path <SortIcon k="avgPathDistance" /></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((node, i) => {
                  const globalRank = filtered.findIndex(n => n.id === node.id) + 1;
                  const isReal = node.type === 'REAL';
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <tr
                      key={node.id}
                      onClick={() => setSelectedNode(isSelected ? null : node)}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(59,130,246,0.07)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-glass)'; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {/* Rank */}
                      <td style={{ padding: '12px 14px', minWidth: 60 }}>
                        <span className="text-mono" style={{
                          fontSize: '13px', fontWeight: 700,
                          color: globalRank <= 3 ? 'var(--neon-cyan)' : 'var(--silver-600)',
                        }}>
                          {globalRank <= 3 ? ['🥇','🥈','🥉'][globalRank - 1] : `#${globalRank}`}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '12px 14px', minWidth: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            background: isReal ? 'rgba(6,182,212,0.15)' : 'rgba(100,116,139,0.15)',
                            border: `1px solid ${isReal ? 'rgba(6,182,212,0.4)' : 'rgba(100,116,139,0.3)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 700,
                            color: isReal ? 'var(--neon-cyan)' : 'var(--silver-500)',
                          }}>
                            {node.name.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 500, color: 'var(--silver-100)', fontSize: '13px' }}>
                            {node.name}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${isReal ? 'badge-real' : 'badge-demo'}`}>
                          {isReal ? '● REAL' : '○ DEMO'}
                        </span>
                      </td>

                      {/* Cluster */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--neon-violet)' }}>{node.cluster || '—'}</span>
                      </td>

                      {/* Connections */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span className="text-mono" style={{ color: 'var(--silver-200)' }}>{node.connectionCount}</span>
                      </td>

                      {/* Real */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span className="text-mono" style={{ color: 'var(--neon-cyan)' }}>{node.realConnections}</span>
                      </td>

                      {/* Influence */}
                      <td style={{ padding: '12px 14px', minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="text-mono" style={{ color: 'var(--neon-blue)', minWidth: 28, fontSize: '12px' }}>
                            {node.influenceScore}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div className="progress-bar">
                              <div className="progress-fill progress-fill-blue" style={{ width: `${node.influenceScore}%` }} />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Avg Path */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span className="text-mono" style={{ color: 'var(--silver-400)', fontSize: '12px' }}>
                          {node.avgPathDistance?.toFixed(1) || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded row panel */}
          {selectedNode && (
            <div style={{
              borderTop: '1px solid rgba(59,130,246,0.2)',
              background: 'rgba(59,130,246,0.04)',
              padding: '16px 24px',
              display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap',
            }}>
              <div>
                <div className="text-label" style={{ marginBottom: '2px' }}>Details</div>
                <p style={{ fontSize: '12px', color: 'var(--silver-400)', margin: 0 }}>
                  {selectedNode.bio || `${selectedNode.type} node · ${selectedNode.cluster ?? 'No cluster'} · Score ${selectedNode.influenceScore}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedNode.tags && selectedNode.tags.length > 0
                  ? selectedNode.tags.map(t => (
                    <span key={t} style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '10px', background: 'var(--bg-glass)', border: '1px solid var(--glass-border)', color: 'var(--silver-400)' }}>{t}</span>
                  ))
                  : selectedNode.cluster && (
                    <span style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '10px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--neon-violet)' }}>
                      {selectedNode.cluster}
                    </span>
                  )
                }
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button className="glass-button" onClick={() => { setRootNode(selectedNode.id); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  Focus Graph
                </button>
                <button className="glass-button" style={{ opacity: 0.5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Shortest Path
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <button className="glass-button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ opacity: page === 0 ? 0.3 : 1 }}>
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`glass-button ${page === i ? 'active' : ''}`}
                onClick={() => setPage(i)}
                style={{ minWidth: 36, justifyContent: 'center' }}
              >
                {i + 1}
              </button>
            ))}
            <button className="glass-button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ opacity: page === totalPages - 1 ? 0.3 : 1 }}>
              Next →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
