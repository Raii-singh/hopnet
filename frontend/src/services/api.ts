/**
 * HOPNet API client — all calls to the Express backend.
 * Falls back to dummy data if backend is unreachable.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiNode {
  id: string;
  name: string;
  type: 'REAL' | 'DEMO';
  cluster: string | null;
  influenceScore: number;
  connectionCount: number;
  realConnections: number;
  demoConnections: number;
  hopDistance?: number;
}

export interface ApiEdge {
  id: string;
  source: string;
  target: string;
  edgeType: 'REAL_EDGE' | 'DEMO_EDGE';
  weight: number;
  trustScore: number;
  interactionStrength: number;
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
    const res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
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
  includeDemo: boolean
): Promise<ApiGraphData> {
  const params = new URLSearchParams({
    nodeId,
    depth: String(depth),
    includeDemo: String(includeDemo),
  });
  return apiFetch<ApiGraphData>(`/graph?${params}`);
}

// ── Single node ───────────────────────────────────────────────
export async function fetchNode(id: string): Promise<ApiNode> {
  return apiFetch<ApiNode>(`/graph/node/${id}`);
}

// ── All users ─────────────────────────────────────────────────
export async function fetchUsers(): Promise<{ users: ApiNode[]; total: number }> {
  return apiFetch<{ users: ApiNode[]; total: number }>('/users');
}

// ── Rankings ──────────────────────────────────────────────────
export async function fetchRankings(): Promise<{
  rankings: (ApiNode & { rankScore: number; rank: number })[];
  total: number;
}> {
  return apiFetch('/users/rankings');
}

// ── Shortest path ─────────────────────────────────────────────
export async function fetchPath(
  fromId: string,
  toId: string
): Promise<{ path: string[]; totalCost: number } | null> {
  try {
    return await apiFetch(`/graph/path?from=${fromId}&to=${toId}`);
  } catch {
    return null;
  }
}

// ── Health check ──────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try {
    await apiFetch<{ status: string }>('/health', 2000);
    return true;
  } catch {
    return false;
  }
}
