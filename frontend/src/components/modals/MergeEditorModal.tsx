'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { fetchDuplicates } from '@/services/api';

interface MergeEditorModalProps {
  onClose: () => void;
}

export default function MergeEditorModal({ onClose }: MergeEditorModalProps) {
  const { executeMerge } = useGraphStore();

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [mergingPairId, setMergingPairId] = useState<string | null>(null);

  async function loadDuplicates() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchDuplicates();
      if (res && res.suggestions) {
        setSuggestions(res.suggestions);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to detect duplicates from database ledger.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDuplicates();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleMerge(userA: any, userB: any, survivingUserId: string) {
    const sourceId = survivingUserId === userA.id ? userB.id : userA.id;
    const targetId = survivingUserId;

    const sourceName = survivingUserId === userA.id ? userB.fullName : userA.fullName;
    const targetName = survivingUserId === userA.id ? userA.fullName : userB.fullName;

    if (!confirm(`Are you sure you want to merge "${sourceName}" into "${targetName}"?\n\nThis will reassign all relationships to "${targetName}", combine tags/metadata, and soft-delete "${sourceName}" permanently.`)) {
      return;
    }

    const pairId = `${userA.id}-${userB.id}`;
    setMergingPairId(pairId);
    setErrorMsg('');

    try {
      await executeMerge(sourceId, targetId);
      // Reload duplicate suggestions
      await loadDuplicates();
    } catch (err: any) {
      setErrorMsg(err.message || 'Merge identity execution failed.');
      setMergingPairId(null);
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
          width: 520,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          padding: 0,
        }}
      >
        {/* Top Accent line */}
