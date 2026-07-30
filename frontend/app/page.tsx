'use client';

import { useEffect } from 'react';
import GraphCanvas from '@/components/graph/GraphCanvas';
import GraphControls from '@/components/graph/GraphControls';
import WorkspacePanel from '@/components/graph/WorkspacePanel';
import PathfinderPanel from '@/components/graph/PathfinderPanel';
import GraphLegend from '@/components/graph/GraphLegend';
import BottomInfoBar from '@/components/ui/BottomInfoBar';
import { useGraphStore } from '@/store/graphStore';

export default function HomePage() {
  const {
    meta, isLoading, initGraph, isApiHealthy, dataSource,
    activeProvider, providerCapabilities,
  } = useGraphStore();

  // Boot: try API, fall back to dummy
  useEffect(() => {
    initGraph();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accentColor = providerCapabilities.accentColor;

  return (
    <main style={{ position: 'fixed', inset: 0, paddingTop: 'var(--navbar-height)', zIndex: 10 }}>
      {/* Full-screen graph canvas */}
      <div style={{ position: 'absolute', inset: 0, top: 'var(--navbar-height)' }}>
        <GraphCanvas />
      </div>

      {/* Provider + data source indicator */}
      <div style={{
        position: 'absolute',
        top: 'calc(var(--navbar-height) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {/* Provider pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px',
          background: `${accentColor}12`,
          border: `1px solid ${accentColor}40`,
          borderRadius: '100px',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ fontSize: '13px' }}>{providerCapabilities.icon}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: accentColor, letterSpacing: '0.03em' }}>
            {providerCapabilities.displayName}
          </span>
        </div>

        {/* Data source pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px',
          background: 'var(--bg-glass)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '100px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isApiHealthy ? '#ffffff' : 'var(--silver-600)',
            boxShadow: isApiHealthy ? '0 0 8px rgba(255, 255, 255, 0.6)' : 'none',
          }} />
          <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--silver-400)', letterSpacing: '0.06em' }}>
            {dataSource === 'api'
              ? (activeProvider === 'imdb' ? 'LIVE — IMDb Pipeline' : 'LIVE — PostgreSQL')
              : (activeProvider === 'imdb' ? 'DEMO — Actor Network' : 'DEMO DATA')}
          </span>
        </div>
      </div>

      <GraphControls />
      <WorkspacePanel />
      <PathfinderPanel />
      <GraphLegend />
      <BottomInfoBar meta={meta} isLoading={isLoading} />
    </main>
  );
}
