/**
 * HOPNet CollegeGraph — Frontend Fallback Dataset
 * ─────────────────────────────────────────────────────────────────────────────
 * CANONICAL SOURCE OF TRUTH:
 *   database/graph-providers/college/datasets/raw/nodes.json
 *   database/graph-providers/college/datasets/raw/edges.json
 *
 * This file is a TypeScript mirror of those canonical JSON datasets.
 * It exists so the frontend can run without the backend API (offline/demo mode).
 *
 * DO NOT edit data here without also updating the canonical JSON files above.
 *
 * KNOWN ISSUES:
 *   - GraphControls.tsx imports ALL_NODES directly for search (Bug: bypasses live data)
 *   - This file contains a duplicate BFS implementation (backend/src/graph/bfs.ts is canonical)
 *
 * Imported by:
 *   - frontend/src/store/graphStore.ts (ALL_NODES, ALL_EDGES, getSubgraph, computeMeta)
 *   - frontend/src/components/graph/GraphControls.tsx (ALL_NODES — search bug)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { GraphNode, GraphEdge } from '@/types/graph';

// ============================================================
// DATA LOADERS — Canonical Source of Truth Bridge
// ============================================================
import demoGraph from '../data/college/college_graph_demo.json';

const graphData = demoGraph as any;

export const REAL_NODES = graphData.nodes.filter((n: any) => n.nodeType === 'REAL') as GraphNode[];
export const DEMO_NODES = graphData.nodes.filter((n: any) => n.nodeType === 'DEMO') as GraphNode[];
export const ALL_NODES: GraphNode[] = [...REAL_NODES, ...DEMO_NODES];
export const ALL_EDGES = graphData.edges as unknown as GraphEdge[];


// ============================================================
// BFS HELPER — delegates directly to the shared graph engine
// ============================================================
import { bfsSubgraph, EngineNode, EngineEdge } from '@hopnet/shared/graph-engine';

export function getSubgraph(
  rootId: string,
  depth: number,
  includeDemo: boolean,
  allNodes: GraphNode[],
  allEdges: GraphEdge[]
): { nodes: GraphNode[]; links: GraphEdge[] } {
  const engineNodes: EngineNode[] = allNodes.map(n => ({
    id: n.id,
    kind: n.nodeType as any
  }));

  const engineEdges: EngineEdge[] = allEdges.map(e => ({
    id: e.id,
    sourceId: typeof e.source === 'string' ? e.source : e.source.id,
    targetId: typeof e.target === 'string' ? e.target : e.target.id,
    kind: e.edgeType as any,
    weight: e.weight
  }));

  // Perform BFS using the shared engine (applies correct traversal rules)
  const res = bfsSubgraph(rootId, depth, includeDemo, engineNodes, engineEdges);

  const nodes = allNodes.filter(n => res.visitedNodeIds.has(n.id));
  const links = allEdges.filter(e => res.visitedEdgeIds.has(e.id));

  return { nodes, links };
}

export function computeMeta(
  nodes: GraphNode[],
  links: GraphEdge[],
  rootNodeId: string,
  depth: number
) {
  const realNodes = nodes.filter(n => n.nodeType === 'REAL').length;
  const demoNodes = nodes.filter(n => n.nodeType === 'DEMO').length;
  const realEdges = links.filter(e => e.edgeType === 'REAL_EDGE').length;
  const demoEdges = links.filter(e => e.edgeType === 'DEMO_EDGE').length;
  const avgHopCount =
    nodes.reduce((acc, n) => acc + (n.avgPathDistance || 0), 0) / (nodes.length || 1);

  return {
    totalNodes: nodes.length,
    totalEdges: links.length,
    realNodes,
    demoNodes,
    realEdges,
    demoEdges,
    avgHopCount: Math.round(avgHopCount * 10) / 10,
    rootNodeId,
    depth,
  };
}

