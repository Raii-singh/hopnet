'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { GraphNode } from '@/types/graph';
import { ProviderId } from '@/providers/graphProvider';

export default function PathfinderPanel() {
  const {
    allNodes,
    visibleNodes,
    databaseNodes,
    workspaceMode,
    tracedPath,
    pathCost,
    tracedPaths,
    activePathIndex,
    hasMorePaths,
    isLoadingMorePaths,
    setActivePathIndex,
    loadMorePaths,
    focusMode,
    tracePathAction,
    clearTracedPath,
    excludedNodeIds,
    excludeNode,
    includeNode,
    clearExcludedNodes,
    activeProvider,
    providerCapabilities,
  } = useGraphStore();

  const isImdb = false;
  const accentColor = providerCapabilities.accentColor;

  const [isOpen, setIsOpen] = useState(false);
  const [startQuery, setStartQuery] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [excludeQuery, setExcludeQuery] = useState('');
  
  const [startResults, setStartResults] = useState<any[]>([]);
  const [targetResults, setTargetResults] = useState<any[]>([]);
  const [excludeResults, setExcludeResults] = useState<any[]>([]);
  
  const [selectedStart, setSelectedStart] = useState<any>(null);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [traversalError, setTraversalError] = useState(false);

  useEffect(() => {
    if (excludeQuery.trim().length < 2) {
      setExcludeResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { dataSource, allNodes, visibleNodes, databaseNodes, excludedNodeIds } = useGraphStore.getState();
      if (dataSource === 'api-v2' || dataSource === 'api') {
        import('@/services/api').then(({ searchPersonsV2 }) => {
          searchPersonsV2(excludeQuery).then(res => setExcludeResults(res.data.filter(n => !excludedNodeIds.has(n.id)).slice(0, 5))).catch(() => setExcludeResults([]));
        });
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

  // Set default start node to active primary node when visibleNodes are loaded
  useEffect(() => {
    const { visibleNodes, primaryNodeId, rootNodeId } = useGraphStore.getState();
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
    let start = selectedStart;
    let target = selectedTarget;

    const { visibleNodes, databaseNodes, allNodes } = useGraphStore.getState();
    const pool = visibleNodes.length > 0 ? visibleNodes : (databaseNodes.length > 0 ? databaseNodes : allNodes);

    if (!start && startQuery.trim()) {
      const q = startQuery.trim().toLowerCase();
      start = pool.find(n => n.fullName.toLowerCase().includes(q) || n.publicId.toLowerCase().includes(q)) || null;
      if (start) setSelectedStart(start);
    }

    if (!target && targetQuery.trim()) {
      const q = targetQuery.trim().toLowerCase();
      target = pool.find(n => (start ? n.id !== start.id : true) && (n.fullName.toLowerCase().includes(q) || n.publicId.toLowerCase().includes(q))) || null;
      if (target) setSelectedTarget(target);
    }

    if (!start || !target) return;
    setTraversalError(false);

    // College-only constraint: DEMO→REAL traversal blocked
    if (!isImdb && start.nodeType === 'DEMO' && target.nodeType === 'REAL') {
      setTraversalError(true);
      return;
    }

    await tracePathAction(start.id, target.id);
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
                className="glass-input"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                placeholder={isImdb ? 'Actor name...' : 'Start node name...'}
                value={startQuery}
                onChange={e => handleStartSearch(e.target.value)}
              />
              {startResults.length > 0 && (
                <div className="glass-panel" style={{
                  position: 'absolute', bottom: '105%', left: 0, right: 0,
                  maxHeight: 120, overflowY: 'auto', zIndex: 500, padding: 3,
                  background: 'var(--bg-surface)',
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

            {/* Target Node Input */}
            <div style={{ position: 'relative' }}>
              <label className="text-label" style={{ fontSize: '8.5px', marginBottom: '3px', display: 'block' }}>{isImdb ? 'Target Actor' : 'Traverse Target'}</label>
              <input
                className="glass-input"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                placeholder={isImdb ? 'Actor name...' : 'Target node name...'}
                value={targetQuery}
                onChange={e => handleTargetSearch(e.target.value)}
              />
              {targetResults.length > 0 && (
                <div className="glass-panel" style={{
                  position: 'absolute', bottom: '105%', left: 0, right: 0,
                  maxHeight: 120, overflowY: 'auto', zIndex: 500, padding: 3,
                  background: 'var(--bg-surface)',
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
                placeholder="Exclude a node..."
                value={excludeQuery}
                onChange={e => setExcludeQuery(e.target.value)}
              />
              {excludeResults.length > 0 && (
                <div className="glass-panel" style={{
                  position: 'absolute', bottom: '105%', left: 0, right: 0,
                  maxHeight: 110, overflowY: 'auto', zIndex: 500, padding: 3,
                  background: 'var(--bg-surface)'
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

            {/* Active Trace Controls */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              {tracedPath.length > 0 && (
                <button
                  className="glass-button"
                  onClick={handleReset}
                  style={{
                    flex: 1, fontSize: '10px', padding: '4px 8px',
                    borderColor: 'rgba(244,63,94,0.3)', color: 'rgba(244,63,94,0.8)'
                  }}
                >
                  Clear Path
                </button>
              )}
              <button
                className="glass-button font-semibold"
                onClick={handleTrace}
                disabled={(!selectedStart && !startQuery.trim()) || (!selectedTarget && !targetQuery.trim())}
                style={{
                  flex: 2, fontSize: '10px', padding: '4px 8px',
                  borderColor: `${accentColor}60`,
                  color: accentColor,
                  background: `${accentColor}10`,
                  opacity: ((!selectedStart && !startQuery.trim()) || (!selectedTarget && !targetQuery.trim())) ? 0.5 : 1,
                }}
              >
                {isImdb ? '🎬 Find Collaboration Path' : '⚡ Trace Dijkstra Route'}
              </button>
            </div>

            <div className="divider" style={{ margin: '6px 0 2px' }} />

            {/* Path Tracer results list */}
            {tracedPath.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: 'var(--silver-500)' }}>
                  <span>Found Paths ({tracedPaths.length})</span>
                  <span className="text-mono" style={{ color: 'var(--silver-400)', fontWeight: 700 }}>Cost: {pathCost}</span>
                </div>

                {/* Path selector tabs */}
                {tracedPaths.length > 1 && (
                  <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {tracedPaths.map((p, idx) => {
                      const isActive = idx === activePathIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => setActivePathIndex(idx)}
                          style={{
                            flexShrink: 0,
                            fontSize: '9.5px',
                            fontWeight: isActive ? 700 : 500,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: isActive ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)',
                            background: isActive ? `${accentColor}20` : 'rgba(255,255,255,0.03)',
                            color: isActive ? accentColor : 'var(--silver-400)',
                            cursor: 'pointer',
                          }}
                        >
                          Path {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  maxHeight: 110, overflowY: 'auto', paddingRight: '4px'
                }}>
                  {tracedPath.map((pNode, index) => {
                    const isTarget = pNode.id === selectedTarget?.id;
                    const isRoot = pNode.id === selectedStart?.id;
                    return (
                      <div key={pNode.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 10 }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: isRoot ? '#ffffff' : isTarget ? 'var(--silver-200)' : 'var(--silver-600)',
                            boxShadow: isRoot || isTarget ? '0 0 4px currentColor' : 'none',
                          }} />
                          {index < tracedPath.length - 1 && (
                            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                          <span style={{ color: isRoot || isTarget ? 'var(--silver-200)' : 'var(--silver-400)', fontWeight: isRoot || isTarget ? 600 : 400 }}>
                            {pNode.fullName}
                          </span>
                          <span className="text-mono" style={{ fontSize: '8.5px', color: 'var(--silver-600)' }}>
                            {pNode.publicId}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Load More Button */}
                {hasMorePaths && (
                  <button
                    onClick={loadMorePaths}
                    disabled={isLoadingMorePaths}
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      fontSize: '9.5px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: 'var(--silver-200)',
                      cursor: isLoadingMorePaths ? 'wait' : 'pointer',
                      opacity: isLoadingMorePaths ? 0.6 : 1,
                    }}
                  >
                    {isLoadingMorePaths ? 'Loading paths...' : '+ Load More Alternatives'}
                  </button>
                )}
              </div>
            ) : traversalError ? (
              <div style={{
                textAlign: 'center', padding: '10px 8px', background: 'rgba(244,63,94,0.04)',
                border: '1px solid rgba(244,63,94,0.15)', borderRadius: '6px', color: 'rgba(244,63,94,0.85)'
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600 }}>Traversal Blocked</div>
                <div style={{ fontSize: '9px', marginTop: '2px', lineHeight: 1.3 }}>
                  Dijkstra tracer forbids pathfinding from DEMO expansion nodes into REAL database nodes.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--silver-600)', padding: '10px 0', fontSize: '10px', lineHeight: 1.3 }}>
                {isImdb
                  ? 'Find the shortest collaboration chain between any two actors.'
                  : 'Search and select any node from the explorer to trace optimal secure connection chains.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
