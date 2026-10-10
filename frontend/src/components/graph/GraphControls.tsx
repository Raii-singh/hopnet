'use client';

import { useGraphStore } from '@/store/graphStore';
import { useAuthStore } from '@/store/authStore';
import { GraphNode } from '@/types/graph';
import { useState, useEffect } from 'react';
import { searchPersonsV2 } from '@/services/api';

export default function GraphControls() {
  const { isAdmin } = useAuthStore();
  const {
    hopDepth, showDemoNodes, searchQuery, focusMode,
    setHopDepth, toggleDemoNodes, setSearchQuery,
    resetGraph, setRootNode, allNodes, visibleNodes, databaseNodes,
    providerCapabilities, activeProvider, dataSource,
    activeEdgeTypes, minTrustFilter, setGraphFilters,
    primaryNodeId, rootNodeId, tracedPath, pathCost,
    tracedPaths, activePathIndex, setActivePathIndex,
    hasMorePaths, isLoadingMorePaths, loadMorePaths,
    tracePathAction, clearTracedPath,
    excludedNodeIds, excludeNode, includeNode, clearExcludedNodes,
    fontSizeScale, nodeSizeScale, nodeDistanceScale,
    setFontSizeScale, setNodeSizeScale, setNodeDistanceScale,
  } = useGraphStore();

  const RELATIONSHIP_TYPES = ['colleague', 'mentor', 'friend', 'cofounder', 'investor'];

  const [searchResults, setSearchResults] = useState<{id: string, fullName: string, cluster?: string}[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Accordion expansion states inside the right sidebar stack
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isPathfinderOpen, setIsPathfinderOpen] = useState(false);

  // Pathfinder inputs & state
  const [startQuery, setStartQuery] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [excludeQuery, setExcludeQuery] = useState('');
  const [startResults, setStartResults] = useState<any[]>([]);
  const [targetResults, setTargetResults] = useState<any[]>([]);
  const [excludeResults, setExcludeResults] = useState<any[]>([]);
  const [selectedStart, setSelectedStart] = useState<any>(null);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [traversalError, setTraversalError] = useState(false);

  const isImdb = false;
  // Pure Monochromatic Silver/White Palette
  const accentColor = '#ffffff';

  // Pathfinder exclude search
  useEffect(() => {
    if (excludeQuery.trim().length < 2) {
      setExcludeResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { dataSource, allNodes, visibleNodes, databaseNodes, excludedNodeIds } = useGraphStore.getState();
      if (dataSource === 'api-v2' || dataSource === 'api') {
        searchPersonsV2(excludeQuery).then(res => {
          setExcludeResults(res.data.filter(n => !excludedNodeIds.has(n.id)).slice(0, 5));
        }).catch(() => setExcludeResults([]));
      } else {
        const pool = [...visibleNodes, ...databaseNodes, ...allNodes];
        const results = pool.filter(n =>
          !excludedNodeIds.has(n.id) &&
          (n.fullName.toLowerCase().includes(excludeQuery.toLowerCase()) ||
            n.publicId.toLowerCase().includes(excludeQuery.toLowerCase()))
        ).slice(0, 5);
        setExcludeResults(results);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [excludeQuery]);

  // Auto-set start node to primaryNode / rootNode / first visible node
  useEffect(() => {
    if (visibleNodes.length > 0 && !selectedStart) {
      const activePrimary = visibleNodes.find(n => n.id === primaryNodeId || n.publicId === primaryNodeId)
        || visibleNodes.find(n => n.publicId === 'HNP-000001' || n.id === 'f02bb0c5-43e0-4e5e-b54a-033a852f1645' || n.fullName.trim().toLowerCase() === 'rai singh')
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
    const { selectNode } = useGraphStore.getState();
    selectNode(null);
    useGraphStore.setState({
      highlightedNodeIds: new Set([nodeId]),
      highlightedEdgeIds: new Set(),
    });
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  }

  function findNodeByNameOrQuery(query: string, visibleNodes: GraphNode[], databaseNodes: GraphNode[]): GraphNode | undefined {
    if (!query.trim()) return undefined;
    const q = query.trim().toLowerCase();
    const pool = [...visibleNodes, ...databaseNodes];

    let match = pool.find(n => n.publicId.toLowerCase() === q || n.fullName.toLowerCase() === q);
    if (match) return match;

    match = pool.find(n => n.fullName.toLowerCase().startsWith(q));
    if (match) return match;

    match = pool.find(n => n.fullName.toLowerCase().includes(q) || (n.cluster && n.cluster.toLowerCase().includes(q)));
    if (match) return match;

    const tokens = q.split(/\s+/).filter(t => t.length >= 3);
    if (tokens.length > 0) {
      match = pool.find(n => {
        const fn = n.fullName.toLowerCase();
        return tokens.some(t => fn.includes(t.slice(0, 4)));
      });
    }
    return match;
  }

  async function handleTracePath() {
    const { visibleNodes, databaseNodes, selectNode } = useGraphStore.getState();
    setTraversalError(false);

    const startNode = selectedStart || findNodeByNameOrQuery(startQuery, visibleNodes, databaseNodes);
    const targetNode = selectedTarget || findNodeByNameOrQuery(targetQuery, visibleNodes, databaseNodes);

    if (!startNode || !targetNode) {
      console.warn('[Pathfinder] Node lookup failed:', { startQuery, targetQuery });
      return;
    }

    if (!isImdb && startNode.nodeType === 'DEMO' && targetNode.nodeType === 'REAL') {
      setTraversalError(true);
      return;
    }

    selectNode(null);
    await tracePathAction(startNode.id, targetNode.id);
  }

  function handleSwapNodes() {
    const tempStartNode = selectedStart;
    const tempStartQuery = startQuery;
    setSelectedStart(selectedTarget);
    setStartQuery(targetQuery);
    setSelectedTarget(tempStartNode);
    setTargetQuery(tempStartQuery);
  }

  function handleResetPath() {
    setSelectedTarget(null);
    setTargetQuery('');
    setTraversalError(false);
    clearTracedPath();
  }

  if (focusMode) return null;

  return (
    <>
      {/* ── TOP CANVAS FLOATING MINI-BAR (WHEN PATH IS TRACED & PATHFINDER COLLAPSED) ── */}
      {tracedPath.length > 0 && !isPathfinderOpen && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: 76,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 350,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '6px 14px',
            borderRadius: '100px',
            background: 'rgba(8, 8, 8, 0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Active path summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 6px #ffffff' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
              {selectedStart?.fullName || tracedPath[0]?.fullName}
            </span>
            <span style={{ color: 'var(--silver-400)', fontSize: '11px' }}>→</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
              {selectedTarget?.fullName || tracedPath[tracedPath.length - 1]?.fullName}
            </span>
          </div>

          <div style={{ height: 12, width: 1, background: 'rgba(255,255,255,0.15)' }} />

          {/* Stepper buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setActivePathIndex(activePathIndex - 1)}
              disabled={activePathIndex <= 0}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '50%',
                width: 22,
                height: 22,
                color: activePathIndex > 0 ? '#ffffff' : 'var(--silver-600)',
                cursor: activePathIndex > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px'
              }}
            >
              ◄
            </button>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', minWidth: '55px', textAlign: 'center' }}>
              Path {activePathIndex + 1}/{tracedPaths.length}
            </span>
            <button
              onClick={() => {
                if (activePathIndex < tracedPaths.length - 1) {
                  setActivePathIndex(activePathIndex + 1);
                } else if (hasMorePaths && !isLoadingMorePaths) {
                  loadMorePaths();
                }
              }}
              disabled={activePathIndex >= tracedPaths.length - 1 && !hasMorePaths}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '50%',
                width: 22,
                height: 22,
                color: (activePathIndex < tracedPaths.length - 1 || hasMorePaths) ? '#ffffff' : 'var(--silver-600)',
                cursor: (activePathIndex < tracedPaths.length - 1 || hasMorePaths) ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px'
              }}
            >
              ►
            </button>
          </div>

          <div style={{ height: 12, width: 1, background: 'rgba(255,255,255,0.15)' }} />

          {/* Open full panel button */}
          <button
            onClick={() => setIsPathfinderOpen(true)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              borderRadius: '100px',
              padding: '2px 9px',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Expand Engine
          </button>

          {/* Clear path button */}
          <button
            onClick={handleResetPath}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--silver-500)',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '0 2px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── RIGHT DOCK SIDEBAR ── */}
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
          width: 240,
          maxHeight: 'calc(100vh - 110px)',
          overflowY: 'auto',
          paddingRight: '2px',
        }}
      >
        {/* ── CARD 1: GRAPH CONTROLS ── */}
        <div className="glass-panel" style={{ padding: '14px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span className="text-label" style={{ color: '#ffffff', fontSize: '11px', fontWeight: 700 }}>GRAPH CONTROLS</span>
            <span style={{
              marginLeft: 'auto', fontSize: '8px', padding: '1px 6px', borderRadius: '100px',
              background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 700, letterSpacing: '0.04em',
            }}>
              {providerCapabilities.icon} {isAdmin ? 'LIVE GRAPH' : 'RAI NETWORK'}
            </span>
          </div>

          {/* Hop Depth Slider */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span className="text-label" style={{ fontSize: '10px' }}>Hop Depth</span>
              <span className="text-mono" style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
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
                background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((hopDepth - 1) / 2) * 100}%, rgba(255,255,255,0.06) ${((hopDepth - 1) / 2) * 100}%, rgba(255,255,255,0.06) 100%)`,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              {[1, 2, 3].map(d => (
                <span key={d} className="text-label" style={{ color: hopDepth >= d ? '#ffffff' : 'var(--silver-700)', fontSize: '9px' }}>
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="divider" style={{ margin: '8px 0' }} />

          {/* Toggle Demo Nodes */}
          {providerCapabilities.hasDemoNodes && (
            <button
              id="toggle-demo-btn"
              className={`glass-button ${showDemoNodes ? 'active' : ''}`}
              onClick={toggleDemoNodes}
              style={{ width: '100%', justifyContent: 'space-between', marginBottom: '6px', padding: '6px 10px', fontSize: '11px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
                Demo Nodes
              </span>
              <span style={{
                fontSize: '9px', fontWeight: 600,
                padding: '1px 5px', borderRadius: '100px',
                background: showDemoNodes ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: showDemoNodes ? '#ffffff' : 'var(--silver-500)',
                border: `1px solid ${showDemoNodes ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.06)'}`
              }}>
                {showDemoNodes ? 'ON' : 'OFF'}
              </span>
            </button>
          )}

          {/* Search Node */}
          <button
            id="search-node-btn"
            className={`glass-button ${showSearch ? 'active' : ''}`}
            onClick={() => setShowSearch(s => !s)}
            style={{ width: '100%', marginBottom: '6px', padding: '6px 10px', fontSize: '11px' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Search Person
          </button>

          {/* Search panel */}
          {showSearch && (
            <div style={{ marginBottom: '6px' }}>
              <input
                autoFocus
                className="glass-input"
                placeholder="Search name or cluster…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ marginBottom: '4px', padding: '5px 8px', fontSize: '11px' }}
              />
              {searchResults.length > 0 && (
                <div className="glass-panel" style={{
                  padding: '3px',
                  maxHeight: 180,
                  overflowY: 'auto',
                  background: 'var(--bg-surface)',
                }}>
                  {searchResults.map(node => (
                    <button
                      key={node.id}
                      onClick={() => selectSearchResult(node.id)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '4px',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                        background: '#ffffff',
                      }} />
                      <span style={{ color: 'var(--silver-200)', fontSize: '11px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {node.fullName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reset Graph */}
          <button
            id="reset-graph-btn"
            className="glass-button"
            onClick={resetGraph}
            style={{ width: '100%', padding: '6px 10px', fontSize: '11px' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
            </svg>
            Reset Graph
          </button>
        </div>

        {/* ── CARD 2: ADVANCED FILTERS (INLINE EXPANDABLE SIDEBAR CARD) ── */}
        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
                  ADVANCED FILTERS
                </span>
                <div style={{ fontSize: '8.5px', color: 'var(--silver-500)', marginTop: '1px' }}>
                  {minTrustFilter > 0 ? `Trust >= ${minTrustFilter.toFixed(1)}` : 'All trust scores'} • {activeEdgeTypes.length > 0 ? `${activeEdgeTypes.length} types` : 'All types'}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--silver-400)' }}>
              {isFiltersOpen ? '▼' : '▲'}
            </span>
          </div>

          {/* Expanded Inline Filters Content */}
          {isFiltersOpen && (
            <div className="animate-fade-in" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Min Trust Score */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="text-label" style={{ color: '#ffffff', fontSize: '10px' }}>Min Trust Score</span>
                  <span className="text-mono" style={{ fontSize: '11px', color: '#ffffff', fontWeight: 700 }}>
                    {minTrustFilter.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0} max={1} step={0.1}
                  value={minTrustFilter}
                  onChange={e => setGraphFilters(activeEdgeTypes, parseFloat(e.target.value))}
                  className="hop-slider"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${minTrustFilter * 100}%, rgba(255,255,255,0.06) ${minTrustFilter * 100}%, rgba(255,255,255,0.06) 100%)`,
                  }}
                />
              </div>

              {/* Relationship Categories */}
              <div>
                <span className="text-label" style={{ color: '#ffffff', display: 'block', marginBottom: '6px', fontSize: '10px' }}>Relationship Categories</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {RELATIONSHIP_TYPES.map(type => {
                    const isActive = activeEdgeTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          const newTypes = isActive
                            ? activeEdgeTypes.filter(t => t !== type)
                            : [...activeEdgeTypes, type];
                          setGraphFilters(newTypes, minTrustFilter);
                        }}
                        style={{
                          fontSize: '9.5px',
                          padding: '3px 7px',
                          borderRadius: '4px',
                          background: isActive ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.03)',
                          color: isActive ? '#ffffff' : 'var(--silver-500)',
                          border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="divider" style={{ margin: '4px 0' }} />

              {/* Visual Layout Sliders */}
              <span className="text-label" style={{ color: '#ffffff', display: 'block', fontSize: '10px', fontWeight: 700 }}>
                Canvas Layout & Scaling
              </span>

              {/* Text Font Size */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="text-label" style={{ color: 'var(--silver-300)', fontSize: '9.5px' }}>Text Font Size</span>
                  <span className="text-mono" style={{ fontSize: '10px', color: '#ffffff', fontWeight: 700 }}>
                    {Math.round(fontSizeScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8} max={2.5} step={0.05}
                  value={fontSizeScale}
                  onChange={e => setFontSizeScale(parseFloat(e.target.value))}
                  className="hop-slider"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((fontSizeScale - 0.8) / 1.7) * 100}%, rgba(255,255,255,0.06) ${((fontSizeScale - 0.8) / 1.7) * 100}%, rgba(255,255,255,0.06) 100%)`,
                  }}
                />
              </div>

              {/* Node Circle Radius */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="text-label" style={{ color: 'var(--silver-300)', fontSize: '9.5px' }}>Node Circle Radius</span>
                  <span className="text-mono" style={{ fontSize: '10px', color: '#ffffff', fontWeight: 700 }}>
                    {Math.round(nodeSizeScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.7} max={2.0} step={0.05}
                  value={nodeSizeScale}
                  onChange={e => setNodeSizeScale(parseFloat(e.target.value))}
                  className="hop-slider"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((nodeSizeScale - 0.7) / 1.3) * 100}%, rgba(255,255,255,0.06) ${((nodeSizeScale - 0.7) / 1.3) * 100}%, rgba(255,255,255,0.06) 100%)`,
                  }}
                />
              </div>

              {/* Node Distance Spacing */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="text-label" style={{ color: 'var(--silver-300)', fontSize: '9.5px' }}>Node Distance Spacing</span>
                  <span className="text-mono" style={{ fontSize: '10px', color: '#ffffff', fontWeight: 700 }}>
                    {Math.round(nodeDistanceScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.4} max={1.8} step={0.05}
                  value={nodeDistanceScale}
                  onChange={e => setNodeDistanceScale(parseFloat(e.target.value))}
                  className="hop-slider"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((nodeDistanceScale - 0.4) / 1.4) * 100}%, rgba(255,255,255,0.06) ${((nodeDistanceScale - 0.4) / 1.4) * 100}%, rgba(255,255,255,0.06) 100%)`,
                  }}
                />
              </div>

              <button
                onClick={() => {
                  setGraphFilters([], 0);
                  setFontSizeScale(1.0);
                  setNodeSizeScale(1.0);
                  setNodeDistanceScale(1.0);
                }}
                className="glass-button"
                style={{ fontSize: '9.5px', padding: '4px 8px', width: '100%', justifyContent: 'center', marginTop: '4px', color: 'var(--silver-400)' }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* ── CARD 3: PATHFINDER ENGINE (INLINE EXPANDABLE SIDEBAR CARD) ── */}
        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div
            onClick={() => setIsPathfinderOpen(!isPathfinderOpen)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
                  PATHFINDER ENGINE
                </span>
                <div style={{ fontSize: '8.5px', color: tracedPath.length > 0 ? '#ffffff' : 'var(--silver-500)', marginTop: '1px' }}>
                  {tracedPath.length > 0 ? `Active: Path ${activePathIndex + 1} (${tracedPath.length} nodes)` : 'Trace shortest & alternative paths'}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--silver-400)' }}>
              {isPathfinderOpen ? '▼' : '▲'}
            </span>
          </div>

          {/* Expanded Inline Pathfinder Content */}
          {isPathfinderOpen && (
            <div className="animate-fade-in" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Start Node Input */}
              <div style={{ position: 'relative' }}>
                <label className="text-label" style={{ fontSize: '8.5px', marginBottom: '3px', display: 'block' }}>
                  Traverse Start Node
                </label>
                <input
                  className="glass-input"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  placeholder="Start person name..."
                  value={startQuery}
                  onChange={e => setStartQuery(e.target.value)}
                />
                {startResults.length > 0 && (
                  <div className="glass-panel" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    maxHeight: 120, overflowY: 'auto', zIndex: 500, padding: 3,
                    background: 'var(--bg-surface)', marginTop: '2px'
                  }}>
                    {startResults.map(node => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setSelectedStart(node);
                          setStartQuery(node.fullName);
                          setStartResults([]);
                        }}
                        style={{
                          width: '100%', padding: '5px 8px', background: 'transparent',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          gap: '6px', borderRadius: '4px', textAlign: 'left',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: node.nodeType === 'REAL' ? '#ffffff' : 'var(--silver-500)' }} />
                        <span style={{ fontSize: '10px', color: 'var(--silver-200)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {node.fullName}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Swap Button */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0' }}>
                <button
                  onClick={handleSwapNodes}
                  title="Swap Start and Target Nodes"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    fontSize: '10px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ⇄
                </button>
              </div>

              {/* Target Node Input */}
              <div style={{ position: 'relative' }}>
                <label className="text-label" style={{ fontSize: '8.5px', marginBottom: '3px', display: 'block' }}>
                  Traverse Target Node
                </label>
                <input
                  className="glass-input"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  placeholder="Target person name..."
                  value={targetQuery}
                  onChange={e => setTargetQuery(e.target.value)}
                />
                {targetResults.length > 0 && (
                  <div className="glass-panel" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    maxHeight: 120, overflowY: 'auto', zIndex: 500, padding: 3,
                    background: 'var(--bg-surface)', marginTop: '2px'
                  }}>
                    {targetResults.map(node => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setSelectedTarget(node);
                          setTargetQuery(node.fullName);
                          setTargetResults([]);
                        }}
                        style={{
                          width: '100%', padding: '5px 8px', background: 'transparent',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          gap: '6px', borderRadius: '4px', textAlign: 'left',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: node.nodeType === 'REAL' ? '#ffffff' : 'var(--silver-500)' }} />
                        <span style={{ fontSize: '10px', color: 'var(--silver-200)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {node.fullName}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Excluded Nodes Section */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label className="text-label" style={{ fontSize: '8.5px', color: 'var(--silver-400)' }}>
                    Exclude Nodes ({excludedNodeIds.size})
                  </label>
                  {excludedNodeIds.size > 0 && (
                    <button
                      onClick={clearExcludedNodes}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(244,63,94,0.8)', fontSize: '8.5px', cursor: 'pointer' }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {excludedNodeIds.size > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '4px' }}>
                    {Array.from(excludedNodeIds).map(id => {
                      const pool = [...visibleNodes, ...databaseNodes, ...allNodes];
                      const node = pool.find(n => n.id === id || n.publicId === id);
                      const name = node ? node.fullName : id;
                      return (
                        <span
                          key={id}
                          style={{
                            fontSize: '8.5px', padding: '1px 5px', borderRadius: '3px',
                            background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)',
                            color: 'rgba(244,63,94,0.9)', display: 'inline-flex', alignItems: 'center', gap: '3px'
                          }}
                        >
                          {name.length > 12 ? name.slice(0, 12) + '…' : name}
                          <button
                            onClick={() => includeNode(id)}
                            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '9px', padding: 0 }}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <input
                  className="glass-input"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  placeholder="Search node to exclude..."
                  value={excludeQuery}
                  onChange={e => setExcludeQuery(e.target.value)}
                />
                {excludeResults.length > 0 && (
                  <div className="glass-panel" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    maxHeight: 110, overflowY: 'auto', zIndex: 500, padding: 3,
                    background: 'var(--bg-surface)', marginTop: '2px'
                  }}>
                    {excludeResults.map(node => (
                      <button
                        key={node.id}
                        onClick={() => {
                          if (selectedStart?.id === node.id || selectedTarget?.id === node.id) {
                            alert('Source or target node cannot be in the excluded list.');
                            return;
                          }
                          excludeNode(node.id);
                          setExcludeQuery('');
                          setExcludeResults([]);
                        }}
                        style={{
                          width: '100%', padding: '4px 6px', background: 'transparent',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          gap: '6px', borderRadius: '4px', textAlign: 'left',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ fontSize: '10px', color: 'var(--silver-200)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {node.fullName}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Trace buttons */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {tracedPath.length > 0 && (
                  <button
                    className="glass-button"
                    onClick={handleResetPath}
                    style={{
                      flex: 1, fontSize: '10px', padding: '4px 6px',
                      borderColor: 'rgba(244,63,94,0.3)', color: 'rgba(244,63,94,0.8)'
                    }}
                  >
                    Clear
                  </button>
                )}
                <button
                  className="glass-button font-semibold"
                  onClick={handleTracePath}
                  disabled={!(selectedStart || startQuery.trim().length >= 2) || !(selectedTarget || targetQuery.trim().length >= 2)}
                  style={{
                    flex: 2, fontSize: '10px', padding: '4px 8px',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    background: 'rgba(255, 255, 255, 0.08)',
                    opacity: (!(selectedStart || startQuery.trim().length >= 2) || !(selectedTarget || targetQuery.trim().length >= 2)) ? 0.5 : 1,
                  }}
                >
                  Trace Path
                </button>
              </div>

              {/* Traced results & Stepper Navigation */}
              {tracedPath.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {/* Path Stepper Controls */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    <button
                      onClick={() => setActivePathIndex(activePathIndex - 1)}
                      disabled={activePathIndex <= 0}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: activePathIndex > 0 ? '#ffffff' : 'var(--silver-600)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: activePathIndex > 0 ? 'pointer' : 'not-allowed',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      ◄ Prev
                    </button>

                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff' }}>
                        Path {activePathIndex + 1} of {Math.max(tracedPaths.length, 1)}
                      </span>
                      <span className="text-mono" style={{ fontSize: '8.5px', color: 'var(--silver-400)' }}>
                        Hops: {pathCost ?? (tracedPath.length - 1)}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (activePathIndex < tracedPaths.length - 1) {
                          setActivePathIndex(activePathIndex + 1);
                        } else if (hasMorePaths && !isLoadingMorePaths) {
                          loadMorePaths();
                        }
                      }}
                      disabled={activePathIndex >= tracedPaths.length - 1 && !hasMorePaths}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: (activePathIndex < tracedPaths.length - 1 || hasMorePaths) ? '#ffffff' : 'var(--silver-600)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: (activePathIndex < tracedPaths.length - 1 || hasMorePaths) ? 'pointer' : 'not-allowed',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      {isLoadingMorePaths ? '...' : 'Next ►'}
                    </button>
                  </div>

                  {/* Path Status Label */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--silver-500)', padding: '0 2px' }}>
                    <span>{activePathIndex === 0 ? 'Optimal Route (#1)' : `Alternative Route (#${activePathIndex + 1})`}</span>
                    <span>{tracedPath.length} nodes</span>
                  </div>

                  {/* Step-by-Step Node List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: 110, overflowY: 'auto', paddingRight: '2px' }}>
                    {tracedPath.map((pNode, index) => (
                      <div key={pNode.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '8.5px',
                          fontWeight: 700,
                          color: index === 0 || index === tracedPath.length - 1 ? '#ffffff' : 'var(--silver-500)',
                          width: '14px'
                        }}>
                          {index + 1}.
                        </span>
                        <span style={{
                          fontSize: '10px',
                          color: index === 0 || index === tracedPath.length - 1 ? '#ffffff' : 'var(--silver-300)',
                          fontWeight: index === 0 || index === tracedPath.length - 1 ? 600 : 400,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {pNode.fullName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : traversalError ? (
                <div style={{ fontSize: '9px', color: 'rgba(244,63,94,0.9)', textAlign: 'center', padding: '4px' }}>
                  DEMO to REAL path traversal blocked.
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ── CARD 4: EXPANSION LEGEND ── */}
        <div className="glass-panel" style={{ padding: '10px 14px' }}>
          <div className="text-label" style={{ marginBottom: '8px' }}>Expansion</div>
          {[
            { label: '1 hop', desc: isImdb ? 'Direct co-stars' : 'Direct connections', depth: 1 },
            { label: '2 hops', desc: isImdb ? 'Friends of co-stars' : 'Second degree', depth: 2 },
            { label: '3 hops', desc: isImdb ? 'Full network' : 'Full network', depth: 3 },
          ].map(item => (
            <div
              key={item.depth}
              onClick={() => setHopDepth(item.depth)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '4px 6px', borderRadius: '6px', cursor: 'pointer',
                background: hopDepth === item.depth ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <span style={{
                width: 16, height: 2, borderRadius: 1,
                background: hopDepth >= item.depth ? '#ffffff' : 'var(--silver-800)',
                transition: 'background 0.3s',
              }} />
              <span style={{ color: hopDepth >= item.depth ? 'var(--silver-300)' : 'var(--silver-600)', fontSize: '11px' }}>
                {item.label}
              </span>
              <span style={{ color: 'var(--silver-700)', fontSize: '10px', marginLeft: 'auto' }}>
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
