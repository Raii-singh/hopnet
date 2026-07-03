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
      if (useV2) {
        const res = await searchPersonsV2(q, 8);
        setResults(res.data.map(toGraphNode));
      } else {
        // dummy / v1: filter allNodes client-side
        const lower = q.toLowerCase();
        setResults(
          allNodes
            .filter(n =>
              n.fullName.toLowerCase().includes(lower) ||
              n.email?.toLowerCase().includes(lower) ||
              n.username?.toLowerCase().includes(lower)
            )
            .slice(0, 8)
        );
      }
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [useV2, allNodes]);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(id);
  }, [query, doSearch]);

  function handleSelect(node: GraphNode) {
    setSelected(node);
    setQuery(node.fullName);
    setResults([]);
    setOpen(false);
    onSelect(node);
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <label className="text-label" style={{ marginBottom: '6px', display: 'block', fontSize: '10px' }}>
        {label}
      </label>

      {selected && !open ? (
        // Resolved node pill
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${selected.nodeType === 'DEMO' ? 'rgba(245,158,11,0.3)' : 'var(--glass-border)'}`,
            borderRadius: '8px',
            padding: '8px 10px',
            cursor: disabled ? 'default' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
          onClick={() => { if (!disabled) { setOpen(true); setQuery(''); setResults([]); } }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--silver-100)' }}>
            {selected.fullName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <NodeBadge nodeType={selected.nodeType} />
            {selected.publicId && (
              <span style={{ fontSize: '9px', color: 'var(--silver-600)', fontFamily: 'monospace' }}>
                {selected.publicId}
              </span>
            )}
          </div>
        </div>
      ) : (
        // Search input
        <div style={{ position: 'relative' }}>
          <input
            autoFocus={open}
            className="glass-input"
            placeholder={`Search ${label.toLowerCase()}…`}
            value={query}
            disabled={disabled}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 160)}
            style={{ width: '100%' }}
          />
          {searching && (
            <span style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: '10px', color: 'var(--silver-600)',
            }}>
              searching…
            </span>
          )}

          {open && results.length > 0 && (
            <div style={{
              position: 'absolute', zIndex: 200, top: '100%', left: 0, right: 0,
              background: 'rgba(10,10,10,0.97)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              marginTop: '4px',
              maxHeight: 220,
              overflowY: 'auto',
            }}>
              {results.map(n => (
                <div
                  key={n.id}
                  onMouseDown={() => handleSelect(n)}
                  style={{
                    padding: '9px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--silver-100)' }}>
                      {n.fullName}
                    </div>
                    {n.company && (
                      <div style={{ fontSize: '10px', color: 'var(--silver-500)', marginTop: '2px' }}>
                        {n.company}
                      </div>
                    )}
                  </div>
                  <NodeBadge nodeType={n.nodeType} />
                </div>
              ))}
            </div>
          )}

          {open && !searching && query.trim() && results.length === 0 && (
            <div style={{
              position: 'absolute', zIndex: 200, top: '100%', left: 0, right: 0,
              background: 'rgba(10,10,10,0.97)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              marginTop: '4px',
              padding: '12px',
              fontSize: '11px',
              color: 'var(--silver-600)',
              textAlign: 'center',
            }}>
              No matches for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main EdgeEditorModal ────────────────────────────────────────────────────

export default function EdgeEditorModal({ edge, createData, onClose }: EdgeEditorModalProps) {
  const { allNodes, visibleNodes, dataSource, createNewEdge, modifyEdge, removeEdge } = useGraphStore();
  const { isAdmin } = useAuthStore();

  // In v2 mode, allNodes is empty; visibleNodes has the current subgraph.
  // The EndpointPicker uses server-side search so neither matters for resolution.
  const useV2 = dataSource === 'api-v2';
  const localNodes = allNodes.length > 0 ? allNodes : visibleNodes;

  const [sourceNode, setSourceNode] = useState<GraphNode | null>(null);
  const [targetNode, setTargetNode] = useState<GraphNode | null>(null);

  const [relationshipType, setRelationshipType] = useState('acquaintance');
  const [trustScore, setTrustScore] = useState(0.5);
  const [interactionFrequency, setInteractionFrequency] = useState(0.5);
