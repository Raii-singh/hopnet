'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { GraphEdge, GraphNode } from '@/types/graph';

interface EdgeEditorModalProps {
  edge?: GraphEdge | null; // If editing existing
  createData?: { sourceId: string; targetId: string } | null; // If creating new
  onClose: () => void;
}

export default function EdgeEditorModal({ edge, createData, onClose }: EdgeEditorModalProps) {
  const { allNodes, createNewEdge, modifyEdge, removeEdge } = useGraphStore();

  const [sourceNode, setSourceNode] = useState<GraphNode | null>(null);
  const [targetNode, setTargetNode] = useState<GraphNode | null>(null);

  const [relationshipType, setRelationshipType] = useState('acquaintance');
  const [trustScore, setTrustScore] = useState(0.5);
  const [interactionFrequency, setInteractionFrequency] = useState(0.5);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCreating = !!createData;

  // Resolve node profiles
  useEffect(() => {
    const srcId = edge ? (typeof edge.source === 'string' ? edge.source : edge.source.id) : createData?.sourceId;
    const tgtId = edge ? (typeof edge.target === 'string' ? edge.target : edge.target.id) : createData?.targetId;

    if (srcId && tgtId) {
      const src = allNodes.find(n => n.id === srcId) || null;
      const tgt = allNodes.find(n => n.id === tgtId) || null;
      setSourceNode(src);
      setTargetNode(tgt);

      // Verify traversal constraint beforehand
      if (src && tgt && src.nodeType === 'DEMO' && tgt.nodeType === 'REAL') {
        setErrorMsg('Traversal Constraint Violation: Spawn paths from DEMO expansion nodes into REAL database nodes are strictly prohibited.');
      }
    }

    if (edge) {
      setRelationshipType(edge.relationshipType);
      setTrustScore(edge.trustScore);
      setInteractionFrequency(edge.interactionFrequency);
    }
  }, [edge, createData, allNodes]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceNode || !targetNode) return;

    // Traversal validation: DEMO -> REAL blocked
    if (sourceNode.nodeType === 'DEMO' && targetNode.nodeType === 'REAL') {
      setErrorMsg('Self-Correction: DEMO -> REAL connections cannot be committed to the database ledger.');
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

  return (
    <div
      className="modal-overlay animate-fade-in"
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
        }}
      >
        {/* Top Accent line */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-violet))',
          borderRadius: '12px 12px 0 0',
        }} />

        <div style={{ padding: '20px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neon-violet)" strokeWidth="2.5">
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

          {errorMsg && (
            <div className="glass-panel" style={{
              background: errorMsg.includes('Violation') ? 'rgba(244,63,94,0.08)' : 'rgba(244,63,94,0.05)',
              borderColor: errorMsg.includes('Violation') ? 'rgba(244,63,94,0.4)' : 'rgba(244,63,94,0.3)',
              color: 'rgba(244,63,94,0.9)',
              padding: '10px 14px',
              fontSize: '11.5px',
              lineHeight: 1.4,
              marginBottom: '16px',
              borderRadius: '8px',
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Connection nodes visual bridge */}
          {sourceNode && targetNode && (
            <div className="glass-panel" style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.01)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              borderRadius: '8px',
            }}>
              {/* Source */}
              <div style={{ textAlign: 'left', width: '40%' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--silver-200)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sourceNode.fullName}
                </div>
                <span className={`badge ${sourceNode.nodeType === 'REAL' ? 'badge-real' : 'badge-demo'}`} style={{ fontSize: '9px', padding: '1px 5px', marginTop: '4px' }}>
                  {sourceNode.nodeType}
                </span>
              </div>

              {/* Link Visual */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 8px' }}>
                <span style={{ fontSize: '10px', color: 'var(--silver-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {relationshipType}
                </span>
                <div style={{
                  width: '100%', height: 2,
                  background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-violet))',
                  position: 'relative',
                  marginTop: '4px',
                }}>
                  <div style={{
                    position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)',
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--neon-violet)', boxShadow: '0 0 8px var(--neon-violet)',
                  }} />
                </div>
              </div>

              {/* Target */}
              <div style={{ textAlign: 'right', width: '40%' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--silver-200)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {targetNode.fullName}
                </div>
                <span className={`badge ${targetNode.nodeType === 'REAL' ? 'badge-real' : 'badge-demo'}`} style={{ fontSize: '9px', padding: '1px 5px', marginTop: '4px' }}>
                  {targetNode.nodeType}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Relationship Type Selection */}
            <div>
              <label className="text-label" style={{ marginBottom: '6px', display: 'block' }}>Relationship Classification</label>
              <select
                className="glass-input"
                value={relationshipType}
                onChange={e => setRelationshipType(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="partner" style={{ background: '#0a0a18' }}>Partner</option>
                <option value="advisor" style={{ background: '#0a0a18' }}>Advisor</option>
                <option value="co-founder" style={{ background: '#0a0a18' }}>Co-Founder</option>
                <option value="investor" style={{ background: '#0a0a18' }}>Investor</option>
                <option value="colleague" style={{ background: '#0a0a18' }}>Colleague / Peer</option>
                <option value="acquaintance" style={{ background: '#0a0a18' }}>Acquaintance</option>
                <option value="friend" style={{ background: '#0a0a18' }}>Friend</option>
              </select>
            </div>

            {/* Trust Score Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="text-label">Relationship Trust Score</label>
                <span className="text-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neon-cyan)' }}>
                  {Math.round(trustScore * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0} max={1} step={0.05}
                value={trustScore}
                onChange={e => setTrustScore(Number(e.target.value))}
                className="hop-slider"
                style={{
                  background: `linear-gradient(to right, var(--neon-cyan) 0%, var(--neon-cyan) ${trustScore * 100}%, rgba(255,255,255,0.1) ${trustScore * 100}%, rgba(255,255,255,0.1) 100%)`
                }}
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
                <span className="text-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neon-violet)' }}>
                  {Math.round(interactionFrequency * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0} max={1} step={0.05}
                value={interactionFrequency}
                onChange={e => setInteractionFrequency(Number(e.target.value))}
                className="hop-slider"
                style={{
                  background: `linear-gradient(to right, var(--neon-violet) 0%, var(--neon-violet) ${interactionFrequency * 100}%, rgba(255,255,255,0.1) ${interactionFrequency * 100}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
              <div style={{ fontSize: '9.5px', color: 'var(--silver-500)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Sporadic / Dormant</span>
                <span>Constant / High frequency</span>
              </div>
            </div>

            {/* Weight score calculation preview */}
            <div className="glass-panel" style={{
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span className="text-label">Resulting Edge weight</span>
              <span className="text-mono" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--neon-emerald)' }}>
                {Math.round((trustScore * 0.6 + interactionFrequency * 0.4) * 100) / 100}
              </span>
            </div>

            <div className="divider" style={{ margin: '8px 0 0' }} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Delete button (If editing) */}
              {!isCreating && edge ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="glass-button"
                  style={{
                    borderColor: 'rgba(244,63,94,0.3)',
                    color: 'rgba(244,63,94,0.8)',
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                >
                  Sever Connection
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="glass-button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{ opacity: isSubmitting ? 0.5 : 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button"
                  disabled={isSubmitting || (sourceNode?.nodeType === 'DEMO' && targetNode?.nodeType === 'REAL')}
                  style={{
                    borderColor: 'rgba(139,92,246,0.5)',
                    color: 'var(--neon-violet)',
                    background: 'rgba(139,92,246,0.08)',
                    boxShadow: '0 0 15px rgba(139,92,246,0.15)',
                    opacity: (isSubmitting || (sourceNode?.nodeType === 'DEMO' && targetNode?.nodeType === 'REAL')) ? 0.5 : 1,
                  }}
                >
                  {isSubmitting ? 'Syncing Ledger...' : isCreating ? 'Establish Link' : 'Apply Settings'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
