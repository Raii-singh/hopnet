'use client';

import { useGraphStore } from '@/store/graphStore';
import { ALL_NODES } from '@/utils/dummyData';
import { useState } from 'react';

export default function GraphControls() {
  const {
    hopDepth, showDemoNodes, searchQuery,
    setHopDepth, toggleDemoNodes, setSearchQuery,
    resetGraph, setRootNode,
  } = useGraphStore();

  const [searchResults, setSearchResults] = useState<typeof ALL_NODES>([]);
  const [showSearch, setShowSearch] = useState(false);

  function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const results = ALL_NODES.filter(n =>
      n.name.toLowerCase().includes(q.toLowerCase()) ||
      n.cluster?.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 6);
    setSearchResults(results);
  }

  function selectSearchResult(nodeId: string) {
    setRootNode(nodeId);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  }

  return (
    <div
      className="animate-slide-in-right"
      style={{
        position: 'fixed',
        top: '50%',
        right: 20,
        transform: 'translateY(-50%)',
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: 220,
      }}
    >
      <div className="glass-panel" style={{ padding: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-blue)" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span className="text-label" style={{ color: 'var(--neon-blue)' }}>Graph Controls</span>
        </div>

        {/* ── Hop Depth Slider ── */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-label">Hop Depth</span>
            <span className="text-mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--neon-cyan)' }}>
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
              background: `linear-gradient(to right, var(--neon-blue) 0%, var(--neon-blue) ${((hopDepth - 1) / 2) * 100}%, rgba(255,255,255,0.1) ${((hopDepth - 1) / 2) * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            {[1, 2, 3].map(d => (
              <span key={d} className="text-label" style={{ color: hopDepth >= d ? 'var(--neon-blue)' : 'var(--silver-700)' }}>
                {d}
              </span>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* ── Toggle Demo Nodes ── */}
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
            background: showDemoNodes ? 'rgba(6,182,212,0.2)' : 'rgba(100,116,139,0.2)',
            color: showDemoNodes ? 'var(--neon-cyan)' : 'var(--silver-500)',
          }}>
            {showDemoNodes ? 'ON' : 'OFF'}
          </span>
        </button>

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
          Search Node
        </button>

        {/* Search panel */}
        {showSearch && (
          <div style={{ marginBottom: '8px' }}>
            <input
              autoFocus
              className="glass-input"
              placeholder="Name or cluster…"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              style={{ marginBottom: '6px' }}
            />
            {searchResults.length > 0 && (
              <div className="glass-panel" style={{
                padding: '4px',
                maxHeight: 200,
                overflowY: 'auto',
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
                      background: node.type === 'REAL' ? 'var(--neon-cyan)' : 'var(--silver-500)',
                      boxShadow: node.type === 'REAL' ? '0 0 6px rgba(6,182,212,0.6)' : 'none',
                    }} />
                    <span style={{ color: 'var(--silver-200)', fontSize: '12px', fontWeight: 500, flex: 1 }}>
                      {node.name}
                    </span>
                    <span className="text-label" style={{ fontSize: '9px' }}>
                      {node.cluster}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Reset Graph ── */}
        <button
          id="reset-graph-btn"
          className="glass-button"
          onClick={resetGraph}
          style={{ width: '100%' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
          </svg>
          Reset Graph
        </button>
      </div>

      {/* Hop depth legend */}
      <div className="glass-panel" style={{ padding: '10px 14px' }}>
        <div className="text-label" style={{ marginBottom: '8px' }}>Expansion</div>
        {[
          { label: '1 hop', desc: 'Direct connections', depth: 1 },
          { label: '2 hops', desc: 'Second degree', depth: 2 },
          { label: '3 hops', desc: 'Full network', depth: 3 },
        ].map(item => (
          <div
            key={item.depth}
            onClick={() => setHopDepth(item.depth)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 6px', borderRadius: '6px', cursor: 'pointer',
              background: hopDepth === item.depth ? 'rgba(59,130,246,0.08)' : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            <span style={{
              width: 16, height: 2, borderRadius: 1,
              background: hopDepth >= item.depth
                ? `rgba(59,130,246,${1 - (item.depth - 1) * 0.25})`
                : 'var(--silver-800)',
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
  );
}
