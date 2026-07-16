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
          background: 'linear-gradient(90deg, #ffffff, var(--silver-500))',
          borderRadius: '12px 12px 0 0',
        }} />

        <div style={{ padding: '20px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
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
              { label: 'New Nodes', value: summary.newNodesCount, color: '#ffffff' },
              { label: 'Conflicts Found', value: summary.duplicateMatchesCount, color: 'var(--silver-400)' },
              { label: 'Inferred Edges', value: summary.inferredEdgesCount, color: '#ffffff' },
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
              { id: 'nodes', label: `Detected Users (${detectedNodes.length})`, color: '#ffffff' },
              { id: 'duplicates', label: `Duplicate Conflicts (${duplicateMatches.length})`, color: 'var(--silver-400)' },
