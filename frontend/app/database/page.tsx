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
