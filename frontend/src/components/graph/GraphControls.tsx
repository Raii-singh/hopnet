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
    showNodeLabels, edgeOpacity, autoFreezeLayout,
    setShowNodeLabels, setEdgeOpacity, setAutoFreezeLayout,
    isAutoTrustFilter, setIsAutoTrustFilter, refreshSubgraph,
  } = useGraphStore();

  const RELATIONSHIP_TYPES = ['colleague', 'mentor', 'friend', 'cofounder', 'investor'];

  const [searchResults, setSearchResults] = useState<{id: string, fullName: string, cluster?: string}[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Focus panel mode: 'none' (standard overview) | 'filters' | 'pathfinder'
  const [activePanel, setActivePanel] = useState<'none' | 'filters' | 'pathfinder'>('none');
  const isFiltersOpen = activePanel === 'filters';
  const isPathfinderOpen = activePanel === 'pathfinder';

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
    const q = excludeQuery.trim();
    if (q.length < 2) {
      setExcludeResults([]);
      return;
    }
    const { dataSource, allNodes, visibleNodes, databaseNodes, excludedNodeIds, activeProvider } = useGraphStore.getState();
    const dataset = activeProvider === 'raj' ? 'raj' : 'live';
    const pool = [...visibleNodes, ...databaseNodes, ...allNodes];
    const localFiltered = pool.filter(n =>
      !excludedNodeIds.has(n.id) &&
      n.id !== selectedStart?.id &&
      n.id !== selectedTarget?.id &&
      (n.fullName.toLowerCase().includes(q.toLowerCase()) || n.publicId.toLowerCase().includes(q.toLowerCase()))
    ).slice(0, 5);

    if (localFiltered.length > 0) setExcludeResults(localFiltered);

    const timer = setTimeout(async () => {
      if (dataSource === 'api-v2' || dataSource === 'api') {
        try {
          const res = await searchPersonsV2(q, 8, dataset);
          const seen = new Set<string>(excludedNodeIds);
          if (selectedStart?.id) seen.add(selectedStart.id);
          if (selectedTarget?.id) seen.add(selectedTarget.id);
          const combined: any[] = [];
          for (const item of [...localFiltered, ...res.data]) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              combined.push(item);
            }
          }
          setExcludeResults(combined.slice(0, 5));
        } catch {
          // Keep local results
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [excludeQuery, selectedStart, selectedTarget]);

  // Auto-set start node to primaryNode / rootNode / first visible node
  useEffect(() => {
    if (visibleNodes.length > 0 && !selectedStart) {
      const activePrimary = visibleNodes.find(n => n.id === primaryNodeId || n.publicId === primaryNodeId)
        || visibleNodes.find(n => n.publicId === 'HNP-000001' || n.id === 'ba81e688-04a2-401a-8ede-9059f4a030fa' || n.id === 'f02bb0c5-43e0-4e5e-b54a-033a852f1645' || n.fullName.trim().toLowerCase() === 'rai' || n.fullName.trim().toLowerCase() === 'rai singh')
        || visibleNodes.find(n => n.id === rootNodeId)
        || visibleNodes[0];
      if (activePrimary) {
        setSelectedStart(activePrimary);
        setStartQuery(activePrimary.fullName);
      }
    }
  }, [visibleNodes, primaryNodeId, rootNodeId, selectedStart]);

  // Pathfinder start search with instant local ranking + remote dataset search
  useEffect(() => {
    const q = startQuery.trim();
    if (q.length < 2) {
      setStartResults([]);
      return;
    }
    // Guard: Do not search if the query already matches the currently selected node
    if (selectedStart && selectedStart.fullName.toLowerCase().trim() === q.toLowerCase()) {
      setStartResults([]);
      return;
    }

    const { dataSource, allNodes, visibleNodes, activeProvider } = useGraphStore.getState();
    const dataset = activeProvider === 'raj' ? 'raj' : 'live';

    // Instant local candidate lookup
    const pool = [...visibleNodes, ...allNodes];
    const qLower = q.toLowerCase();
    const localFiltered = pool.filter(n =>
      n.fullName.toLowerCase().includes(qLower) ||
      n.publicId.toLowerCase().includes(qLower)
    ).sort((a, b) => {
      const aLower = a.fullName.toLowerCase();
      const bLower = b.fullName.toLowerCase();
      const aScore = aLower === qLower ? 0 : (aLower === 'rai' || aLower === 'rai singh') ? 1 : aLower.startsWith(qLower) ? 2 : 3;
      const bScore = bLower === qLower ? 0 : (bLower === 'rai' || bLower === 'rai singh') ? 1 : bLower.startsWith(qLower) ? 2 : 3;
      return aScore - bScore;
    });

    if (localFiltered.length > 0) {
      setStartResults(localFiltered.slice(0, 6));
    }

    const timer = setTimeout(async () => {
      if (dataSource === 'api-v2' || dataSource === 'api') {
        try {
          const res = await searchPersonsV2(q, 8, dataset);
          const seen = new Set<string>();
          const combined: any[] = [];
          for (const item of [...localFiltered, ...res.data]) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              combined.push(item);
            }
          }
          setStartResults(combined.slice(0, 6));
        } catch {
          // Keep local results
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [startQuery, selectedStart]);

  // Pathfinder target search with instant local ranking + remote dataset search
  useEffect(() => {
    const q = targetQuery.trim();
    if (q.length < 2) {
      setTargetResults([]);
      return;
    }
    // Guard: Do not search if the query already matches the currently selected target
    if (selectedTarget && selectedTarget.fullName.toLowerCase().trim() === q.toLowerCase()) {
      setTargetResults([]);
      return;
    }

    const { dataSource, allNodes, visibleNodes, activeProvider } = useGraphStore.getState();
    const dataset = activeProvider === 'raj' ? 'raj' : 'live';

    const pool = [...visibleNodes, ...allNodes];
    const qLower = q.toLowerCase();
    const localFiltered = pool.filter(n =>
      n.id !== selectedStart?.id &&
      (n.fullName.toLowerCase().includes(qLower) || n.publicId.toLowerCase().includes(qLower))
    ).sort((a, b) => {
      const aLower = a.fullName.toLowerCase();
      const bLower = b.fullName.toLowerCase();
      const aScore = aLower === qLower ? 0 : (aLower === 'rai' || aLower === 'rai singh') ? 1 : aLower.startsWith(qLower) ? 2 : 3;
      const bScore = bLower === qLower ? 0 : (bLower === 'rai' || bLower === 'rai singh') ? 1 : bLower.startsWith(qLower) ? 2 : 3;
      return aScore - bScore;
    });

    if (localFiltered.length > 0) {
      setTargetResults(localFiltered.slice(0, 6));
    }

    const timer = setTimeout(async () => {
      if (dataSource === 'api-v2' || dataSource === 'api') {
        try {
          const res = await searchPersonsV2(q, 8, dataset);
          const seen = new Set<string>();
          if (selectedStart?.id) seen.add(selectedStart.id);
          const combined: any[] = [];
          for (const item of [...localFiltered, ...res.data]) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              combined.push(item);
            }
          }
          setTargetResults(combined.slice(0, 6));
        } catch {
          // Keep local results
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [targetQuery, selectedTarget, selectedStart]);

  useEffect(() => {
    if (!showSearch) {
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    const { dataSource, allNodes, visibleNodes, activeProvider } = useGraphStore.getState();
    const dataset = activeProvider === 'raj' ? 'raj' : 'live';

    const pool = [...visibleNodes, ...allNodes];
    const q2 = q.toLowerCase();
    const localMatches = pool.filter(n => {
      const name = n.fullName?.toLowerCase() ?? '';
      const cluster = n.cluster?.toLowerCase() ?? '';
      return name.includes(q2) || cluster.includes(q2);
    }).slice(0, 8);

    if (localMatches.length > 0) {
      setSearchResults(localMatches.map(n => ({ id: n.id, fullName: n.fullName, cluster: n.cluster })));
    }

    const timer = setTimeout(async () => {
      try {
        if (dataSource === 'api-v2') {
          const res = await searchPersonsV2(q, 8, dataset);
          if (active) {
            const seen = new Set<string>();
            const combined: any[] = [];
            for (const item of [...localMatches, ...res.data]) {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                combined.push({ id: item.id, fullName: item.fullName, cluster: item.cluster || undefined });
              }
            }
            setSearchResults(combined.slice(0, 8));
          }
        }
      } catch (err) {
        console.warn('Search failed:', err);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 200);

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
    setStartResults([]);
    setTargetResults([]);
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
            onClick={() => setActivePanel('pathfinder')}
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
        {/* ── BOX 1: GRAPH CONTROLS HEADER ── */}
        <div className="glass-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" style={{ flexShrink: 0 }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span className="text-label" style={{ color: '#ffffff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              GRAPH CONTROLS
            </span>
          </div>
          {activePanel !== 'none' && (
            <button
              onClick={() => setActivePanel('none')}
              style={{
                fontSize: '9px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '100px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: 'var(--silver-300)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = 'var(--silver-300)';
              }}
              title="Return to standard 5-box overview"
            >
              Overview ✕
            </button>
          )}
        </div>

        {/* COMPACT QUICK DOCK (When Filters or Pathfinder is in focus) */}
        {activePanel !== 'none' ? (
          <div className="glass-panel animate-fade-in" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Quick Actions Bar or Inline Search takeover */}
            {showSearch ? (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  autoFocus
                  className="glass-input"
                  placeholder="Search person in network…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '4px 22px 4px 8px', fontSize: '10.5px', height: '26px' }}
                />
                <button
                  onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}
                  style={{
                    position: 'absolute', right: 6, background: 'transparent',
                    border: 'none', color: 'var(--silver-400)', cursor: 'pointer', fontSize: '11px', padding: 0
                  }}
                  title="Close search"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                {providerCapabilities.hasDemoNodes && (
                  <button
                    id="toggle-demo-btn"
                    onClick={toggleDemoNodes}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '4px 8px', borderRadius: '6px',
                      fontSize: '10px', fontWeight: 600,
                      background: showDemoNodes ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${showDemoNodes ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.08)'}`,
                      color: showDemoNodes ? '#ffffff' : 'var(--silver-400)',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                    title="Toggle Demo Nodes"
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: showDemoNodes ? '#ffffff' : 'var(--silver-700)',
                      boxShadow: showDemoNodes ? '0 0 5px rgba(255,255,255,0.8)' : 'none',
                    }} />
                    Demo
                  </button>
                )}
                <button
                  id="search-node-btn"
                  onClick={() => setShowSearch(true)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    padding: '4px 8px', borderRadius: '6px',
                    fontSize: '10px', fontWeight: 500,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    color: 'var(--silver-300)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = 'var(--silver-300)';
                  }}
                  title="Search Person"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Search
                </button>
                <button
                  id="reset-graph-btn"
                  onClick={resetGraph}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    padding: '4px 8px', borderRadius: '6px',
                    fontSize: '10px', fontWeight: 500,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    color: 'var(--silver-300)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = 'var(--silver-300)';
                  }}
                  title="Reset Graph Zoom & Position"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                  </svg>
                  Reset
                </button>
              </div>
            )}

            {/* Elevated Search Results Popover */}
            {showSearch && searchResults.length > 0 && (
              <div style={{
                position: 'relative',
                maxHeight: 140,
                overflowY: 'auto',
                background: '#121316',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '6px',
                padding: '3px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85)',
              }}>
                {searchResults.map(node => (
                  <button
                    key={node.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSearchResult(node.id);
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    style={{
                      width: '100%', padding: '5px 8px', background: 'transparent',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: '6px', borderRadius: '4px', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ color: '#ffffff', fontSize: '10.5px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {node.fullName}
                    </span>
                    {node.cluster && (
                      <span style={{ fontSize: '8.5px', color: 'var(--silver-500)', flexShrink: 0 }}>
                        {node.cluster}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Sleek Segmented Hop Depth Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                <span style={{ fontSize: '8.5px', fontWeight: 700, color: 'var(--silver-500)', letterSpacing: '0.05em' }}>
                  HOP DEPTH
                </span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--silver-300)' }}>
                  {hopDepth >= 7 ? 'Full Graph' : `${hopDepth} ${hopDepth === 1 ? 'hop' : 'hops'}`}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '2px',
                gap: '1px',
              }}>
                {[
                  { depth: 1, label: '1' },
                  { depth: 2, label: '2' },
                  { depth: 3, label: '3' },
                  { depth: 4, label: '4' },
                  { depth: 5, label: '5' },
                  { depth: 6, label: '6' },
                  { depth: 7, label: 'ALL' },
                ].map(item => {
                  const isActive = hopDepth === item.depth;
                  return (
                    <button
                      key={item.depth}
                      onClick={() => setHopDepth(item.depth)}
                      style={{
                        flex: 1,
                        padding: '3px 0',
                        fontSize: '9.5px',
                        fontWeight: isActive ? 700 : 500,
                        borderRadius: '4px',
                        border: 'none',
                        background: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--silver-500)',
                        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={e => {
                        if (!isActive) e.currentTarget.style.color = 'var(--silver-500)';
                      }}
                      title={item.depth === 7 ? 'Full Graph (All nodes & edges)' : `${item.depth} hop${item.depth > 1 ? 's' : ''}`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── BOX 2: ACTION BUTTONS (DEMO, SEARCH, RESET) ── */}
            <div className="glass-panel" style={{ padding: '10px 12px' }}>
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
                style={{ width: '100%', marginBottom: showSearch ? '6px' : '6px', padding: '6px 10px', fontSize: '11px' }}
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

            {/* ── BOX 3: HOP DEPTH EXPANSION ── */}
            <div className="glass-panel" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="text-label" style={{ fontSize: '10px' }}>Hop Depth</span>
                <span className="text-mono" style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
                  {hopDepth >= 7 ? 'Full Graph' : `${hopDepth} ${hopDepth === 1 ? 'hop' : 'hops'}`}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {[
                  { label: '1 hop', desc: 'Direct connections', depth: 1 },
                  { label: '2 hops', desc: 'Second degree', depth: 2 },
                  { label: '3 hops', desc: 'Third degree', depth: 3 },
                  { label: '4 hops', desc: 'Fourth degree', depth: 4 },
                  { label: '5 hops', desc: 'Fifth degree', depth: 5 },
                  { label: '6 hops', desc: 'Sixth degree', depth: 6 },
                  { label: 'Full Graph', desc: 'All nodes & edges', depth: 7 },
                ].map(item => (
                  <div
                    key={item.depth}
                    onClick={() => setHopDepth(item.depth)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '3px 6px', borderRadius: '5px', cursor: 'pointer',
                      background: hopDepth === item.depth ? 'rgba(255, 255, 255, 0.10)' : 'transparent',
                      border: hopDepth === item.depth ? '1px solid rgba(255, 255, 255, 0.20)' : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (hopDepth !== item.depth) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={e => {
                      if (hopDepth !== item.depth) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{
                      width: 14, height: 2, borderRadius: 1,
                      background: hopDepth >= item.depth ? '#ffffff' : 'var(--silver-800)',
                      transition: 'background 0.3s',
                    }} />
                    <span style={{
                      color: hopDepth >= item.depth ? '#ffffff' : 'var(--silver-500)',
                      fontSize: '10.5px',
                      fontWeight: hopDepth === item.depth ? 700 : (item.depth === 7 ? 600 : 400),
                    }}>
                      {item.label}
                    </span>
                    <span style={{ color: 'var(--silver-700)', fontSize: '9px', marginLeft: 'auto' }}>
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── CARD 2: ADVANCED FILTERS (INLINE EXPANDABLE SIDEBAR CARD) ── */}
        <div className="glass-panel" style={{ padding: '12px 14px' }}>
          <div
            onClick={() => setActivePanel(activePanel === 'filters' ? 'none' : 'filters')}
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
              {isFiltersOpen ? '▲' : '▼'}
            </span>
          </div>

          {/* Expanded Inline Filters Content */}
          {isFiltersOpen && (
            <div className="animate-fade-in" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Min Trust Score */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="text-label" style={{ color: '#ffffff', fontSize: '10px' }}>Min Trust Score</span>
                    <button
                      onClick={() => {
                        const nextAuto = !isAutoTrustFilter;
                        setIsAutoTrustFilter(nextAuto);
                      }}
                      style={{
                        fontSize: '8px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: isAutoTrustFilter ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: isAutoTrustFilter ? '#34d399' : 'var(--silver-500)',
                        border: `1px solid ${isAutoTrustFilter ? 'rgba(52, 211, 153, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        cursor: 'pointer',
                        letterSpacing: '0.04em',
                      }}
                      title={isAutoTrustFilter ? 'Dynamic auto-set active (100+: 0.2, 1k: 0.7, 2k+: 0.9)' : 'Click to enable dynamic auto trust'}
                    >
                      {isAutoTrustFilter ? 'AUTO DYNAMIC' : 'MANUAL'}
                    </button>
                  </div>
                  <span className="text-mono" style={{ fontSize: '11px', color: '#ffffff', fontWeight: 700 }}>
                    {minTrustFilter.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0} max={1} step={0.1}
                  value={minTrustFilter}
                  onChange={e => {
                    setIsAutoTrustFilter(false);
                    setGraphFilters(activeEdgeTypes, parseFloat(e.target.value));
                  }}
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
                Canvas Layout & Filters
              </span>

              {/* 1. Hide / Show Node Names Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="text-label" style={{ color: '#ffffff', fontSize: '10px' }}>Show Node Names</span>
                  <div style={{ fontSize: '8.5px', color: 'var(--silver-500)' }}>
                    {showNodeLabels ? 'Showing names' : 'Hidden (circles only)'}
                  </div>
                </div>
                <button
                  onClick={() => setShowNodeLabels(!showNodeLabels)}
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '100px',
                    background: showNodeLabels ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: showNodeLabels ? '#ffffff' : 'var(--silver-500)',
                    border: `1px solid ${showNodeLabels ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {showNodeLabels ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* 2. Edge Opacity Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="text-label" style={{ color: 'var(--silver-300)', fontSize: '9.5px' }}>Edge Opacity (Visibility)</span>
                  <span className="text-mono" style={{ fontSize: '10px', color: '#ffffff', fontWeight: 700 }}>
                    {Math.round(edgeOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.0} max={1.0} step={0.05}
                  value={edgeOpacity}
                  onChange={e => setEdgeOpacity(parseFloat(e.target.value))}
                  className="hop-slider"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${edgeOpacity * 100}%, rgba(255,255,255,0.06) ${edgeOpacity * 100}%, rgba(255,255,255,0.06) 100%)`,
                  }}
                />
              </div>

              {/* 3. Gravity & Spacing Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="text-label" style={{ color: 'var(--silver-300)', fontSize: '9.5px' }}>Gravity & Spacing</span>
                  <span className="text-mono" style={{ fontSize: '10px', color: '#ffffff', fontWeight: 700 }}>
                    {Math.round(nodeDistanceScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3} max={2.5} step={0.05}
                  value={nodeDistanceScale}
                  onChange={e => setNodeDistanceScale(parseFloat(e.target.value))}
                  className="hop-slider"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((nodeDistanceScale - 0.3) / 2.2) * 100}%, rgba(255,255,255,0.06) ${((nodeDistanceScale - 0.3) / 2.2) * 100}%, rgba(255,255,255,0.06) 100%)`,
                  }}
                />
              </div>

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

              {/* Auto-Freeze Layout */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="text-label" style={{ color: '#ffffff', fontSize: '10px' }}>Auto-Freeze Layout</span>
                  <div style={{ fontSize: '8.5px', color: 'var(--silver-500)' }}>
                    {autoFreezeLayout ? 'Freezes layout after settling' : 'Continuous live float & auto-adjustment'}
                  </div>
                </div>
                <button
                  onClick={() => setAutoFreezeLayout(!autoFreezeLayout)}
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '100px',
                    background: autoFreezeLayout ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: autoFreezeLayout ? '#ffffff' : 'var(--silver-500)',
                    border: `1px solid ${autoFreezeLayout ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {autoFreezeLayout ? 'ON' : 'OFF'}
                </button>
              </div>

              <button
                onClick={() => {
                  setIsAutoTrustFilter(true);
                  setGraphFilters([], 0);
                  setFontSizeScale(1.7);
                  setNodeSizeScale(1.0);
                  setNodeDistanceScale(1.5);
                  setShowNodeLabels(true);
                  setEdgeOpacity(0.5);
                  setAutoFreezeLayout(true);
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
            onClick={() => setActivePanel(activePanel === 'pathfinder' ? 'none' : 'pathfinder')}
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
              {isPathfinderOpen ? '▲' : '▼'}
            </span>
          </div>

          {/* Expanded Inline Pathfinder Content */}
          {isPathfinderOpen && (
            <div className="animate-fade-in" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Start Node Input */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label className="text-label" style={{ fontSize: '8.5px', color: 'var(--silver-400)' }}>
                    TRAVERSE START NODE
                  </label>
                  {selectedStart && (
                    <span style={{ fontSize: '8px', color: selectedStart.nodeType === 'REAL' ? '#ffffff' : 'var(--silver-400)' }}>
                      {selectedStart.nodeType === 'REAL' ? '● Real' : '○ Demo'}
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="glass-input"
                    style={{ padding: '5px 24px 5px 8px', fontSize: '11px', width: '100%' }}
                    placeholder="Start person name..."
                    value={startQuery}
                    onChange={e => {
                      setStartQuery(e.target.value);
                      if (selectedStart && e.target.value !== selectedStart.fullName) {
                        setSelectedStart(null);
                      }
                    }}
                  />
                  {startQuery && (
                    <button
                      onClick={() => {
                        setSelectedStart(null);
                        setStartQuery('');
                        setStartResults([]);
                      }}
                      style={{
                        position: 'absolute', right: 6,
                        background: 'transparent', border: 'none',
                        color: 'var(--silver-400)', cursor: 'pointer', fontSize: '11px', padding: 0
                      }}
                      title="Clear start person"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {startResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    maxHeight: 160, overflowY: 'auto', zIndex: 1000, padding: '4px',
                    background: '#121316', border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '8px', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.9)',
                  }}>
                    {startResults.map(node => (
                      <button
                        key={node.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedStart(node);
                          setStartQuery(node.fullName);
                          setStartResults([]);
                        }}
                        style={{
                          width: '100%', padding: '5px 8px', background: 'transparent',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', gap: '6px', borderRadius: '4px', textAlign: 'left',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: node.nodeType === 'REAL' ? '#ffffff' : 'var(--silver-500)', flexShrink: 0 }} />
                          <span style={{ fontSize: '10.5px', color: '#ffffff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.fullName}
                          </span>
                        </div>
                        {node.cluster && (
                          <span style={{ fontSize: '8.5px', color: 'var(--silver-500)', flexShrink: 0 }}>
                            {node.cluster}
                          </span>
                        )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label className="text-label" style={{ fontSize: '8.5px', color: 'var(--silver-400)' }}>
                    TRAVERSE TARGET NODE
                  </label>
                  {selectedTarget && (
                    <span style={{ fontSize: '8px', color: selectedTarget.nodeType === 'REAL' ? '#ffffff' : 'var(--silver-400)' }}>
                      {selectedTarget.nodeType === 'REAL' ? '● Real' : '○ Demo'}
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="glass-input"
                    style={{ padding: '5px 24px 5px 8px', fontSize: '11px', width: '100%' }}
                    placeholder="Target person name..."
                    value={targetQuery}
                    onChange={e => {
                      setTargetQuery(e.target.value);
                      if (selectedTarget && e.target.value !== selectedTarget.fullName) {
                        setSelectedTarget(null);
                      }
                    }}
                  />
                  {targetQuery && (
                    <button
                      onClick={() => {
                        setSelectedTarget(null);
                        setTargetQuery('');
                        setTargetResults([]);
                      }}
                      style={{
                        position: 'absolute', right: 6,
                        background: 'transparent', border: 'none',
                        color: 'var(--silver-400)', cursor: 'pointer', fontSize: '11px', padding: 0
                      }}
                      title="Clear target person"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {targetResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    maxHeight: 160, overflowY: 'auto', zIndex: 1000, padding: '4px',
                    background: '#121316', border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '8px', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.9)',
                  }}>
                    {targetResults.map(node => (
                      <button
                        key={node.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedTarget(node);
                          setTargetQuery(node.fullName);
                          setTargetResults([]);
                        }}
                        style={{
                          width: '100%', padding: '5px 8px', background: 'transparent',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', gap: '6px', borderRadius: '4px', textAlign: 'left',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: node.nodeType === 'REAL' ? '#ffffff' : 'var(--silver-500)', flexShrink: 0 }} />
                          <span style={{ fontSize: '10.5px', color: '#ffffff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.fullName}
                          </span>
                        </div>
                        {node.cluster && (
                          <span style={{ fontSize: '8.5px', color: 'var(--silver-500)', flexShrink: 0 }}>
                            {node.cluster}
                          </span>
                        )}
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

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="glass-input"
                    style={{ padding: '5px 24px 5px 8px', fontSize: '11px', width: '100%' }}
                    placeholder="Search node to exclude..."
                    value={excludeQuery}
                    onChange={e => setExcludeQuery(e.target.value)}
                  />
                  {excludeQuery && (
                    <button
                      onClick={() => {
                        setExcludeQuery('');
                        setExcludeResults([]);
                      }}
                      style={{
                        position: 'absolute', right: 6,
                        background: 'transparent', border: 'none',
                        color: 'var(--silver-400)', cursor: 'pointer', fontSize: '11px', padding: 0
                      }}
                      title="Clear"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {excludeResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    maxHeight: 140, overflowY: 'auto', zIndex: 1000, padding: '4px',
                    background: '#121316', border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '8px', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.9)',
                  }}>
                    {excludeResults.map(node => (
                      <button
                        key={node.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (selectedStart?.id === node.id || selectedTarget?.id === node.id) {
                            alert('Source or target node cannot be in the excluded list.');
                            return;
                          }
                          excludeNode(node.id);
                          setExcludeQuery('');
                          setExcludeResults([]);
                        }}
                        style={{
                          width: '100%', padding: '5px 8px', background: 'transparent',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', gap: '6px', borderRadius: '4px', textAlign: 'left',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: node.nodeType === 'REAL' ? '#ffffff' : 'var(--silver-500)', flexShrink: 0 }} />
                          <span style={{ fontSize: '10.5px', color: '#ffffff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.fullName}
                          </span>
                        </div>
                        {node.cluster && (
                          <span style={{ fontSize: '8.5px', color: 'var(--silver-500)', flexShrink: 0 }}>
                            {node.cluster}
                          </span>
                        )}
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
      </div>
    </>
  );
}
