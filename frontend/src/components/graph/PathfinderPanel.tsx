'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { GraphNode } from '@/types/graph';
import { ProviderId } from '@/providers/graphProvider';

export default function PathfinderPanel() {
  const {
    allNodes,
    workspaceMode,
    tracedPath,
    pathCost,
    focusMode,
    tracePathAction,
    clearTracedPath,
    activeProvider,
    providerCapabilities,
  } = useGraphStore();

  const isImdb = activeProvider === 'imdb';
  const accentColor = providerCapabilities.accentColor;

  const [isOpen, setIsOpen] = useState(false);
  const [startQuery, setStartQuery] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  
  const [startResults, setStartResults] = useState<any[]>([]);
  const [targetResults, setTargetResults] = useState<any[]>([]);
  
  const [selectedStart, setSelectedStart] = useState<any>(null);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [traversalError, setTraversalError] = useState(false);

  // Set default start node to active primary node when visibleNodes are loaded
  useEffect(() => {
    const { visibleNodes, primaryNodeId, rootNodeId } = useGraphStore.getState();
    if (visibleNodes.length > 0 && !selectedStart) {
      const activePrimary = visibleNodes.find(n => n.id === primaryNodeId || n.publicId === primaryNodeId)
        || visibleNodes.find(n => n.id === rootNodeId)
        || visibleNodes[0];
      if (activePrimary) {
        setSelectedStart(activePrimary);
        setStartQuery(activePrimary.fullName);
      }
    }
  }, [selectedStart]);

  useEffect(() => {
    if (startQuery.trim().length < 2) {
      setStartResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { dataSource, allNodes } = useGraphStore.getState();
      if (dataSource === 'api-v2' || dataSource === 'api') {
        import('@/services/api').then(({ searchPersonsV2 }) => {
          searchPersonsV2(startQuery).then(res => setStartResults(res.data.slice(0, 5))).catch(() => setStartResults([]));
        });
      } else {
        const results = allNodes.filter(n =>
          n.fullName.toLowerCase().includes(startQuery.toLowerCase()) ||
          n.publicId.toLowerCase().includes(startQuery.toLowerCase())
        ).slice(0, 5);
        setStartResults(results);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [startQuery]);

  useEffect(() => {
    if (targetQuery.trim().length < 2) {
      setTargetResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { dataSource, allNodes } = useGraphStore.getState();
      if (dataSource === 'api-v2' || dataSource === 'api') {
        import('@/services/api').then(({ searchPersonsV2 }) => {
          searchPersonsV2(targetQuery).then(res => {
            setTargetResults(res.data.filter(n => n.id !== selectedStart?.id).slice(0, 5));
          }).catch(() => setTargetResults([]));
        });
      } else {
        const results = allNodes.filter(n =>
          n.id !== selectedStart?.id &&
          (n.fullName.toLowerCase().includes(targetQuery.toLowerCase()) ||
            n.publicId.toLowerCase().includes(targetQuery.toLowerCase()))
        ).slice(0, 5);
        setTargetResults(results);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [targetQuery, selectedStart]);

  if (workspaceMode || focusMode) return null; // Hide in visual workspace mode or focus mode

  function handleStartSearch(q: string) {
    setStartQuery(q);
  }

  function handleTargetSearch(q: string) {
    setTargetQuery(q);
  }

  async function handleTrace() {
    if (!selectedStart || !selectedTarget) return;
    setTraversalError(false);

    // College-only constraint: DEMO→REAL traversal blocked
    if (!isImdb && selectedStart.nodeType === 'DEMO' && selectedTarget.nodeType === 'REAL') {
      setTraversalError(true);
      return;
    }

    await tracePathAction(selectedStart.id, selectedTarget.id);
  }

  function handleReset() {
    setSelectedTarget(null);
    setTargetQuery('');
    setTraversalError(false);
    clearTracedPath();
  }

  return (
    <div
      className="animate-slide-in-right"
      style={{
        position: 'fixed',
        bottom: 80,
        right: 24,
        zIndex: 400,
        width: 250,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div className="glass-panel" style={{ padding: '10px 14px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
        {/* Header */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--silver-200)', letterSpacing: '0.04em' }}>
              {isImdb ? 'COLLABORATION PATH' : 'PATHFINDER ENGINE'}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--silver-500)', transition: 'all 0.2s' }}>
            {isOpen ? '▼' : '▲'}
          </span>
        </div>

        {isOpen && (
          <div className="animate-fade-in" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Start Node Input */}
            <div style={{ position: 'relative' }}>
              <label className="text-label" style={{ fontSize: '8.5px', marginBottom: '3px', display: 'block' }}>{isImdb ? 'Start Actor' : 'Traverse Start'}</label>
              <input
