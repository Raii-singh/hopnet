/**
 * HOPNet Shared Graph Engine — Public API
 * ─────────────────────────────────────────────────────────────────────────────
 * Import from this barrel in backend adapters and frontend utilities:
 *
 *   import { bfsSubgraph, dijkstra, computeScores } from '@hopnet/shared/graph-engine';
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Types
export type {
  NodeKind,
  EdgeKind,
  EngineNode,
  EngineEdge,
  BFSResult,
  DijkstraResult,
  NodeScore,
  TraversalConstraint,
} from './types';

// Constraints
export {
  collegeConstraint,
  createCollegeConstraint,
  imdbConstraint,
  pantheonConstraint,
  noConstraint,
  isTraversalAllowed,
  findConstraintViolation,
} from './constraints';

// BFS
export { bfsSubgraph } from './bfs';

// Dijkstra
export { dijkstra, reconstructPath } from './dijkstra';

// Yen's K-Shortest Paths
export type { EnginePath, YenResult } from './yen';
export { yenKShortestPaths } from './yen';

// Centrality
export type { RealEdgePredicate } from './centrality';
export { computeScores, rankNodes } from './centrality';

