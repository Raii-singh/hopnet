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
