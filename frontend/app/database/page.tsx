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
