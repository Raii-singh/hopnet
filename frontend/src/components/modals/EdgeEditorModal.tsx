'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
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
  const { appMode } = useAppStore();

  // In v2 mode, allNodes is empty; visibleNodes has the current subgraph.
  const useV2 = dataSource === 'api-v2';
  const localNodes = allNodes.length > 0 ? allNodes : visibleNodes;

  // All useState hooks declared unconditionally before any conditional return
  const [sourceNode, setSourceNode] = useState<GraphNode | null>(null);
  const [targetNode, setTargetNode] = useState<GraphNode | null>(null);
  const [relationshipType, setRelationshipType] = useState('acquaintance');
  const [trustScore, setTrustScore] = useState(0.5);
  const [interactionFrequency, setInteractionFrequency] = useState(0.5);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCreating = !!createData;
  const isDemoToReal = sourceNode?.nodeType === 'DEMO' && targetNode?.nodeType === 'REAL';

  // Resolve initial nodes
  useEffect(() => {
    const srcId = edge
      ? (typeof edge.source === 'string' ? edge.source : edge.source.id)
      : createData?.sourceId;
    const tgtId = edge
      ? (typeof edge.target === 'string' ? edge.target : edge.target.id)
      : createData?.targetId;

    // Try visibleNodes first (most likely to be there), then localNodes
    if (srcId) {
      const src = [...visibleNodes, ...localNodes].find(n => n.id === srcId) ?? null;
      setSourceNode(src);
    }
    if (tgtId) {
      const tgt = [...visibleNodes, ...localNodes].find(n => n.id === tgtId) ?? null;
      setTargetNode(tgt);
    }

    if (edge) {
      setRelationshipType(edge.relationshipType);
      setTrustScore(edge.trustScore);
      setInteractionFrequency(edge.interactionFrequency);
    }
  }, [edge, createData]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // In demo mode, non-admin visitors cannot open edge mutation modals.
  // All hooks have been called above — safe to return null here.
  if (appMode === 'demo' && !isAdmin) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceNode || !targetNode) {
      setErrorMsg('Both source and target nodes must be selected.');
      return;
    }

    // Traversal constraint: DEMO→REAL is always blocked
    if (isDemoToReal) {
      setErrorMsg('Traversal Constraint Violation: DEMO → REAL connections are prohibited.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (isCreating) {
        await createNewEdge({
          sourceId: sourceNode.id,
          targetId: targetNode.id,
          relationshipType,
          trustScore,
          interactionFrequency,
          connectorSource: 'Manual Editor',
        });
      } else if (edge) {
        await modifyEdge(edge.id, {
          relationshipType,
          trustScore,
          interactionFrequency,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply relationship configuration.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!edge || isCreating) return;
    if (!confirm('Are you sure you want to permanently sever this relationship edge?')) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await removeEdge(edge.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove relationship edge.');
      setIsSubmitting(false);
    }
  }

  // Edge kind for accent line
  const edgeAccent = sourceNode && targetNode
    ? (sourceNode.nodeType === 'DEMO' || targetNode.nodeType === 'DEMO')
      ? 'linear-gradient(90deg, #f59e0b, #d97706)'
      : 'linear-gradient(90deg, #ffffff, var(--silver-500))'
    : 'linear-gradient(90deg, #ffffff, var(--silver-500))';

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-panel-strong animate-fade-in-scale"
        style={{
          width: 480,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          padding: 0,
        }}
      >
        {/* Top accent — amber if either endpoint is DEMO */}
        <div style={{ height: 3, background: edgeAccent, borderRadius: '12px 12px 0 0', transition: 'background 0.3s' }} />

        <div style={{ padding: '20px 24px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>
                {isCreating ? 'Configure Secure Link' : 'Edit Relationship Edge'}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: '1px solid var(--glass-border)',
                borderRadius: '8px', color: 'var(--silver-500)', cursor: 'pointer',
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
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

          {/* Error message */}
          {errorMsg && (
            <div className="glass-panel" style={{
              background: errorMsg.includes('Violation') ? 'rgba(244,63,94,0.08)' : 'rgba(244,63,94,0.05)',
              borderColor: errorMsg.includes('Violation') ? 'rgba(244,63,94,0.4)' : 'rgba(244,63,94,0.3)',
              color: 'rgba(244,63,94,0.9)',
              padding: '10px 14px', fontSize: '11.5px', lineHeight: 1.4,
              marginBottom: '16px', borderRadius: '8px',
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* DEMO→REAL constraint warning */}
          {isDemoToReal && (
            <div style={{
              background: 'rgba(244,63,94,0.06)',
              border: '1px solid rgba(244,63,94,0.35)',
              borderRadius: '8px', padding: '9px 14px', marginBottom: '14px',
              fontSize: '11.5px', color: 'rgba(244,63,94,0.9)', fontWeight: 600,
            }}>
              🚫 Traversal Constraint: DEMO → REAL connections are prohibited. Change source or target.
            </div>
          )}

          {/* ── Endpoint pickers (Decision 2 / Option A: server-side search) ── */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-start' }}>
            <EndpointPicker
              label="Source Node"
              initialNode={sourceNode}
              onSelect={setSourceNode}
              disabled={!isCreating}
              useV2={useV2}
              allNodes={localNodes}
            />

            {/* Arrow */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingTop: '28px', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDemoToReal ? 'rgba(244,63,94,0.7)' : 'var(--silver-500)'} strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>

            <EndpointPicker
              label="Target Node"
              initialNode={targetNode}
              onSelect={setTargetNode}
              disabled={!isCreating}
              useV2={useV2}
              allNodes={localNodes}
            />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Relationship Type */}
            <div>
              <label className="text-label" style={{ marginBottom: '6px', display: 'block' }}>Relationship Classification</label>
              <select
                className="glass-input"
                value={relationshipType}
                onChange={e => setRelationshipType(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="partner" style={{ background: '#020202' }}>Partner</option>
                <option value="advisor" style={{ background: '#020202' }}>Advisor</option>
                <option value="co-founder" style={{ background: '#020202' }}>Co-Founder</option>
                <option value="investor" style={{ background: '#020202' }}>Investor</option>
                <option value="colleague" style={{ background: '#020202' }}>Colleague / Peer</option>
                <option value="acquaintance" style={{ background: '#020202' }}>Acquaintance</option>
                <option value="friend" style={{ background: '#020202' }}>Friend</option>
              </select>
            </div>

            {/* Trust Score Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="text-label">Relationship Trust Score</label>
                <span className="text-mono" style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                  {Math.round(trustScore * 100)}%
                </span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05}
                value={trustScore}
                onChange={e => setTrustScore(Number(e.target.value))}
                className="hop-slider"
                style={{ background: `linear-gradient(to right, #ffffff 0%, #ffffff ${trustScore * 100}%, rgba(255,255,255,0.1) ${trustScore * 100}%, rgba(255,255,255,0.1) 100%)` }}
              />
              <div style={{ fontSize: '9.5px', color: 'var(--silver-500)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Unverified / Soft</span>
                <span>Verified / Cryptographic</span>
              </div>
            </div>

            {/* Interaction Frequency Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="text-label">Interaction Frequency</label>
                <span className="text-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--silver-400)' }}>
                  {Math.round(interactionFrequency * 100)}%
                </span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05}
                value={interactionFrequency}
                onChange={e => setInteractionFrequency(Number(e.target.value))}
                className="hop-slider"
                style={{ background: `linear-gradient(to right, #ffffff 0%, #ffffff ${interactionFrequency * 100}%, rgba(255,255,255,0.1) ${interactionFrequency * 100}%, rgba(255,255,255,0.1) 100%)` }}
              />
              <div style={{ fontSize: '9.5px', color: 'var(--silver-500)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Sporadic / Dormant</span>
                <span>Constant / High frequency</span>
              </div>
            </div>

            {/* Weight preview */}
            <div className="glass-panel" style={{
              padding: '10px 14px', background: 'rgba(0,0,0,0.15)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span className="text-label">Resulting Edge Weight</span>
              <span className="text-mono" style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                {Math.round((trustScore * 0.6 + interactionFrequency * 0.4) * 100) / 100}
              </span>
            </div>

            <div className="divider" style={{ margin: '8px 0 0' }} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
              {!isCreating && edge ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="glass-button"
                  style={{ borderColor: 'rgba(244,63,94,0.3)', color: 'rgba(244,63,94,0.8)', opacity: isSubmitting ? 0.5 : 1, cursor: 'pointer' }}
                >
                  Sever Connection
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="glass-button" onClick={onClose} disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.5 : 1 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button font-semibold"
                  disabled={isSubmitting || isDemoToReal || !sourceNode || !targetNode}
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    background: 'rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 0 15px rgba(255, 255, 255, 0.08)',
                    opacity: (isSubmitting || isDemoToReal || !sourceNode || !targetNode) ? 0.5 : 1,
                    cursor: (isDemoToReal || !sourceNode || !targetNode) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmitting ? 'Syncing Ledger…' : isCreating ? 'Establish Link' : 'Apply Settings'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
