'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { useAuthStore } from '@/store/authStore';
import { GraphEdge, GraphNode } from '@/types/graph';
import { searchPersonsV2, ApiNodeV2 } from '@/services/api';

interface EdgeEditorModalProps {
  edge?: GraphEdge | null;       // If editing existing edge
  createData?: { sourceId: string; targetId: string } | null; // If creating new
  onClose: () => void;
}

// ── Node type badge helper ──────────────────────────────────────────────────

function NodeBadge({ nodeType }: { nodeType: 'REAL' | 'DEMO' }) {
  return (
    <span
      className={`badge ${nodeType === 'REAL' ? 'badge-real' : 'badge-demo'}`}
      style={{
        fontSize: '9px',
        padding: '1px 5px',
        marginTop: '4px',
        ...(nodeType === 'DEMO' ? {
          background: 'rgba(245, 158, 11, 0.12)',
          borderColor: 'rgba(245, 158, 11, 0.35)',
          color: 'rgba(245, 158, 11, 0.9)',
        } : {}),
      }}
    >
      {nodeType}
    </span>
  );
}

// ── Endpoint search component (Decision 2 / Option A) ─────────────────────
// Searches for a node by name/email/username anywhere in Neo4j.
// Does NOT require the node to be in the current visible subgraph.

interface EndpointPickerProps {
  label: string;
  initialNode: GraphNode | null;
  onSelect: (node: GraphNode) => void;
  disabled?: boolean;
  useV2: boolean;
  allNodes: GraphNode[];  // fallback for dummy/api mode
}

function toGraphNode(n: ApiNodeV2): GraphNode {
  return {
    id: n.id,
    publicId: n.publicId,
    fullName: n.fullName,
    username: n.username ?? undefined,
    email: n.email ?? undefined,
    nodeType: n.nodeType,
    connectionCount: n.connectionCount ?? 0,
    realConnections: n.realConnections ?? 0,
    demoConnections: n.demoConnections ?? 0,
    influenceScore: n.influenceScore ?? 0,
    tags: n.tags ?? [],
    sourceConnectors: n.sourceConnectors ?? [],
    metadata: n.metadata ?? {},
    centrality: 0,
  };
}

function EndpointPicker({ label, initialNode, onSelect, disabled, useV2, allNodes }: EndpointPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GraphNode[]>([]);
  const [selected, setSelected] = useState<GraphNode | null>(initialNode);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  // Sync if initialNode changes (e.g. edit mode resolves the node)
  useEffect(() => {
    setSelected(initialNode);
    setQuery(initialNode?.fullName ?? '');
  }, [initialNode?.id]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
