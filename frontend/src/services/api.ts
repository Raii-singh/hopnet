/**
 * HOPNet API client — all calls to the Express backend.
 * Falls back to dummy data if backend is unreachable.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiNode {
  id: string;
  publicId: string;
  fullName: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  instagramHandle: string | null;
  twitterHandle: string | null;
  company: string | null;
  cluster: string | null;
  influenceScore: number;
  connectionCount: number;
  realConnections: number;
  demoConnections: number;
  tags?: string[];
  sourceConnectors?: string[];
  metadata?: any;
  nodeType: 'REAL' | 'DEMO';
  hopDistance?: number;
}

export interface ApiEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  trustScore: number;
  interactionFrequency: number;
  connectorSource: string;
  inferredFrom?: string | null;
  edgeType: 'REAL_EDGE' | 'DEMO_EDGE';
  weight: number;
}

export interface ApiGraphMeta {
  totalNodes: number;
  totalEdges: number;
  realNodes: number;
  demoNodes: number;
  realEdges: number;
  demoEdges: number;
  avgHopCount: number;
  rootNodeId: string;
  depth: number;
  constraintActive: boolean;
}

export interface ApiGraphData {
  nodes: ApiNode[];
  links: ApiEdge[];
  meta: ApiGraphMeta;
}

// ── Internal fetch with timeout ───────────────────────────────
async function apiFetch<T>(path: string, timeoutMs = 5000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal, credentials: 'include' });
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ── Graph subgraph ────────────────────────────────────────────
export async function fetchGraph(
  nodeId: string,
  depth: number,
  includeDemo: boolean,
  provider?: string
): Promise<ApiGraphData> {
  const params = new URLSearchParams({
    nodeId,
    depth: String(depth),
