'use client';

import { useState, useEffect } from 'react';
import { finalizeConnectorIngest } from '@/services/api';
import { useGraphStore } from '@/store/graphStore';

interface ImportPreviewModalProps {
  connectorType: string;
  filename: string;
  previewData: any;
  onClose: () => void;
  onSuccess: (logs: string[]) => void;
}

export default function ImportPreviewModal({
  connectorType,
  filename,
  previewData: initialPreviewData,
  onClose,
  onSuccess,
}: ImportPreviewModalProps) {
  const { initGraph } = useGraphStore();

  const [previewData, setPreviewData] = useState(initialPreviewData);
  const [activeTab, setActiveTab] = useState<'nodes' | 'duplicates' | 'edges'>('nodes');
  const [isIngesting, setIsIngesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleSurvivingOptionChange(index: number, option: 'KEEP_EXISTING' | 'OVERWRITE_WITH_IMPORTED') {
    const updatedMatches = [...previewData.duplicateMatches];
    updatedMatches[index].survivingOption = option;
    setPreviewData({
      ...previewData,
      duplicateMatches: updatedMatches,
    });
  }

  async function handleIngest() {
    setIsIngesting(true);
    setErrorMsg('');
    try {
      const outcome = await finalizeConnectorIngest(connectorType, filename, previewData);
      // Refresh the main graph store
      await initGraph();
      onSuccess(outcome.logs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ingestion failed to complete.');
      setIsIngesting(false);
    }
  }

  const { detectedNodes, duplicateMatches, inferredEdges, summary } = previewData;

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget && !isIngesting) onClose(); }}
      style={{ zIndex: 1000 }}
    >
      <div
        className="glass-panel-strong animate-fade-in-scale"
        style={{
          width: 580,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          padding: 0,
        }}
      >
        {/* Top Accent line */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-blue), var(--neon-violet))',
          borderRadius: '12px 12px 0 0',
        }} />

        <div style={{ padding: '20px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan)" strokeWidth="2.5">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 17 22 12"/>
              </svg>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--silver-100)', margin: 0 }}>
                Import Preview: {connectorType} Ingestion
              </h2>
            </div>
            {!isIngesting && (
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
            )}
          </div>

          <div style={{ fontSize: '11px', color: 'var(--silver-500)', marginBottom: '16px' }}>
            Source Archive File: <span style={{ color: 'var(--silver-300)', fontWeight: 600 }}>{filename}</span>
          </div>

          {errorMsg && (
            <div className="glass-panel" style={{
              background: 'rgba(244,63,94,0.06)',
              borderColor: 'rgba(244,63,94,0.3)',
              color: 'rgba(244,63,94,0.9)',
              padding: '10px 14px',
              fontSize: '12px',
              marginBottom: '16px',
              borderRadius: '8px',
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Summaries strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '16px',
          }}>
            {[
              { label: 'Total Contacts', value: summary.totalContacts, color: 'var(--silver-300)' },
              { label: 'New Nodes', value: summary.newNodesCount, color: 'var(--neon-cyan)' },
              { label: 'Conflicts Found', value: summary.duplicateMatchesCount, color: 'var(--neon-violet)' },
              { label: 'Inferred Edges', value: summary.inferredEdgesCount, color: 'var(--neon-emerald)' },
            ].map(item => (
              <div key={item.label} className="glass-panel" style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.15)', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: 'var(--silver-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: item.color }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--glass-border)',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '6px 6px 0 0',
            overflow: 'hidden',
          }}>
            {[
              { id: 'nodes', label: `Detected Users (${detectedNodes.length})`, color: 'var(--neon-cyan)' },
              { id: 'duplicates', label: `Duplicate Conflicts (${duplicateMatches.length})`, color: 'var(--neon-violet)' },
              { id: 'edges', label: `Inferred Edges (${inferredEdges.length})`, color: 'var(--neon-emerald)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  border: 'none',
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderBottom: activeTab === tab.id ? `2.5px solid ${tab.color}` : '2.5px solid transparent',
                  color: activeTab === tab.id ? '#fff' : 'var(--silver-500)',
                  fontSize: '11px',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content area */}
          <div className="glass-panel" style={{
            padding: '14px',
            background: 'rgba(0,0,0,0.1)',
            borderRadius: '0 0 8px 8px',
            borderTop: 'none',
            minHeight: '200px',
            maxHeight: '260px',
            overflowY: 'auto',
            marginBottom: '20px',
          }}>
            {activeTab === 'nodes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detectedNodes.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--silver-600)', padding: '40px 0', fontSize: '12px' }}>
                    No new contacts detected. All entries match existing database records.
                  </div>
                ) : (
                  detectedNodes.map((node: any, idx: number) => (
                    <div key={idx} style={{
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.03)',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--silver-200)' }}>{node.fullName}</div>
                        {node.company && <div style={{ fontSize: '10px', color: 'var(--silver-500)', marginTop: '2px' }}>🏢 {node.company} · {node.position || 'Employee'}</div>}
                      </div>
                      <span className="badge badge-real" style={{ fontSize: '9px', padding: '1px 5px' }}>
                        REAL NODE
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'duplicates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {duplicateMatches.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--silver-600)', padding: '40px 0', fontSize: '12px' }}>
                    Zero duplication warnings flagged. No conflicts found.
                  </div>
                ) : (
                  duplicateMatches.map((dup: any, idx: number) => (
                    <div key={idx} className="glass-panel" style={{ padding: '10px 12px', background: 'rgba(139,92,246,0.01)', borderColor: 'rgba(139,92,246,0.15)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '10.5px' }}>
                        <span style={{ color: 'var(--neon-violet)', fontWeight: 600 }}>Conflict #{idx + 1}: {dup.reason}</span>
                        <span className="text-mono" style={{ color: 'var(--silver-500)' }}>{dup.existing.publicId}</span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        {/* Imported */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px', fontSize: '11px' }}>
                          <div style={{ color: 'var(--silver-500)', fontSize: '9px', textTransform: 'uppercase' }}>Imported File</div>
                          <div style={{ fontWeight: 600, color: 'var(--silver-200)' }}>{dup.imported.fullName}</div>
                          {dup.imported.company && <div style={{ color: 'var(--silver-400)', fontSize: '10px' }}>{dup.imported.company}</div>}
                        </div>
                        {/* Existing */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px', fontSize: '11px' }}>
                          <div style={{ color: 'var(--silver-500)', fontSize: '9px', textTransform: 'uppercase' }}>Database Ledger</div>
                          <div style={{ fontWeight: 600, color: 'var(--silver-200)' }}>{dup.existing.fullName}</div>
                          {dup.existing.company && <div style={{ color: 'var(--silver-400)', fontSize: '10px' }}>{dup.existing.company}</div>}
                        </div>
                      </div>

                      {/* Surviving Option Selector */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--silver-500)', marginRight: 'auto' }}>Surviving Strategy:</span>
                        <button
                          type="button"
                          className="glass-button"
                          onClick={() => handleSurvivingOptionChange(idx, 'KEEP_EXISTING')}
                          style={{
                            fontSize: '9.5px',
                            padding: '3px 8px',
                            borderColor: dup.survivingOption === 'KEEP_EXISTING' ? 'var(--neon-cyan)' : 'var(--glass-border)',
                            color: dup.survivingOption === 'KEEP_EXISTING' ? 'var(--neon-cyan)' : 'var(--silver-500)',
                            background: dup.survivingOption === 'KEEP_EXISTING' ? 'rgba(6,182,212,0.05)' : 'transparent',
                          }}
                        >
                          Keep Database
                        </button>
                        <button
                          type="button"
                          className="glass-button"
                          onClick={() => handleSurvivingOptionChange(idx, 'OVERWRITE_WITH_IMPORTED')}
                          style={{
                            fontSize: '9.5px',
                            padding: '3px 8px',
                            borderColor: dup.survivingOption === 'OVERWRITE_WITH_IMPORTED' ? 'var(--neon-violet)' : 'var(--glass-border)',
                            color: dup.survivingOption === 'OVERWRITE_WITH_IMPORTED' ? 'var(--neon-violet)' : 'var(--silver-500)',
                            background: dup.survivingOption === 'OVERWRITE_WITH_IMPORTED' ? 'rgba(139,92,246,0.05)' : 'transparent',
                          }}
                        >
                          Overwrite Info
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'edges' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {inferredEdges.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--silver-600)', padding: '40px 0', fontSize: '12px' }}>
                    No explicit communication edges inferred from this dataset. Edges will automatically map in a central star structure.
                  </div>
                ) : (
                  inferredEdges.map((edge: any, idx: number) => (
                    <div key={idx} style={{
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.03)',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                    }} division-idx={idx}>
                      <span style={{ color: 'var(--silver-300)', fontWeight: 600 }}>{edge.sourceName}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 8px', width: '30%' }}>
                        <span style={{ fontSize: '9px', color: 'var(--neon-emerald)' }}>{edge.relationshipType}</span>
                        <div style={{ width: '100%', height: 1, background: 'rgba(16,185,129,0.3)', margin: '3px 0' }} />
                      </div>
                      <span style={{ color: 'var(--silver-300)', fontWeight: 600 }}>{edge.targetName}</span>
                      <span className="text-mono" style={{ color: 'var(--neon-emerald)', fontSize: '10px', marginLeft: 'auto' }}>
                        W: {Math.round((edge.trustScore * 0.6 + edge.interactionFrequency * 0.4) * 100) / 100}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="divider" style={{ margin: '10px 0 14px' }} />

          {/* Controls */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {!isIngesting && (
              <button
                type="button"
                className="glass-button"
                onClick={onClose}
              >
                Abort
              </button>
            )}
            <button
              type="button"
              className="glass-button font-semibold"
              onClick={handleIngest}
              disabled={isIngesting}
              style={{
                borderColor: 'rgba(16,185,129,0.5)',
                color: 'var(--neon-emerald)',
                background: 'rgba(16,185,129,0.08)',
                boxShadow: '0 0 15px rgba(16,185,129,0.15)',
                opacity: isIngesting ? 0.6 : 1,
              }}
            >
              {isIngesting ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 12, height: 12, border: '1.5px solid var(--neon-emerald)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  Ingesting Data…
                </div>
              ) : 'Commit Ingestion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
