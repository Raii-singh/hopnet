import { GraphNode, GraphEdge } from '@/types/graph';

// ============================================================
// REAL NODES — Actual people (cyan/blue)
// ============================================================
export const REAL_NODES: GraphNode[] = [
  {
    id: 'r-001', publicId: 'HNP-000001', fullName: 'Aryan Singh', nodeType: 'REAL', cluster: 'Tech',
    influenceScore: 94, connectionCount: 12, realConnections: 8, demoConnections: 4,
    centrality: 0.87, avgPathDistance: 1.4,
    company: 'HOPNet Technologies',
    tags: ['Engineering', 'Startups', 'AI'],
    linkedinUrl: 'https://linkedin.com/in/aryan-singh-dev',
    twitterHandle: '@aryan_dev',
    sourceConnectors: ['LinkedIn', 'Manual'],
  },
  {
    id: 'r-002', publicId: 'HNP-000002', fullName: 'Priya Mehta', nodeType: 'REAL', cluster: 'Tech',
    influenceScore: 78, connectionCount: 9, realConnections: 6, demoConnections: 3,
    centrality: 0.71, avgPathDistance: 1.8,
    company: 'Nexus AI',
    tags: ['Product', 'SaaS', 'Strategy'],
    linkedinUrl: 'https://linkedin.com/in/priyamehta',
    twitterHandle: '@priya_ml',
    sourceConnectors: ['LinkedIn'],
  },
  {
    id: 'r-003', publicId: 'HNP-000003', fullName: 'Rohan Verma', nodeType: 'REAL', cluster: 'Finance',
    influenceScore: 72, connectionCount: 8, realConnections: 5, demoConnections: 3,
    centrality: 0.63, avgPathDistance: 2.1,
    company: 'Vertex Capital',
    tags: ['VC', 'Finance', 'Deep Tech'],
    linkedinUrl: 'https://linkedin.com/in/rohanverma',
    twitterHandle: '@rohan_vc',
    sourceConnectors: ['Manual'],
  },
  {
    id: 'r-004', publicId: 'HNP-000004', fullName: 'Sneha Kapoor', nodeType: 'REAL', cluster: 'Design',
    influenceScore: 68, connectionCount: 7, realConnections: 5, demoConnections: 2,
    centrality: 0.58, avgPathDistance: 2.3,
    company: 'Deco Creative',
    tags: ['Design', 'UX', 'Data Viz'],
    linkedinUrl: 'https://linkedin.com/in/snehakapoor',
    twitterHandle: '@sneha_ux',
    sourceConnectors: ['LinkedIn'],
  },
  {
    id: 'r-005', publicId: 'HNP-000005', fullName: 'Karan Nair', nodeType: 'REAL', cluster: 'Tech',
    influenceScore: 65, connectionCount: 6, realConnections: 4, demoConnections: 2,
    centrality: 0.52, avgPathDistance: 2.5,
    company: 'CyberSafe',
    tags: ['ML', 'Graph AI', 'Research'],
    linkedinUrl: 'https://linkedin.com/in/karannair',
    twitterHandle: '@karan_sec',
    sourceConnectors: ['Manual'],
  },
  {
    id: 'r-006', publicId: 'HNP-000006', fullName: 'Ananya Rao', nodeType: 'REAL', cluster: 'Academia',
    influenceScore: 61, connectionCount: 6, realConnections: 3, demoConnections: 3,
    centrality: 0.48, avgPathDistance: 2.7,
    company: 'Stanford University',
    tags: ['Academia', 'Graph Theory', 'Research'],
    linkedinUrl: 'https://linkedin.com/in/ananyarao',
    twitterHandle: '@ananya_research',
    sourceConnectors: ['LinkedIn'],
  },
  {
    id: 'r-007', publicId: 'HNP-000007', fullName: 'Vikram Sharma', nodeType: 'REAL', cluster: 'Business',
    influenceScore: 59, connectionCount: 7, realConnections: 4, demoConnections: 3,
    centrality: 0.45, avgPathDistance: 2.9,
    company: 'ScaleUp Ventures',
    tags: ['Founder', 'B2B', 'Networking'],
    linkedinUrl: 'https://linkedin.com/in/vikramsharma',
    twitterHandle: '@vikram_biz',
    sourceConnectors: ['LinkedIn'],
  },
  {
    id: 'r-008', publicId: 'HNP-000008', fullName: 'Meera Joshi', nodeType: 'REAL', cluster: 'Marketing',
    influenceScore: 54, connectionCount: 5, realConnections: 3, demoConnections: 2,
    centrality: 0.41, avgPathDistance: 3.1,
    company: 'AdGlow Digital',
    tags: ['Growth', 'Marketing', 'Community'],
    linkedinUrl: 'https://linkedin.com/in/meerajoshi',
    twitterHandle: '@meera_mktg',
    sourceConnectors: ['LinkedIn'],
  },
  {
    id: 'r-009', publicId: 'HNP-000009', fullName: 'Aditya Kumar', nodeType: 'REAL', cluster: 'Tech',
    influenceScore: 50, connectionCount: 5, realConnections: 3, demoConnections: 2,
    centrality: 0.38, avgPathDistance: 3.3,
    company: 'HOPNet Technologies',
    tags: ['DevOps', 'Open Source', 'Infrastructure'],
    linkedinUrl: 'https://linkedin.com/in/adityakumar',
    twitterHandle: '@aditya_pg',
    sourceConnectors: ['LinkedIn'],
  },
  {
    id: 'r-010', publicId: 'HNP-000010', fullName: 'Ishaan Malhotra', nodeType: 'REAL', cluster: 'Finance',
    influenceScore: 47, connectionCount: 4, realConnections: 2, demoConnections: 2,
    centrality: 0.35, avgPathDistance: 3.5,
    company: 'Alpha Trading Group',
    tags: ['Fintech', 'Payments', 'Startup'],
    linkedinUrl: 'https://linkedin.com/in/ishaanmalhotra',
    twitterHandle: '@ishaan_quant',
    sourceConnectors: ['Manual'],
  },
  {
    id: 'r-011', publicId: 'HNP-000011', fullName: 'Divya Patel', nodeType: 'REAL', cluster: 'Design',
    influenceScore: 44, connectionCount: 4, realConnections: 2, demoConnections: 2,
    centrality: 0.31, avgPathDistance: 3.7,
    company: 'Deco Creative',
    tags: ['Branding', 'Creative', 'Identity'],
    linkedinUrl: 'https://linkedin.com/in/divyapatel',
    twitterHandle: '@divya_ui',
    sourceConnectors: ['LinkedIn'],
  },
  {
    id: 'r-012', publicId: 'HNP-000012', fullName: 'Rahul Bose', nodeType: 'REAL', cluster: 'Academia',
    influenceScore: 42, connectionCount: 4, realConnections: 2, demoConnections: 2,
    centrality: 0.28, avgPathDistance: 3.9,
    company: 'IIT Bombay',
    tags: ['Data Science', 'Social Networks', 'Stats'],
    linkedinUrl: 'https://linkedin.com/in/rahulbose',
    twitterHandle: '@rahul_math',
    sourceConnectors: ['LinkedIn'],
  },
];

// ============================================================
// DEMO NODES — Synthetic graph expanders (grey/silver)
// ============================================================
export const DEMO_NODES: GraphNode[] = [
  {
    id: 'd-001', publicId: 'DNP-000091', fullName: 'Alex Chen', nodeType: 'DEMO', cluster: 'Tech',
    influenceScore: 55, connectionCount: 8, realConnections: 0, demoConnections: 8,
    centrality: 0.5, avgPathDistance: 2.2,
    company: 'SynthCorp Demo',
    tags: ['Demo', 'Tech'],
    sourceConnectors: ['DemoGenerator'],
  },
  {
    id: 'd-002', publicId: 'DNP-000092', fullName: 'Maria Rodriguez', nodeType: 'DEMO', cluster: 'Business',
    influenceScore: 48, connectionCount: 6, realConnections: 0, demoConnections: 6,
    centrality: 0.44, avgPathDistance: 2.6,
    company: 'Global Solutions',
    tags: ['Demo', 'Business'],
    sourceConnectors: ['DemoGenerator'],
  },
  {
    id: 'd-003', publicId: 'DNP-000093', fullName: 'James Wright', nodeType: 'DEMO', cluster: 'Finance',
    influenceScore: 41, connectionCount: 5, realConnections: 0, demoConnections: 5,
    centrality: 0.37, avgPathDistance: 3.0,
    company: 'Delta Assets',
    tags: ['Demo', 'Finance'],
    sourceConnectors: ['DemoGenerator'],
  },
  {
    id: 'd-004', publicId: 'DNP-000094', fullName: 'Yuki Tanaka', nodeType: 'DEMO', cluster: 'Design',
    influenceScore: 38, connectionCount: 5, realConnections: 0, demoConnections: 5,
    centrality: 0.34, avgPathDistance: 3.2,
    company: 'Pixel Craft',
    tags: ['Demo', 'Design'],
    sourceConnectors: ['DemoGenerator'],
  },
  {
    id: 'd-005', publicId: 'DNP-000095', fullName: 'Lena Müller', nodeType: 'DEMO', cluster: 'Academia',
    influenceScore: 35, connectionCount: 4, realConnections: 0, demoConnections: 4,
    centrality: 0.3, avgPathDistance: 3.5,
    company: 'Munich Science',
    tags: ['Demo', 'Academia'],
    sourceConnectors: ['DemoGenerator'],
  },
  {
    id: 'd-006', publicId: 'DNP-000096', fullName: 'Omar Hassan', nodeType: 'DEMO', cluster: 'Tech',
    influenceScore: 33, connectionCount: 4, realConnections: 0, demoConnections: 4,
    centrality: 0.27, avgPathDistance: 3.7,
    company: 'Middle East Tech',
    tags: ['Demo', 'Tech'],
    sourceConnectors: ['DemoGenerator'],
  },
  {
    id: 'd-007', publicId: 'DNP-000097', fullName: 'Sofia Andreev', nodeType: 'DEMO', cluster: 'Marketing',
    influenceScore: 30, connectionCount: 4, realConnections: 0, demoConnections: 4,
    centrality: 0.24, avgPathDistance: 3.9,
    company: 'MediaSphere',
    tags: ['Demo', 'Marketing'],
    sourceConnectors: ['DemoGenerator'],
  },
  {
    id: 'd-008', publicId: 'DNP-000098', fullName: 'Carlos Lima', nodeType: 'DEMO', cluster: 'Business',
    influenceScore: 28, connectionCount: 3, realConnections: 0, demoConnections: 3,
    centrality: 0.21, avgPathDistance: 4.1,
    company: 'LatAm Partners',
    tags: ['Demo', 'Business'],
    sourceConnectors: ['DemoGenerator'],
  },
  {
    id: 'd-009', publicId: 'DNP-000099', fullName: 'Nina Popova', nodeType: 'DEMO', cluster: 'Finance',
    influenceScore: 26, connectionCount: 3, realConnections: 0, demoConnections: 3,
    centrality: 0.18, avgPathDistance: 4.3,
    company: 'Neva Capital',
    tags: ['Demo', 'Finance'],
    sourceConnectors: ['DemoGenerator'],
  },
  {
    id: 'd-010', publicId: 'DNP-000100', fullName: 'Thomas Bauer', nodeType: 'DEMO', cluster: 'Tech',
    influenceScore: 24, connectionCount: 3, realConnections: 0, demoConnections: 3,
    centrality: 0.16, avgPathDistance: 4.5,
    company: 'Munich Science',
    tags: ['Demo', 'Tech'],
    sourceConnectors: ['DemoGenerator'],
  },
  {
    id: 'd-011', publicId: 'DNP-000101', fullName: 'Aiko Watanabe', nodeType: 'DEMO', cluster: 'Academia',
    influenceScore: 22, connectionCount: 2, realConnections: 0, demoConnections: 2,
    centrality: 0.14, avgPathDistance: 4.7,
    company: 'Tokyo Graph Lab',
    tags: ['Demo', 'Academia'],
    sourceConnectors: ['DemoGenerator'],
  },
  {
    id: 'd-012', publicId: 'DNP-000102', fullName: 'Lucas Petit', nodeType: 'DEMO', cluster: 'Design',
    influenceScore: 20, connectionCount: 2, realConnections: 0, demoConnections: 2,
    centrality: 0.12, avgPathDistance: 4.9,
    company: 'Parisian Design',
    tags: ['Demo', 'Design'],
    sourceConnectors: ['DemoGenerator'],
  },
];

// ============================================================
// ALL NODES
// ============================================================
export const ALL_NODES: GraphNode[] = [...REAL_NODES, ...DEMO_NODES];

// ============================================================
// EDGES
// ============================================================
export const ALL_EDGES: GraphEdge[] = [
  // ── REAL ↔ REAL ──────────────────────────────────────────
  { id: 'e-001', source: 'r-001', target: 'r-002', edgeType: 'REAL_EDGE', weight: 0.92, trustScore: 0.95, interactionFrequency: 0.88, relationshipType: 'cofounder', connectorSource: 'LinkedIn' },
  { id: 'e-002', source: 'r-001', target: 'r-003', edgeType: 'REAL_EDGE', weight: 0.78, trustScore: 0.85, interactionFrequency: 0.68, relationshipType: 'advisor', connectorSource: 'Manual' },
  { id: 'e-003', source: 'r-001', target: 'r-004', edgeType: 'REAL_EDGE', weight: 0.85, trustScore: 0.88, interactionFrequency: 0.80, relationshipType: 'colleague', connectorSource: 'LinkedIn' },
  { id: 'e-004', source: 'r-001', target: 'r-005', edgeType: 'REAL_EDGE', weight: 0.71, trustScore: 0.75, interactionFrequency: 0.65, relationshipType: 'friend', connectorSource: 'Manual' },
  { id: 'e-005', source: 'r-002', target: 'r-004', edgeType: 'REAL_EDGE', weight: 0.67, trustScore: 0.70, interactionFrequency: 0.62, relationshipType: 'friend', connectorSource: 'LinkedIn' },
  { id: 'e-006', source: 'r-002', target: 'r-007', edgeType: 'REAL_EDGE', weight: 0.63, trustScore: 0.72, interactionFrequency: 0.50, relationshipType: 'colleague', connectorSource: 'LinkedIn' },
  { id: 'e-007', source: 'r-003', target: 'r-010', edgeType: 'REAL_EDGE', weight: 0.74, trustScore: 0.88, interactionFrequency: 0.53, relationshipType: 'investor', connectorSource: 'Manual' },
  { id: 'e-008', source: 'r-005', target: 'r-006', edgeType: 'REAL_EDGE', weight: 0.69, trustScore: 0.80, interactionFrequency: 0.52, relationshipType: 'advisor', connectorSource: 'Manual' },
  { id: 'e-009', source: 'r-006', target: 'r-012', edgeType: 'REAL_EDGE', weight: 0.58, trustScore: 0.70, interactionFrequency: 0.40, relationshipType: 'partner', connectorSource: 'LinkedIn' },
  { id: 'e-010', source: 'r-007', target: 'r-008', edgeType: 'REAL_EDGE', weight: 0.55, trustScore: 0.62, interactionFrequency: 0.45, relationshipType: 'friend', connectorSource: 'Manual' },
  { id: 'e-011', source: 'r-008', target: 'r-009', edgeType: 'REAL_EDGE', weight: 0.51, trustScore: 0.65, interactionFrequency: 0.30, relationshipType: 'colleague', connectorSource: 'LinkedIn' },
  { id: 'e-012', source: 'r-009', target: 'r-011', edgeType: 'REAL_EDGE', weight: 0.48, trustScore: 0.55, interactionFrequency: 0.38, relationshipType: 'partner', connectorSource: 'LinkedIn' },
  { id: 'e-013', source: 'r-004', target: 'r-011', edgeType: 'REAL_EDGE', weight: 0.62, trustScore: 0.70, interactionFrequency: 0.50, relationshipType: 'colleague', connectorSource: 'LinkedIn' },
  { id: 'e-014', source: 'r-001', target: 'r-007', edgeType: 'REAL_EDGE', weight: 0.76, trustScore: 0.80, interactionFrequency: 0.70, relationshipType: 'partner', connectorSource: 'LinkedIn' },
  { id: 'e-015', source: 'r-003', target: 'r-007', edgeType: 'REAL_EDGE', weight: 0.60, trustScore: 0.70, interactionFrequency: 0.45, relationshipType: 'partner', connectorSource: 'LinkedIn' },

  // ── REAL → DEMO ───────────────────────────────────────────
  { id: 'e-016', source: 'r-001', target: 'd-001', edgeType: 'DEMO_EDGE', weight: 0.45, trustScore: 0.50, interactionFrequency: 0.38, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },
  { id: 'e-017', source: 'r-002', target: 'd-002', edgeType: 'DEMO_EDGE', weight: 0.40, trustScore: 0.45, interactionFrequency: 0.32, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },
  { id: 'e-018', source: 'r-003', target: 'd-003', edgeType: 'DEMO_EDGE', weight: 0.38, trustScore: 0.48, interactionFrequency: 0.23, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },
  { id: 'e-019', source: 'r-004', target: 'd-004', edgeType: 'DEMO_EDGE', weight: 0.36, trustScore: 0.40, interactionFrequency: 0.30, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },
  { id: 'e-020', source: 'r-005', target: 'd-001', edgeType: 'DEMO_EDGE', weight: 0.35, trustScore: 0.52, interactionFrequency: 0.10, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },
  { id: 'e-021', source: 'r-006', target: 'd-005', edgeType: 'DEMO_EDGE', weight: 0.33, trustScore: 0.42, interactionFrequency: 0.20, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },
  { id: 'e-022', source: 'r-007', target: 'd-002', edgeType: 'DEMO_EDGE', weight: 0.32, trustScore: 0.40, interactionFrequency: 0.20, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },
  { id: 'e-023', source: 'r-008', target: 'd-007', edgeType: 'DEMO_EDGE', weight: 0.30, trustScore: 0.38, interactionFrequency: 0.18, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },
  { id: 'e-024', source: 'r-009', target: 'd-006', edgeType: 'DEMO_EDGE', weight: 0.28, trustScore: 0.35, interactionFrequency: 0.18, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },
  { id: 'e-025', source: 'r-010', target: 'd-003', edgeType: 'DEMO_EDGE', weight: 0.26, trustScore: 0.45, interactionFrequency: 0.05, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },
  { id: 'e-026', source: 'r-011', target: 'd-004', edgeType: 'DEMO_EDGE', weight: 0.24, trustScore: 0.40, interactionFrequency: 0.00, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },
  { id: 'e-027', source: 'r-012', target: 'd-005', edgeType: 'DEMO_EDGE', weight: 0.22, trustScore: 0.38, interactionFrequency: 0.00, relationshipType: 'acquaintance', connectorSource: 'DemoGenerator' },

  // ── DEMO ↔ DEMO ───────────────────────────────────────────
  { id: 'e-028', source: 'd-001', target: 'd-006', edgeType: 'DEMO_EDGE', weight: 0.50, trustScore: 0.55, interactionFrequency: 0.42, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
  { id: 'e-029', source: 'd-001', target: 'd-010', edgeType: 'DEMO_EDGE', weight: 0.42, trustScore: 0.48, interactionFrequency: 0.33, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
  { id: 'e-030', source: 'd-002', target: 'd-008', edgeType: 'DEMO_EDGE', weight: 0.44, trustScore: 0.46, interactionFrequency: 0.41, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
  { id: 'e-031', source: 'd-003', target: 'd-009', edgeType: 'DEMO_EDGE', weight: 0.39, trustScore: 0.52, interactionFrequency: 0.20, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
  { id: 'e-032', source: 'd-004', target: 'd-012', edgeType: 'DEMO_EDGE', weight: 0.35, trustScore: 0.48, interactionFrequency: 0.16, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
  { id: 'e-033', source: 'd-005', target: 'd-011', edgeType: 'DEMO_EDGE', weight: 0.32, trustScore: 0.44, interactionFrequency: 0.14, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
  { id: 'e-034', source: 'd-006', target: 'd-010', edgeType: 'DEMO_EDGE', weight: 0.30, trustScore: 0.42, interactionFrequency: 0.12, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
  { id: 'e-035', source: 'd-007', target: 'd-008', edgeType: 'DEMO_EDGE', weight: 0.28, trustScore: 0.38, interactionFrequency: 0.13, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
  { id: 'e-036', source: 'd-009', target: 'd-003', edgeType: 'DEMO_EDGE', weight: 0.26, trustScore: 0.40, interactionFrequency: 0.05, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
  { id: 'e-037', source: 'd-002', target: 'd-007', edgeType: 'DEMO_EDGE', weight: 0.24, trustScore: 0.38, interactionFrequency: 0.03, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
  { id: 'e-038', source: 'd-001', target: 'd-002', edgeType: 'DEMO_EDGE', weight: 0.46, trustScore: 0.50, interactionFrequency: 0.40, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
  { id: 'e-039', source: 'd-003', target: 'd-008', edgeType: 'DEMO_EDGE', weight: 0.34, trustScore: 0.45, interactionFrequency: 0.18, relationshipType: 'synthetic', connectorSource: 'DemoGenerator' },
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
      if (currentNode.nodeType === 'DEMO' && neighborNode.nodeType === 'REAL') continue;

      // Optionally exclude DEMO nodes
      if (!includeDemo && neighborNode.nodeType === 'DEMO') continue;

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
