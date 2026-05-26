'use client';

import { useEffect } from 'react';
import GraphCanvas from '@/components/graph/GraphCanvas';
import GraphControls from '@/components/graph/GraphControls';
import GraphLegend from '@/components/graph/GraphLegend';
import BottomInfoBar from '@/components/ui/BottomInfoBar';
import { useGraphStore } from '@/store/graphStore';

export default function HomePage() {
  const { meta, isLoading, initGraph, isApiHealthy, dataSource } = useGraphStore();

  // Boot: try API, fall back to dummy
  useEffect(() => {
    initGraph();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ position: 'fixed', inset: 0, paddingTop: 'var(--navbar-height)' }}>
      {/* Full-screen graph canvas */}
      <div style={{ position: 'absolute', inset: 0, top: 'var(--navbar-height)' }}>
        <GraphCanvas />
      </div>

      {/* Data source indicator */}
      <div style={{
        position: 'absolute',
        top: 'calc(var(--navbar-height) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px',
          background: 'var(--bg-glass)',
          border: `1px solid ${isApiHealthy ? 'rgba(6,182,212,0.3)' : 'rgba(100,116,139,0.2)'}`,
          borderRadius: '100px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isApiHealthy ? 'var(--neon-cyan)' : 'var(--silver-600)',
            boxShadow: isApiHealthy ? '0 0 6px var(--neon-cyan)' : 'none',
          }} />
          <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--silver-400)', letterSpacing: '0.06em' }}>
            {dataSource === 'api' ? 'LIVE — PostgreSQL' : 'DEMO DATA'}
          </span>
        </div>
      </div>

      <GraphControls />
      <GraphLegend />
      <BottomInfoBar meta={meta} isLoading={isLoading} />
    </main>
  );
}
