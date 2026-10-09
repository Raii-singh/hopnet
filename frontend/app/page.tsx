'use client';

import { useEffect } from 'react';
import GraphCanvas from '@/components/graph/GraphCanvas';
import GraphControls from '@/components/graph/GraphControls';
import WorkspacePanel from '@/components/graph/WorkspacePanel';
import GraphLegend from '@/components/graph/GraphLegend';
import BottomInfoBar from '@/components/ui/BottomInfoBar';
import WelcomeGate from '@/components/ui/WelcomeGate';
import { useGraphStore } from '@/store/graphStore';
import { useAppStore } from '@/store/appStore';

export default function HomePage() {
  const {
    meta, isLoading, initGraph,
  } = useGraphStore();

  const { appMode, isAppModeReady, initAppMode } = useAppStore();

  // Read persisted mode from localStorage on mount (client-side only)
  useEffect(() => {
    initAppMode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Boot the graph canvas only when visitor clicks "Explore Demo Network" (appMode === 'demo')
  useEffect(() => {
    if (isAppModeReady && appMode === 'demo') {
      initGraph();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAppModeReady, appMode]);

  if (!isAppModeReady) return null;

  // 1. LANDING PAGE SETUP (appMode === 'choosing'):
  // Renders ONLY the centered Welcome Gate box over the Vanta Cells background.
  // No graph canvas, no sidebars, no controls, no legends!
  if (appMode === 'choosing') {
    return (
      <main style={{ position: 'fixed', inset: 0, paddingTop: 'var(--navbar-height)', zIndex: 10 }}>
        <WelcomeGate />
      </main>
    );
  }

  // 2. MAIN GRAPH VIEW (appMode === 'demo'):
  // Full 2D/3D spatial graph experience with all UI controls & panels.
  return (
    <main style={{ position: 'fixed', inset: 0, paddingTop: 'var(--navbar-height)', zIndex: 10 }}>
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
