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
          width: 230,
        }}
      >
        {!isOpen ? (
          /* Collapsed bar with pencil edit icon button */
          <div
            className="glass-panel animate-fade-in"
            onClick={() => setIsOpen(true)}
            style={{
              padding: '8px 12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              background: 'rgba(5, 5, 5, 0.85)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(12px)',
            }}
            title="Click pencil to open Relationship Workspace"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
                RELATIONSHIP WORKSPACE {!isAdmin && '🔒'}
              </span>
            </div>
            <div style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              boxShadow: '0 0 8px rgba(255, 255, 255, 0.15)',
              flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
          </div>
        ) : (
          /* Expanded Relationship Workspace Box */
          <div className="glass-panel animate-fade-in" style={{ padding: '14px 16px', border: '1px solid rgba(255, 255, 255, 0.15)', background: 'rgba(5, 5, 5, 0.88)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span className="text-label" style={{ color: '#ffffff', fontWeight: 700, fontSize: '11px' }}>
                  Relationship Workspace
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
              Perform visual graph CRUD, merge identities, and establish secure edges locally.
            </p>

            {/* Actions container - Greyed out when !effectiveIsAdmin */}
            <div style={{
              opacity: effectiveIsAdmin ? 1 : 0.45,
              pointerEvents: effectiveIsAdmin ? 'auto' : 'none',
              filter: effectiveIsAdmin ? 'none' : 'grayscale(0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}>
              {/* Action: Add User Node */}
              <button
                id="workspace-add-node-btn"
                className="glass-button"
                onClick={() => setShowCreateModal(true)}
                disabled={!effectiveIsAdmin}
                style={{
                  width: '100%', justifyContent: 'flex-start',
                  borderColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff',
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
                disabled={!effectiveIsAdmin}
                style={{
                  width: '100%', justifyContent: 'flex-start',
                  borderColor: visualConnectMode ? 'rgba(255, 255, 255, 0.3)' : 'var(--glass-border)',
                  color: visualConnectMode ? '#ffffff' : 'var(--silver-400)',
                  background: visualConnectMode ? 'rgba(255, 255, 255, 0.08)' : 'var(--bg-glass)',
                  boxShadow: visualConnectMode ? '0 0 10px rgba(255, 255, 255, 0.1)' : 'none',
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
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed rgba(255, 255, 255, 0.2)',
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
                disabled={!effectiveIsAdmin}
                style={{
                  width: '100%', justifyContent: 'flex-start',
                  borderColor: dupCount > 0 ? 'rgba(255, 255, 255, 0.25)' : 'var(--glass-border)',
                  color: dupCount > 0 ? '#ffffff' : 'var(--silver-400)',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                </svg>
                Resolve Duplicates
                {dupCount > 0 && (
                  <span style={{
                    marginLeft: 'auto', fontSize: '9px', fontWeight: 700,
                    background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.25)',
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
                className="glass-button font-semibold"
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '7px 10px',
                  fontSize: '11px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#ffffff',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                🔑 Enable SUDO Mode to Edit
              </button>
            ) : (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9.5px', color: '#3b82f6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} />
                  SUDO UNLOCKED
                </span>
                <button
                  onClick={logout}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--silver-500)',
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
