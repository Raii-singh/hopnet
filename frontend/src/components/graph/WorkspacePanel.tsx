'use client';

import { useGraphStore } from '@/store/graphStore';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect } from 'react';
import { fetchDuplicates } from '@/services/api';
import NodeCreateModal from '@/components/modals/NodeCreateModal';
import MergeEditorModal from '@/components/modals/MergeEditorModal';
import SudoLoginModal from '@/components/modals/SudoLoginModal';

export default function WorkspacePanel() {
  const {
    visualConnectMode,
    connectorSourceNode,
    focusMode,
    setVisualConnectMode,
    setConnectorSourceNode,
  } = useGraphStore();

  const [isOpen, setIsOpen] = useState(true);
  const [dupCount, setDupCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSudoModal, setShowSudoModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { isAdmin, logout } = useAuthStore();

  // All hooks must be called unconditionally before any conditional return.
  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveIsAdmin = mounted ? isAdmin : false;

  useEffect(() => {
    if (!isOpen) return;
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
    const timer = setInterval(loadDuplicates, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isOpen]);

  // focusMode hides the panel — workspace is accessible to all users (read-only until SUDO unlocked)
  if (focusMode) return null;

  return (
    <>
      <div
        className="animate-slide-in-left"
        style={{
          position: 'fixed',
          top: 90,
          left: 24,
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: 240,
        }}
      >
        {!isOpen ? (
          /* Collapsed bar — Golden Standard glass-panel styling */
          <div
            className="glass-panel animate-fade-in"
            onClick={() => setIsOpen(true)}
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
            title="Click to open Relationship Workspace"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className="text-label" style={{ color: '#ffffff', fontSize: '11px', fontWeight: 700 }}>
                RELATIONSHIP WORKSPACE {!effectiveIsAdmin && '🔒'}
              </span>
            </div>
            <div style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              color: '#ffffff',
              flexShrink: 0,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
          </div>
        ) : (
          /* Expanded Relationship Workspace Box — Golden Standard glass-panel styling */
          <div className="glass-panel animate-fade-in" style={{ padding: '14px 16px' }}>
            {/* Header matching GraphControls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span className="text-label" style={{ color: '#ffffff', fontWeight: 700, fontSize: '11px' }}>
                  RELATIONSHIP WORKSPACE
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--silver-400)',
                  cursor: 'pointer', fontSize: '11px', padding: '2px 4px',
                }}
                title="Collapse Workspace"
              >
                ▲
              </button>
            </div>

            <p style={{ color: 'var(--silver-400)', fontSize: '10px', lineHeight: 1.4, margin: '0 0 12px' }}>
              Perform visual graph CRUD, merge identities, and establish secure edges.
            </p>

            {/* Actions container */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}>
              {/* Action: Add User Node */}
              <button
                id="workspace-add-node-btn"
                className="glass-button"
                onClick={() => setShowCreateModal(true)}
                style={{
                  width: '100%', justifyContent: 'flex-start',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add User Node
              </button>

              {/* Action: Visual Connector */}
              <button
                id="workspace-connect-btn"
                className={`glass-button ${visualConnectMode ? 'active' : ''}`}
                onClick={() => {
                  const nextVal = !visualConnectMode;
                  setVisualConnectMode(nextVal);
                  if (!nextVal) setConnectorSourceNode(null);
                }}
                style={{
                  width: '100%', justifyContent: 'flex-start',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                Connect Nodes Visually
              </button>

              {/* Connect Mode Active Visual Help Box */}
              {visualConnectMode && (
                <div
                  className="glass-panel"
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed rgba(255, 255, 255, 0.25)',
                    animation: 'pulseGlow 2s ease-in-out infinite',
                  }}
                >
                  <div style={{ fontSize: '9.5px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Visual Linking Active
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--silver-300)', marginTop: '4px', lineHeight: 1.3 }}>
                    {!connectorSourceNode ? (
                      '1. Click the first node (Source) on the canvas.'
                    ) : (
                      <span>
                        Source: <strong style={{ color: '#ffffff' }}>{connectorSourceNode.fullName}</strong>.
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
                      color: 'var(--silver-400)',
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
                  width: '100%', justifyContent: 'space-between',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  </svg>
                  Resolve Duplicates
                </span>
                {dupCount > 0 && (
                  <span style={{
                    fontSize: '9px', fontWeight: 700,
                    background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '1px 5px', borderRadius: '100px', color: '#ffffff',
                  }}>
                    {dupCount}
                  </span>
                )}
              </button>
            </div>

            {/* Enable SUDO Mode CTA when !effectiveIsAdmin */}
            {!effectiveIsAdmin ? (
              <button
                onClick={() => setShowSudoModal(true)}
                className="glass-button"
                style={{
                  width: '100%',
                  marginTop: '10px',
                  justifyContent: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Enable SUDO Mode (Persist to DB)
              </button>
            ) : (
              <div style={{ marginTop: '10px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9.5px', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '0.04em' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 8px #ffffff' }} />
                  SUDO UNLOCKED
                </span>
                <button
                  onClick={logout}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--silver-400)',
                    fontSize: '9.5px', cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Lock
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <NodeCreateModal onClose={() => setShowCreateModal(false)} />
      )}

      {showMergeModal && (
        <MergeEditorModal onClose={() => setShowMergeModal(false)} />
      )}

      {showSudoModal && (
        <SudoLoginModal onClose={() => setShowSudoModal(false)} />
      )}
    </>
  );
}
