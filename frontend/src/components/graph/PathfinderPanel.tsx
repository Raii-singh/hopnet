'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { GraphNode } from '@/types/graph';

export default function PathfinderPanel() {
  const {
    allNodes,
    workspaceMode,
    tracedPath,
    pathCost,
    tracePathAction,
    clearTracedPath,
  } = useGraphStore();

  const [isOpen, setIsOpen] = useState(false);
  const [startQuery, setStartQuery] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  
  const [startResults, setStartResults] = useState<GraphNode[]>([]);
  const [targetResults, setTargetResults] = useState<GraphNode[]>([]);
  
  const [selectedStart, setSelectedStart] = useState<GraphNode | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<GraphNode | null>(null);
  const [traversalError, setTraversalError] = useState(false);

  // Set default start node to active root when allNodes are loaded
  useEffect(() => {
    if (allNodes.length > 0 && !selectedStart) {
      const realRoot = allNodes.find(n => n.nodeType === 'REAL') || allNodes[0];
      setSelectedStart(realRoot);
      setStartQuery(realRoot.fullName);
    }
  }, [allNodes, selectedStart]);

  if (workspaceMode) return null; // Hide in visual workspace mode

  function handleStartSearch(q: string) {
    setStartQuery(q);
    if (q.trim().length < 2) {
      setStartResults([]);
      return;
    }
    const results = allNodes.filter(n =>
      n.fullName.toLowerCase().includes(q.toLowerCase()) ||
      n.publicId.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 5);
    setStartResults(results);
  }

  function handleTargetSearch(q: string) {
    setTargetQuery(q);
    if (q.trim().length < 2) {
      setTargetResults([]);
      return;
    }
    const results = allNodes.filter(n =>
      n.id !== selectedStart?.id &&
      (n.fullName.toLowerCase().includes(q.toLowerCase()) ||
        n.publicId.toLowerCase().includes(q.toLowerCase()))
    ).slice(0, 5);
    setTargetResults(results);
  }

  async function handleTrace() {
    if (!selectedStart || !selectedTarget) return;
    setTraversalError(false);

    // Enforce traversal check locally before API
    if (selectedStart.nodeType === 'DEMO' && selectedTarget.nodeType === 'REAL') {
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
        bottom: 20,
        right: 20,
        zIndex: 400,
        width: 250,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div className="glass-panel" style={{ padding: '10px 14px', border: '1px solid rgba(139,92,246,0.25)' }}>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-violet)" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--silver-200)', letterSpacing: '0.04em' }}>
              PATHFINDER ENGINE
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
              <label className="text-label" style={{ fontSize: '8.5px', marginBottom: '3px', display: 'block' }}>Traverse Start</label>
              <input
                className="glass-input"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                placeholder="Start node name..."
                value={startQuery}
                onChange={e => handleStartSearch(e.target.value)}
              />
              {startResults.length > 0 && (
                <div className="glass-panel" style={{
                  position: 'absolute', bottom: '105%', left: 0, right: 0,
                  maxHeight: 120, overflowY: 'auto', zIndex: 500, padding: 3,
                  background: '#0a0a18',
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
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: node.nodeType === 'REAL' ? 'var(--neon-cyan)' : 'var(--silver-500)' }} />
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
              <label className="text-label" style={{ fontSize: '8.5px', marginBottom: '3px', display: 'block' }}>Traverse Target</label>
              <input
                className="glass-input"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                placeholder="Target node name..."
                value={targetQuery}
                onChange={e => handleTargetSearch(e.target.value)}
              />
              {targetResults.length > 0 && (
                <div className="glass-panel" style={{
                  position: 'absolute', bottom: '105%', left: 0, right: 0,
                  maxHeight: 120, overflowY: 'auto', zIndex: 500, padding: 3,
                  background: '#0a0a18',
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
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: node.nodeType === 'REAL' ? 'var(--neon-cyan)' : 'var(--silver-500)' }} />
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
                disabled={!selectedStart || !selectedTarget}
                style={{
                  flex: 2, fontSize: '10px', padding: '4px 8px',
                  borderColor: 'rgba(139,92,246,0.4)',
                  color: 'var(--neon-violet)',
                  background: 'rgba(139,92,246,0.05)',
                  opacity: (!selectedStart || !selectedTarget) ? 0.5 : 1,
                }}
              >
                ⚡ Trace Dijkstra Route
              </button>
            </div>

            <div className="divider" style={{ margin: '6px 0 2px' }} />

            {/* Path Tracer results list */}
            {tracedPath.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--silver-500)' }}>
                  <span>Active traversal route</span>
                  <span className="text-mono" style={{ color: 'var(--neon-violet)', fontWeight: 700 }}>Weight: {pathCost}</span>
                </div>

                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  maxHeight: 120, overflowY: 'auto', paddingRight: '4px'
                }}>
                  {tracedPath.map((pNode, index) => {
                    const isTarget = pNode.id === selectedTarget?.id;
                    const isRoot = pNode.id === selectedStart?.id;
                    return (
                      <div key={pNode.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 10 }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: isRoot ? '#a78bfa' : isTarget ? 'var(--neon-cyan)' : 'var(--silver-600)',
                            boxShadow: isRoot || isTarget ? '0 0 4px currentColor' : 'none',
                          }} />
                          {index < tracedPath.length - 1 && (
                            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
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
              </div>
            ) : traversalError ? (
              <div style={{
                textAlign: 'center', padding: '10px 8px', background: 'rgba(244,63,94,0.04)',
                border: '1px solid rgba(244,63,94,0.15)', borderRadius: '6px', color: 'rgba(244,63,94,0.85)'
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600 }}>Traversal Blocked</div>
                <div style={{ fontSize: '9px', marginTop: '2px', lineHeight: 1.3 }}>
                  Dijkstra tracer forbids pathfinding from placeholder demo nodes into the REAL database ledger.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--silver-600)', padding: '10px 0', fontSize: '10px', lineHeight: 1.3 }}>
                Search and select any node from the explorer to trace optimal secure connection chains.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
