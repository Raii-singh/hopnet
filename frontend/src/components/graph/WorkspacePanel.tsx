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
