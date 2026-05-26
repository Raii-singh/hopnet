'use client';

import { useGraphStore } from '@/store/graphStore';
import { useState, useEffect } from 'react';
import { fetchDuplicates } from '@/services/api';
import NodeCreateModal from '@/components/modals/NodeCreateModal';
import MergeEditorModal from '@/components/modals/MergeEditorModal';

export default function WorkspacePanel() {
  const {
    workspaceMode,
    visualConnectMode,
    connectorSourceNode,
    setVisualConnectMode,
    setConnectorSourceNode,
  } = useGraphStore();

  const [dupCount, setDupCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  useEffect(() => {
    if (!workspaceMode) return;
    let active = true;
    async function loadDuplicates() {
      try {
        const res = await fetchDuplicates();
        if (active && res && res.suggestions) {
          setDupCount(res.suggestions.length);
        }
      } catch (err) {
        console.warn('Failed to load duplicates:', err);
      }
    }
    loadDuplicates();
    // Poll every 10 seconds while workspace is open
    const timer = setInterval(loadDuplicates, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [workspaceMode]);

  if (!workspaceMode) return null;

  return (
    <>
      <div
        className="animate-slide-in-left"
        style={{
          position: 'fixed',
          top: '50%',
          left: 20,
          transform: 'translateY(-50%)',
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: 220,
        }}
      >
        <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(139,92,246,0.3)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-violet)" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="text-label" style={{ color: 'var(--neon-violet)', fontWeight: 700 }}>Relationship Workspace</span>
          </div>

          <p style={{ color: 'var(--silver-500)', fontSize: '10.5px', lineHeight: 1.4, margin: '0 0 14px' }}>
            Perform visual graph CRUD, merge identities, and establish secure edges locally.
          </p>

          {/* Action: Add User Node */}
          <button
            id="workspace-add-node-btn"
            className="glass-button"
            onClick={() => setShowCreateModal(true)}
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              marginBottom: '8px',
              borderColor: 'rgba(6,182,212,0.3)',
              color: 'var(--neon-cyan)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add User Node
          </button>

          {/* Action: Visual Connector */}
          <button
            id="workspace-connect-btn"
            className="glass-button"
            onClick={() => {
              const nextVal = !visualConnectMode;
              setVisualConnectMode(nextVal);
              if (!nextVal) setConnectorSourceNode(null);
            }}
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              marginBottom: '8px',
              borderColor: visualConnectMode ? 'rgba(167,139,250,0.6)' : 'var(--glass-border)',
              color: visualConnectMode ? 'var(--neon-violet)' : 'var(--silver-400)',
              background: visualConnectMode ? 'rgba(167,139,250,0.1)' : 'var(--bg-glass)',
              boxShadow: visualConnectMode ? '0 0 10px rgba(167,139,250,0.15)' : 'none',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Connect Nodes Visually
          </button>

          {/* Connect Mode Active Visual Help Box */}
          {visualConnectMode && (
            <div
              className="glass-panel"
              style={{
                padding: '10px 12px',
                background: 'rgba(139,92,246,0.05)',
                border: '1px dashed rgba(139,92,246,0.4)',
                marginBottom: '8px',
                animation: 'pulseGlow 2s ease-in-out infinite',
              }}
            >
              <div style={{ fontSize: '9.5px', fontWeight: 600, color: 'var(--neon-violet)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Visual Linking Active
              </div>
              <div style={{ fontSize: '10px', color: 'var(--silver-300)', marginTop: '4px', lineHeight: 1.3 }}>
                {!connectorSourceNode ? (
                  '1. Click the first node (Source) on the canvas.'
                ) : (
                  <span>
                    Source: <strong style={{ color: 'var(--silver-100)' }}>{connectorSourceNode.fullName}</strong>.
                    <br />
                    2. Click another node (Target) to create a link.
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setVisualConnectMode(false);
                  setConnectorSourceNode(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(244,63,94,0.8)',
                  cursor: 'pointer',
                  fontSize: '9.5px',
                  fontWeight: 600,
                  marginTop: '6px',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Cancel Linking
              </button>
            </div>
          )}

          {/* Action: Resolve Duplicate Merges */}
          <button
            id="workspace-merge-btn"
            className="glass-button"
            onClick={() => setShowMergeModal(true)}
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              borderColor: dupCount > 0 ? 'rgba(16,185,129,0.3)' : 'var(--glass-border)',
              color: dupCount > 0 ? 'var(--neon-emerald)' : 'var(--silver-400)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            </svg>
            Resolve Duplicates
            {dupCount > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '9px',
                  fontWeight: 700,
                  background: 'rgba(16,185,129,0.2)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  padding: '1px 5px',
                  borderRadius: '100px',
                  color: 'var(--neon-emerald)',
                }}
              >
                {dupCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showCreateModal && (
        <NodeCreateModal onClose={() => setShowCreateModal(false)} />
      )}

      {showMergeModal && (
        <MergeEditorModal onClose={() => setShowMergeModal(false)} />
      )}
    </>
  );
}
