'use client';

import { useEffect } from 'react';
import GraphCanvas from '@/components/graph/GraphCanvas';
import GraphControls from '@/components/graph/GraphControls';
import WorkspacePanel from '@/components/graph/WorkspacePanel';
import GraphLegend from '@/components/graph/GraphLegend';
import BottomInfoBar from '@/components/ui/BottomInfoBar';
import LandingSplashOverlay from '@/components/ui/LandingSplashOverlay';
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
      {/* Landing Splash Loading Overlay */}
      <LandingSplashOverlay />

      {/* Full-screen graph canvas */}
      <div style={{ position: 'absolute', inset: 0, top: 'var(--navbar-height)' }}>
        <GraphCanvas />
      </div>



      <GraphControls />
      <WorkspacePanel />
      <GraphLegend />
      <BottomInfoBar meta={meta} isLoading={isLoading} />
    </main>
  );
}
