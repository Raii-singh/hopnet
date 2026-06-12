'use client';

import { useGraphStore } from '@/store/graphStore';
import { GraphNode } from '@/types/graph';
import { useState, useEffect } from 'react';
import { searchPersonsV2 } from '@/services/api';

export default function GraphControls() {
  const {
    hopDepth, showDemoNodes, searchQuery, focusMode,
    setHopDepth, toggleDemoNodes, setSearchQuery,
    resetGraph, setRootNode, allNodes, visibleNodes,
    providerCapabilities, activeProvider, dataSource,
    activeEdgeTypes, minTrustFilter, setGraphFilters,
    primaryNodeId, rootNodeId, tracedPath, pathCost,
    tracePathAction, clearTracedPath,
  } = useGraphStore();

  const RELATIONSHIP_TYPES = ['colleague', 'mentor', 'friend', 'cofounder', 'investor'];

  const [searchResults, setSearchResults] = useState<{id: string, fullName: string, cluster?: string}[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Advanced filters dropdown state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Pathfinder state inside right sidebar
  const [isPathfinderOpen, setIsPathfinderOpen] = useState(false);
  const [startQuery, setStartQuery] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [startResults, setStartResults] = useState<any[]>([]);
  const [targetResults, setTargetResults] = useState<any[]>([]);
  const [selectedStart, setSelectedStart] = useState<any>(null);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [traversalError, setTraversalError] = useState(false);

  const isImdb = activeProvider === 'imdb';
  const accentColor = providerCapabilities.accentColor;

  // Auto-set start node to primaryNode / rootNode / first visible node
  useEffect(() => {
    if (visibleNodes.length > 0 && !selectedStart) {
      const activePrimary = visibleNodes.find(n => n.id === primaryNodeId || n.publicId === primaryNodeId)
        || visibleNodes.find(n => n.id === rootNodeId)
        || visibleNodes[0];
      if (activePrimary) {
        setSelectedStart(activePrimary);
        setStartQuery(activePrimary.fullName);
      }
    }
  }, [visibleNodes, primaryNodeId, rootNodeId, selectedStart]);

  // Pathfinder start search
  useEffect(() => {
    if (startQuery.trim().length < 2) {
      setStartResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (dataSource === 'api-v2' || dataSource === 'api') {
        searchPersonsV2(startQuery).then(res => setStartResults(res.data.slice(0, 5))).catch(() => setStartResults([]));
      } else {
        const results = allNodes.filter(n =>
          n.fullName.toLowerCase().includes(startQuery.toLowerCase()) ||
          n.publicId.toLowerCase().includes(startQuery.toLowerCase())
        ).slice(0, 5);
        setStartResults(results);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [startQuery, dataSource, allNodes]);

  // Pathfinder target search
  useEffect(() => {
    if (targetQuery.trim().length < 2) {
      setTargetResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (dataSource === 'api-v2' || dataSource === 'api') {
        searchPersonsV2(targetQuery).then(res => {
          setTargetResults(res.data.filter(n => n.id !== selectedStart?.id).slice(0, 5));
        }).catch(() => setTargetResults([]));
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
  }, [targetQuery, selectedStart, dataSource, allNodes]);

  useEffect(() => {
    if (!showSearch) {
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        if (dataSource === 'api-v2') {
          const res = await searchPersonsV2(searchQuery);
          if (active) {
            setSearchResults(res.data.map(n => ({
              id: n.id,
              fullName: n.fullName,
              cluster: n.cluster || undefined
            })).slice(0, 8));
          }
        } else {
          const results = allNodes.filter(n => {
            const name = n.fullName?.toLowerCase() ?? '';
            const cluster = n.cluster?.toLowerCase() ?? '';
            const q2 = searchQuery.toLowerCase();
            return name.includes(q2) || cluster.includes(q2);
          }).slice(0, 8);
          if (active) setSearchResults(results.map(n => ({ id: n.id, fullName: n.fullName, cluster: n.cluster })));
        }
      } catch (err) {
        console.warn('Search failed:', err);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, showSearch, dataSource, allNodes, setSearchQuery]);

  function selectSearchResult(nodeId: string) {
    setRootNode(nodeId);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  }

  async function handleTracePath() {
    if (!selectedStart || !selectedTarget) return;
    setTraversalError(false);
    if (!isImdb && selectedStart.nodeType === 'DEMO' && selectedTarget.nodeType === 'REAL') {
      setTraversalError(true);
      return;
    }
    await tracePathAction(selectedStart.id, selectedTarget.id);
  }

  function handleResetPath() {
    setSelectedTarget(null);
    setTargetQuery('');
    setTraversalError(false);
    clearTracedPath();
  }

  if (focusMode) return null;

  return (
    <div
      className="animate-slide-in-right"
      style={{
        position: 'fixed',
        top: 90,
        right: 24,
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: 230,
        maxHeight: 'calc(100vh - 110px)',
        overflowY: 'auto',
        paddingRight: '2px',
      }}
    >
      <div className="glass-panel" style={{ padding: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span className="text-label" style={{ color: '#ffffff' }}>Graph Controls</span>
          {/* Provider badge */}
          <span style={{
            marginLeft: 'auto', fontSize: '8px', padding: '1px 6px', borderRadius: '100px',
            background: `${accentColor}20`, color: accentColor,
            border: `1px solid ${accentColor}40`, fontWeight: 700, letterSpacing: '0.04em',
          }}>
            {providerCapabilities.icon} {isImdb ? 'IMDB' : 'COLLEGE'}
          </span>
        </div>

        {/* ── Hop Depth Slider ── */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-label">Hop Depth</span>
            <span className="text-mono" style={{ fontSize: '14px', fontWeight: 700, color: accentColor }}>
              {hopDepth}
            </span>
          </div>
          <input
            type="range"
            min={1} max={3} step={1}
            value={hopDepth}
            onChange={e => setHopDepth(Number(e.target.value))}
            className="hop-slider"
            id="hop-depth-slider"
            style={{
              background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${((hopDepth - 1) / 2) * 100}%, rgba(255,255,255,0.06) ${((hopDepth - 1) / 2) * 100}%, rgba(255,255,255,0.06) 100%)`,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            {[1, 2, 3].map(d => (
              <span key={d} className="text-label" style={{ color: hopDepth >= d ? accentColor : 'var(--silver-700)' }}>
                {d}
              </span>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* ── Toggle Demo Nodes ── */}
        {providerCapabilities.hasDemoNodes && (
          <button
            id="toggle-demo-btn"
            className={`glass-button ${showDemoNodes ? 'active' : ''}`}
            onClick={toggleDemoNodes}
            style={{ width: '100%', justifyContent: 'space-between', marginBottom: '8px' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
              Demo Nodes
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 600,
              padding: '2px 6px', borderRadius: '100px',
              background: showDemoNodes ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              color: showDemoNodes ? '#ffffff' : 'var(--silver-500)',
              border: `1px solid ${showDemoNodes ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`
            }}>
              {showDemoNodes ? 'ON' : 'OFF'}
            </span>
          </button>
        )}

        {/* ── IMDb read-only badge ── */}
        {isImdb && (
          <div style={{
            padding: '6px 10px',
            background: `${accentColor}10`,
            border: `1px solid ${accentColor}30`,
            borderRadius: '6px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: '10px', color: accentColor, fontWeight: 500 }}>
              Read-only — Actor collaboration network
            </span>
          </div>
        )}

        {/* ── Search Node ── */}
        <button
          id="search-node-btn"
          className={`glass-button ${showSearch ? 'active' : ''}`}
          onClick={() => setShowSearch(s => !s)}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Search {providerCapabilities.nodeLabel}
        </button>

        {/* Search panel */}
        {showSearch && (
          <div style={{ marginBottom: '8px' }}>
            <input
              autoFocus
              className="glass-input"
              placeholder={isImdb ? 'Actor name or decade…' : 'Name or cluster…'}
              value={searchQuery}
              onChange={e => setStartQuery(e.target.value)}
              style={{ marginBottom: '6px' }}
            />
            {searchResults.length > 0 && (
              <div className="glass-panel" style={{
                padding: '4px',
                maxHeight: 200,
                overflowY: 'auto',
                background: 'var(--bg-surface)',
              }}>
                {searchResults.map(node => (
                  <button
                    key={node.id}
                    onClick={() => selectSearchResult(node.id)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '6px',
                      transition: 'background 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-glass)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: accentColor,
                      boxShadow: `0 0 5px ${accentColor}80`,
                    }} />
                    <span style={{ color: 'var(--silver-200)', fontSize: '12px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
