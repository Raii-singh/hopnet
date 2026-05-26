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

// ── User profile by public ID ─────────────────────────────────
export async function fetchUserProfile(publicId: string): Promise<ApiNode> {
  return apiFetch<ApiNode>(`/users/profile/${publicId}`);
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

// ── WORKSPACE: User Node CRUD ──────────────────────────────────
export async function createUserNode(data: any): Promise<ApiNode> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to create user node');
  }
  return res.json();
}

export async function updateUserNode(id: string, data: any): Promise<ApiNode> {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to update user node');
  }
  return res.json();
}

export async function deleteUserNode(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to delete user node');
  }
  return res.json();
}

// ── WORKSPACE: Edge Relationship CRUD ──────────────────────────
export async function createRelationship(data: any): Promise<ApiEdge> {
  const res = await fetch(`${BASE_URL}/graph/edge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to create connection');
  }
  return res.json();
}

export async function updateRelationship(id: string, data: any): Promise<ApiEdge> {
  const res = await fetch(`${BASE_URL}/graph/edge/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to update connection');
  }
  return res.json();
}

export async function deleteRelationship(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/graph/edge/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to delete connection');
  }
  return res.json();
}

// ── WORKSPACE: Duplicate Suggestions & Merges ──────────────────
export async function fetchDuplicates(): Promise<{ suggestions: any[] }> {
  return apiFetch<{ suggestions: any[] }>('/users/duplicates');
}

export async function mergeIdentities(sourceId: string, targetId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/users/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, targetId }),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to merge users');
  }
  return res.json();
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

// ── CONNECTORS: Import Integrations (V2.5) ────────────────────
export interface ApiImportLog {
  id: string;
  connectorSource: string;
  filename: string;
  status: string;
  nodesCreated: number;
  edgesCreated: number;
  inferredEdgesCount: number;
  confidenceScore: number;
  importLogs: string[];
  createdAt: string;
}

export async function fetchImportHistory(): Promise<{ logs: ApiImportLog[] }> {
  return apiFetch<{ logs: ApiImportLog[] }>('/connectors/history');
}

export async function previewConnectorImport(connectorType: string, rawText: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/connectors/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectorType, rawText }),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to parse import preview data.');
  }
  return res.json();
}

export async function finalizeConnectorIngest(connectorType: string, filename: string, previewData: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/connectors/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectorType, filename, previewData }),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to ingest data to database.');
  }
  return res.json();
}

