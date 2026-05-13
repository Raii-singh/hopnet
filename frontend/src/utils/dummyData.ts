import { GraphNode, GraphEdge } from '@/types/graph';

// ============================================================
// REAL NODES — Actual people (cyan/blue)
// ============================================================
export const REAL_NODES: GraphNode[] = [
  {
    id: 'r-001', name: 'Aryan Singh', type: 'REAL', cluster: 'Tech',
    influenceScore: 94, connectionCount: 12, realConnections: 8, demoConnections: 4,
    centrality: 0.87, avgPathDistance: 1.4,
    bio: 'Software engineer & network builder. Core node in the HOPNet graph.',
    tags: ['Engineering', 'Startups', 'AI'],
  },
  {
    id: 'r-002', name: 'Priya Mehta', type: 'REAL', cluster: 'Tech',
    influenceScore: 78, connectionCount: 9, realConnections: 6, demoConnections: 3,
    centrality: 0.71, avgPathDistance: 1.8,
    bio: 'Product Manager at a SaaS startup. Bridges tech and business.',
    tags: ['Product', 'SaaS', 'Strategy'],
  },
  {
    id: 'r-003', name: 'Rohan Verma', type: 'REAL', cluster: 'Finance',
    influenceScore: 72, connectionCount: 8, realConnections: 5, demoConnections: 3,
    centrality: 0.63, avgPathDistance: 2.1,
    bio: 'VC analyst focused on deep-tech investments.',
    tags: ['VC', 'Finance', 'Deep Tech'],
  },
  {
    id: 'r-004', name: 'Sneha Kapoor', type: 'REAL', cluster: 'Design',
    influenceScore: 68, connectionCount: 7, realConnections: 5, demoConnections: 2,
    centrality: 0.58, avgPathDistance: 2.3,
    bio: 'UX designer building interfaces for complex data systems.',
    tags: ['Design', 'UX', 'Data Viz'],
  },
  {
    id: 'r-005', name: 'Karan Nair', type: 'REAL', cluster: 'Tech',
    influenceScore: 65, connectionCount: 6, realConnections: 4, demoConnections: 2,
    centrality: 0.52, avgPathDistance: 2.5,
    bio: 'ML engineer working on graph neural networks.',
    tags: ['ML', 'Graph AI', 'Research'],
  },
  {
    id: 'r-006', name: 'Ananya Rao', type: 'REAL', cluster: 'Academia',
    influenceScore: 61, connectionCount: 6, realConnections: 3, demoConnections: 3,
    centrality: 0.48, avgPathDistance: 2.7,
    bio: 'PhD researcher in network science and graph theory.',
    tags: ['Academia', 'Graph Theory', 'Research'],
  },
  {
    id: 'r-007', name: 'Vikram Sharma', type: 'REAL', cluster: 'Business',
    influenceScore: 59, connectionCount: 7, realConnections: 4, demoConnections: 3,
    centrality: 0.45, avgPathDistance: 2.9,
    bio: 'Founder of a B2B networking platform.',
    tags: ['Founder', 'B2B', 'Networking'],
  },
  {
    id: 'r-008', name: 'Meera Joshi', type: 'REAL', cluster: 'Marketing',
    influenceScore: 54, connectionCount: 5, realConnections: 3, demoConnections: 2,
    centrality: 0.41, avgPathDistance: 3.1,
    bio: 'Growth hacker who specializes in community-led growth.',
    tags: ['Growth', 'Marketing', 'Community'],
  },
  {
    id: 'r-009', name: 'Aditya Kumar', type: 'REAL', cluster: 'Tech',
    influenceScore: 50, connectionCount: 5, realConnections: 3, demoConnections: 2,
    centrality: 0.38, avgPathDistance: 3.3,
    bio: 'DevOps engineer and open-source contributor.',
    tags: ['DevOps', 'Open Source', 'Infrastructure'],
  },
  {
    id: 'r-010', name: 'Ishaan Malhotra', type: 'REAL', cluster: 'Finance',
    influenceScore: 47, connectionCount: 4, realConnections: 2, demoConnections: 2,
    centrality: 0.35, avgPathDistance: 3.5,
    bio: 'Fintech entrepreneur building payment infrastructure.',
    tags: ['Fintech', 'Payments', 'Startup'],
  },
  {
    id: 'r-011', name: 'Divya Patel', type: 'REAL', cluster: 'Design',
    influenceScore: 44, connectionCount: 4, realConnections: 2, demoConnections: 2,
    centrality: 0.31, avgPathDistance: 3.7,
    bio: 'Brand designer and creative director.',
    tags: ['Branding', 'Creative', 'Identity'],
  },
  {
    id: 'r-012', name: 'Rahul Bose', type: 'REAL', cluster: 'Academia',
    influenceScore: 42, connectionCount: 4, realConnections: 2, demoConnections: 2,
    centrality: 0.28, avgPathDistance: 3.9,
    bio: 'Data scientist researching social network dynamics.',
    tags: ['Data Science', 'Social Networks', 'Stats'],
  },
];

// ============================================================
// DEMO NODES — Synthetic graph expanders (grey/silver)
// ============================================================
export const DEMO_NODES: GraphNode[] = [
  {
    id: 'd-001', name: 'Alex Chen', type: 'DEMO', cluster: 'Tech',
    influenceScore: 55, connectionCount: 8, realConnections: 0, demoConnections: 8,
    centrality: 0.5, avgPathDistance: 2.2,
    bio: 'Demo node — synthetic tech cluster connector.',
    tags: ['Demo', 'Tech'],
  },
  {
    id: 'd-002', name: 'Maria Rodriguez', type: 'DEMO', cluster: 'Business',
    influenceScore: 48, connectionCount: 6, realConnections: 0, demoConnections: 6,
    centrality: 0.44, avgPathDistance: 2.6,
    bio: 'Demo node — synthetic business network hub.',
    tags: ['Demo', 'Business'],
  },
  {
    id: 'd-003', name: 'James Wright', type: 'DEMO', cluster: 'Finance',
    influenceScore: 41, connectionCount: 5, realConnections: 0, demoConnections: 5,
    centrality: 0.37, avgPathDistance: 3.0,
    bio: 'Demo node — synthetic finance cluster node.',
    tags: ['Demo', 'Finance'],
  },
  {
    id: 'd-004', name: 'Yuki Tanaka', type: 'DEMO', cluster: 'Design',
    influenceScore: 38, connectionCount: 5, realConnections: 0, demoConnections: 5,
    centrality: 0.34, avgPathDistance: 3.2,
    bio: 'Demo node — synthetic design cluster node.',
    tags: ['Demo', 'Design'],
  },
  {
    id: 'd-005', name: 'Lena Müller', type: 'DEMO', cluster: 'Academia',
    influenceScore: 35, connectionCount: 4, realConnections: 0, demoConnections: 4,
    centrality: 0.3, avgPathDistance: 3.5,
    bio: 'Demo node — synthetic academic cluster node.',
    tags: ['Demo', 'Academia'],
  },
  {
    id: 'd-006', name: 'Omar Hassan', type: 'DEMO', cluster: 'Tech',
    influenceScore: 33, connectionCount: 4, realConnections: 0, demoConnections: 4,
    centrality: 0.27, avgPathDistance: 3.7,
    bio: 'Demo node — secondary tech cluster expander.',
    tags: ['Demo', 'Tech'],
  },
  {
    id: 'd-007', name: 'Sofia Andreev', type: 'DEMO', cluster: 'Marketing',
    influenceScore: 30, connectionCount: 4, realConnections: 0, demoConnections: 4,
    centrality: 0.24, avgPathDistance: 3.9,
    bio: 'Demo node — synthetic marketing cluster node.',
    tags: ['Demo', 'Marketing'],
  },
  {
    id: 'd-008', name: 'Carlos Lima', type: 'DEMO', cluster: 'Business',
    influenceScore: 28, connectionCount: 3, realConnections: 0, demoConnections: 3,
    centrality: 0.21, avgPathDistance: 4.1,
    bio: 'Demo node — peripheral business network node.',
    tags: ['Demo', 'Business'],
  },
  {
    id: 'd-009', name: 'Nina Popova', type: 'DEMO', cluster: 'Finance',
    influenceScore: 26, connectionCount: 3, realConnections: 0, demoConnections: 3,
    centrality: 0.18, avgPathDistance: 4.3,
    bio: 'Demo node — peripheral finance cluster node.',
    tags: ['Demo', 'Finance'],
  },
  {
    id: 'd-010', name: 'Thomas Bauer', type: 'DEMO', cluster: 'Tech',
    influenceScore: 24, connectionCount: 3, realConnections: 0, demoConnections: 3,
    centrality: 0.16, avgPathDistance: 4.5,
    bio: 'Demo node — leaf tech cluster node.',
    tags: ['Demo', 'Tech'],
  },
  {
    id: 'd-011', name: 'Aiko Watanabe', type: 'DEMO', cluster: 'Academia',
    influenceScore: 22, connectionCount: 2, realConnections: 0, demoConnections: 2,
    centrality: 0.14, avgPathDistance: 4.7,
    bio: 'Demo node — leaf academic cluster node.',
    tags: ['Demo', 'Academia'],
  },
  {
    id: 'd-012', name: 'Lucas Petit', type: 'DEMO', cluster: 'Design',
    influenceScore: 20, connectionCount: 2, realConnections: 0, demoConnections: 2,
    centrality: 0.12, avgPathDistance: 4.9,
    bio: 'Demo node — leaf design cluster node.',
    tags: ['Demo', 'Design'],
  },
];

// ============================================================
// ALL NODES
// ============================================================
export const ALL_NODES: GraphNode[] = [...REAL_NODES, ...DEMO_NODES];

// ============================================================
// EDGES
// ============================================================
// REAL → REAL edges (blue)
// REAL → DEMO edges (allowed)
// DEMO → DEMO edges (grey)
// NEVER: DEMO → REAL (constraint enforced in BFS)

export const ALL_EDGES: GraphEdge[] = [
  // ── REAL ↔ REAL ──────────────────────────────────────────
  { id: 'e-001', source: 'r-001', target: 'r-002', edgeType: 'REAL_EDGE', weight: 0.92, trustScore: 0.91, interactionStrength: 0.88 },
  { id: 'e-002', source: 'r-001', target: 'r-003', edgeType: 'REAL_EDGE', weight: 0.78, trustScore: 0.75, interactionStrength: 0.72 },
  { id: 'e-003', source: 'r-001', target: 'r-004', edgeType: 'REAL_EDGE', weight: 0.85, trustScore: 0.82, interactionStrength: 0.80 },
  { id: 'e-004', source: 'r-001', target: 'r-005', edgeType: 'REAL_EDGE', weight: 0.71, trustScore: 0.68, interactionStrength: 0.65 },
  { id: 'e-005', source: 'r-002', target: 'r-004', edgeType: 'REAL_EDGE', weight: 0.67, trustScore: 0.64, interactionStrength: 0.60 },
  { id: 'e-006', source: 'r-002', target: 'r-007', edgeType: 'REAL_EDGE', weight: 0.63, trustScore: 0.60, interactionStrength: 0.57 },
  { id: 'e-007', source: 'r-003', target: 'r-010', edgeType: 'REAL_EDGE', weight: 0.74, trustScore: 0.71, interactionStrength: 0.68 },
  { id: 'e-008', source: 'r-005', target: 'r-006', edgeType: 'REAL_EDGE', weight: 0.69, trustScore: 0.66, interactionStrength: 0.63 },
  { id: 'e-009', source: 'r-006', target: 'r-012', edgeType: 'REAL_EDGE', weight: 0.58, trustScore: 0.55, interactionStrength: 0.52 },
  { id: 'e-010', source: 'r-007', target: 'r-008', edgeType: 'REAL_EDGE', weight: 0.55, trustScore: 0.52, interactionStrength: 0.49 },
  { id: 'e-011', source: 'r-008', target: 'r-009', edgeType: 'REAL_EDGE', weight: 0.51, trustScore: 0.48, interactionStrength: 0.45 },
  { id: 'e-012', source: 'r-009', target: 'r-011', edgeType: 'REAL_EDGE', weight: 0.48, trustScore: 0.45, interactionStrength: 0.42 },
  { id: 'e-013', source: 'r-004', target: 'r-011', edgeType: 'REAL_EDGE', weight: 0.62, trustScore: 0.59, interactionStrength: 0.56 },
  { id: 'e-014', source: 'r-001', target: 'r-007', edgeType: 'REAL_EDGE', weight: 0.76, trustScore: 0.73, interactionStrength: 0.70 },
  { id: 'e-015', source: 'r-003', target: 'r-007', edgeType: 'REAL_EDGE', weight: 0.60, trustScore: 0.57, interactionStrength: 0.54 },

  // ── REAL → DEMO ───────────────────────────────────────────
  { id: 'e-016', source: 'r-001', target: 'd-001', edgeType: 'DEMO_EDGE', weight: 0.45, trustScore: 0.40, interactionStrength: 0.35 },
  { id: 'e-017', source: 'r-002', target: 'd-002', edgeType: 'DEMO_EDGE', weight: 0.40, trustScore: 0.35, interactionStrength: 0.30 },
  { id: 'e-018', source: 'r-003', target: 'd-003', edgeType: 'DEMO_EDGE', weight: 0.38, trustScore: 0.33, interactionStrength: 0.28 },
  { id: 'e-019', source: 'r-004', target: 'd-004', edgeType: 'DEMO_EDGE', weight: 0.36, trustScore: 0.31, interactionStrength: 0.26 },
  { id: 'e-020', source: 'r-005', target: 'd-001', edgeType: 'DEMO_EDGE', weight: 0.35, trustScore: 0.30, interactionStrength: 0.25 },
  { id: 'e-021', source: 'r-006', target: 'd-005', edgeType: 'DEMO_EDGE', weight: 0.33, trustScore: 0.28, interactionStrength: 0.23 },
  { id: 'e-022', source: 'r-007', target: 'd-002', edgeType: 'DEMO_EDGE', weight: 0.32, trustScore: 0.27, interactionStrength: 0.22 },
  { id: 'e-023', source: 'r-008', target: 'd-007', edgeType: 'DEMO_EDGE', weight: 0.30, trustScore: 0.25, interactionStrength: 0.20 },
  { id: 'e-024', source: 'r-009', target: 'd-006', edgeType: 'DEMO_EDGE', weight: 0.28, trustScore: 0.23, interactionStrength: 0.18 },
  { id: 'e-025', source: 'r-010', target: 'd-003', edgeType: 'DEMO_EDGE', weight: 0.26, trustScore: 0.21, interactionStrength: 0.16 },
  { id: 'e-026', source: 'r-011', target: 'd-004', edgeType: 'DEMO_EDGE', weight: 0.24, trustScore: 0.19, interactionStrength: 0.14 },
  { id: 'e-027', source: 'r-012', target: 'd-005', edgeType: 'DEMO_EDGE', weight: 0.22, trustScore: 0.17, interactionStrength: 0.12 },

  // ── DEMO ↔ DEMO ───────────────────────────────────────────
  { id: 'e-028', source: 'd-001', target: 'd-006', edgeType: 'DEMO_EDGE', weight: 0.50, trustScore: 0.45, interactionStrength: 0.40 },
  { id: 'e-029', source: 'd-001', target: 'd-010', edgeType: 'DEMO_EDGE', weight: 0.42, trustScore: 0.37, interactionStrength: 0.32 },
  { id: 'e-030', source: 'd-002', target: 'd-008', edgeType: 'DEMO_EDGE', weight: 0.44, trustScore: 0.39, interactionStrength: 0.34 },
  { id: 'e-031', source: 'd-003', target: 'd-009', edgeType: 'DEMO_EDGE', weight: 0.39, trustScore: 0.34, interactionStrength: 0.29 },
  { id: 'e-032', source: 'd-004', target: 'd-012', edgeType: 'DEMO_EDGE', weight: 0.35, trustScore: 0.30, interactionStrength: 0.25 },
  { id: 'e-033', source: 'd-005', target: 'd-011', edgeType: 'DEMO_EDGE', weight: 0.32, trustScore: 0.27, interactionStrength: 0.22 },
  { id: 'e-034', source: 'd-006', target: 'd-010', edgeType: 'DEMO_EDGE', weight: 0.30, trustScore: 0.25, interactionStrength: 0.20 },
  { id: 'e-035', source: 'd-007', target: 'd-008', edgeType: 'DEMO_EDGE', weight: 0.28, trustScore: 0.23, interactionStrength: 0.18 },
  { id: 'e-036', source: 'd-009', target: 'd-003', edgeType: 'DEMO_EDGE', weight: 0.26, trustScore: 0.21, interactionStrength: 0.16 },
  { id: 'e-037', source: 'd-002', target: 'd-007', edgeType: 'DEMO_EDGE', weight: 0.24, trustScore: 0.19, interactionStrength: 0.14 },
  { id: 'e-038', source: 'd-001', target: 'd-002', edgeType: 'DEMO_EDGE', weight: 0.46, trustScore: 0.41, interactionStrength: 0.36 },
  { id: 'e-039', source: 'd-003', target: 'd-008', edgeType: 'DEMO_EDGE', weight: 0.34, trustScore: 0.29, interactionStrength: 0.24 },
];

// ============================================================
// BFS HELPER — compute reachable subgraph up to depth N
// ============================================================
export function getSubgraph(
  rootId: string,
  depth: number,
  includeDemo: boolean,
  allNodes: GraphNode[],
  allEdges: GraphEdge[]
): { nodes: GraphNode[]; links: GraphEdge[] } {
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));

  // Build adjacency list
  const adj = new Map<string, { neighborId: string; edgeId: string }[]>();
  for (const edge of allEdges) {
    const src = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const tgt = typeof edge.target === 'string' ? edge.target : edge.target.id;
    if (!adj.has(src)) adj.set(src, []);
    if (!adj.has(tgt)) adj.set(tgt, []);
    adj.get(src)!.push({ neighborId: tgt, edgeId: edge.id });
    adj.get(tgt)!.push({ neighborId: src, edgeId: edge.id });
  }

  const visitedNodes = new Set<string>();
  const visitedEdges = new Set<string>();
  const queue: { nodeId: string; hop: number }[] = [{ nodeId: rootId, hop: 0 }];

  visitedNodes.add(rootId);

  while (queue.length > 0) {
    const { nodeId, hop } = queue.shift()!;
    if (hop >= depth) continue;

    const currentNode = nodeMap.get(nodeId);
    if (!currentNode) continue;

    const neighbors = adj.get(nodeId) || [];
    for (const { neighborId, edgeId } of neighbors) {
      const neighborNode = nodeMap.get(neighborId);
      if (!neighborNode) continue;

      // Enforce REAL→DEMO→REAL constraint: DEMO node cannot connect to REAL
      if (currentNode.type === 'DEMO' && neighborNode.type === 'REAL') continue;

      // Optionally exclude DEMO nodes
      if (!includeDemo && neighborNode.type === 'DEMO') continue;

      visitedEdges.add(edgeId);

      if (!visitedNodes.has(neighborId)) {
        visitedNodes.add(neighborId);
        queue.push({ nodeId: neighborId, hop: hop + 1 });
      }
    }
  }

  const nodes = allNodes.filter(n => visitedNodes.has(n.id));
  const links = allEdges.filter(e => visitedEdges.has(e.id));

  return { nodes, links };
}

export function computeMeta(
  nodes: GraphNode[],
  links: GraphEdge[],
  rootNodeId: string,
  depth: number
) {
  const realNodes = nodes.filter(n => n.type === 'REAL').length;
  const demoNodes = nodes.filter(n => n.type === 'DEMO').length;
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
