'use client';

import GraphCanvas from '@/components/graph/GraphCanvas';
import GraphControls from '@/components/graph/GraphControls';
import GraphLegend from '@/components/graph/GraphLegend';
import BottomInfoBar from '@/components/ui/BottomInfoBar';
import { useGraphStore } from '@/store/graphStore';

export default function HomePage() {
  const { meta, isLoading } = useGraphStore();

  return (
    <main style={{ position: 'fixed', inset: 0, paddingTop: 'var(--navbar-height)' }}>
      {/* Full-screen graph */}
      <div style={{ position: 'absolute', inset: 0, top: 'var(--navbar-height)' }}>
        <GraphCanvas />
      </div>

      {/* Right controls */}
      <GraphControls />

      {/* Bottom-left legend */}
      <GraphLegend />

      {/* Bottom info bar */}
      <BottomInfoBar meta={meta} isLoading={isLoading} />
    </main>
  );
}
