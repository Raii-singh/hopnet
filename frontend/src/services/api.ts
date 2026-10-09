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
    return await apiFetch(`/v2/graph/path?from=${fromId}&to=${toId}`);
  } catch {
    return null;
  }
}

// ── WORKSPACE: User Node CRUD ──────────────────────────────────
export async function createUserNode(data: any): Promise<ApiNode> {
  const res = await fetch(`${BASE_URL}/v2/persons`, {
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
  const res = await fetch(`${BASE_URL}/v2/persons/${id}`, {
    method: 'PATCH',
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
  const res = await fetch(`${BASE_URL}/v2/persons/${id}`, {
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
  const res = await fetch(`${BASE_URL}/v2/relationships`, {
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
  const res = await fetch(`${BASE_URL}/v2/relationships/${id}`, {
    method: 'PATCH',
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
  const res = await fetch(`${BASE_URL}/v2/relationships/${id}`, {
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
  return apiFetch<{ suggestions: any[] }>('/v2/persons/duplicates/all');
}

export async function mergeIdentities(sourceId: string, targetId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/v2/persons/merge`, {
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

export async function fetchImdbGraph(): Promise<ApiGraphData> {
  const loadOfflineFallback = (): ApiGraphData => {
    return {
      nodes: [],
      links: [],
      meta: {
        totalNodes: 0,
        totalEdges: 0,
        realNodes: 0,
        demoNodes: 0,
        realEdges: 0,
        demoEdges: 0,
        avgHopCount: 0,
        rootNodeId: '',
        depth: 0,
        constraintActive: false,
      },
    };
  };

  try {
    const data = await apiFetch<{ nodes: ApiNode[]; links: ApiEdge[] }>('/imdb/graph');
    if (!data || !data.nodes || data.nodes.length === 0) {
      console.warn('[API] Backend returned empty IMDb graph — using offline demo data');
      return loadOfflineFallback();
    }

    const realNodes = data.nodes.filter(n => n.nodeType === 'REAL').length;
    const demoNodes = data.nodes.filter(n => n.nodeType === 'DEMO').length;
    const realEdges = data.links.filter(e => e.edgeType === 'REAL_EDGE').length;
    const demoEdges = data.links.filter(e => e.edgeType === 'DEMO_EDGE').length;

    return {
      nodes: data.nodes,
      links: data.links,
      meta: {
        totalNodes: data.nodes.length,
        totalEdges: data.links.length,
        realNodes,
        demoNodes,
        realEdges,
        demoEdges,
        avgHopCount: 2.4,
        rootNodeId: data.nodes[0]?.id || '',
        depth: 3,
        constraintActive: false,
      },
    };
  } catch (error) {
    console.warn('[API] Failed to fetch IMDb graph from backend — using offline demo data:', error);
    return loadOfflineFallback();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HOPNet v2 API Client (Step 14)
// ═══════════════════════════════════════════════════════════════════════════
//
// These functions call the v2 Neo4j-backed API (/api/v2/*).
// They are the PRIMARY data path for the College graph provider.
//
// MIGRATION NOTE:
//   v1 functions above (fetchGraph, fetchUsers, etc.) are a TEMPORARY migration
//   safety net. They exist only during the transition from Prisma → Neo4j.
//   Once the v2 path is validated in production:
//     - Remove v1 fallback from graphStore.initGraph
//     - Delete v1 functions from this file (or keep only for legacy routes)
//   Do NOT add new product features to the v1 client.
//
// DATA PRIORITY ORDER (enforced in graphStore):
//   1. v2 / Neo4j  ← primary
//   2. dummy       ← offline fallback
//   3. v1 / Prisma ← temporary migration safety net (to be removed)
//
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL_V2 = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api') + '/v2';

async function apiFetchV2<T>(path: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL_V2}${path}`, { signal: controller.signal, credentials: 'include' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message ?? `v2 API ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ── v2 API type definitions ───────────────────────────────────────────────

/**
 * v2 person node shape from the Neo4j backend.
 * Extends ApiNode with v2-specific fields.
 */
export interface ApiNodeV2 {
  id: string;
  publicId: string;
  fullName: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  instagramHandle?: string | null;
  twitterHandle?: string | null;
  company?: string | null;
  cluster?: string | null;
  influenceScore?: number;
  connectionCount?: number;
  realConnections?: number;
  demoConnections?: number;
  tags?: string[];
  sourceConnectors?: string[];
  metadata?: any;
  nodeType: 'REAL' | 'DEMO';
  hopDistance?: number;
  // v2-specific
  subgraphDegree?: number;
  globalConnectionCount?: number;
}

/**
 * v2 graph edge. Uses `edgeKind` (NOT edgeType).
 * The v1 ApiEdge uses `edgeType` — kept for v1 compatibility.
 */
export interface ApiEdgeV2 {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  trustScore: number;
  interactionFrequency: number;
  connectorSource: string;
  inferredFrom?: string | null;
  edgeKind: 'REAL_EDGE' | 'DEMO_EDGE';   // ← v2 field name
  weight: number;
}

export interface ApiGraphMetaV2 {
  centerId: string;
  depth: number;
  totalNodes: number;
  totalEdges: number;
  realNodes: number;
  demoNodes: number;
  realEdges: number;
  demoEdges: number;
  avgHopCount: number;
  constraintActive: boolean;
}

export interface ApiGraphDataV2 {
  nodes: ApiNodeV2[];
  links: ApiEdgeV2[];
  meta: ApiGraphMetaV2;
}

export interface ApiSearchResultV2 {
  data: ApiNodeV2[];
  count: number;
}

export interface ApiPathNodeV2 extends ApiNodeV2 {
  hopDistance: number;
}

export interface ApiPathItemV2 {
  nodeIds: string[];
  nodes: ApiPathNodeV2[];
  links: ApiEdgeV2[];
  totalCost: number;
}

export interface ApiPathResponseV2 {
  exists: boolean;
  path: {
    nodeIds: string[];
    nodes: ApiPathNodeV2[];
    links: ApiEdgeV2[];
  } | null;
  paths: ApiPathItemV2[];
  totalCost: number | null;
  hasMore: boolean;
}

// ── v2 health check ───────────────────────────────────────────────────────

/**
 * Returns true if the v2 API is reachable and Neo4j is connected.
 * Used by graphStore.initGraph to decide which data path to activate.
 */
export async function checkHealthV2(): Promise<boolean> {
  try {
    const result = await apiFetchV2<{ status: string }>('/health', 3000);
    return result?.status === 'ok';
  } catch {
    return false;
  }
}

// ── v2 graph subgraph ─────────────────────────────────────────────────────

/**
 * Fetch an N-hop subgraph centered on `centerId` from Neo4j.
 *
 * This is the PRIMARY graph-loading function for the College provider.
 * Applies HOPNet traversal constraints (collegeConstraint: DEMO→REAL blocked).
 *
 * @param centerId    UUID of the center node
 * @param depth       Hop depth (1–6, clamped server-side)
 * @param includeDemo Whether to include DEMO nodes in the traversal
 */
export async function fetchGraphV2(
  centerId: string,
  depth: number,
  includeDemo: boolean,
  filters?: { types: string[]; minTrust: number }
): Promise<ApiGraphDataV2> {
  const params = new URLSearchParams({
    centerId,
    depth: String(depth),
    includeDemo: String(includeDemo),
  });
  if (filters?.types && filters.types.length > 0) {
    params.set('types', filters.types.join(','));
  }
  if (filters?.minTrust !== undefined) {
    params.set('minTrust', String(filters.minTrust));
  }
  return apiFetchV2<ApiGraphDataV2>(`/graph?${params}`);
}

// ── v2 search and collection ────────────────────────────────────────────────
/**
 * Fetch a list of persons (REAL and DEMO).
 * Used for populating the Universal Database.
 */
export async function fetchPersonsV2(limit = 500, skip = 0): Promise<ApiSearchResultV2> {
  const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
  return apiFetchV2<ApiSearchResultV2>(`/persons?${params}`);
}

/**
 * Server-side search for Person nodes by name / email / username / company.
 * Replaces the client-side allNodes filter used in v1 mode.
 *
 * Returns up to `limit` results (default 10).
 */
export async function searchPersonsV2(
  query: string,
  limit = 10
): Promise<ApiSearchResultV2> {
  if (!query.trim()) return { data: [], count: 0 };
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return apiFetchV2<ApiSearchResultV2>(`/persons/search?${params}`);
}

// ── v2 single node ────────────────────────────────────────────────────────

/**
 * Fetch the graph-node profile for a single person (with subgraph stats).
 * Returns the center-view of the node (hopDistance=0, globalConnectionCount).
 */
export async function fetchNodeV2(id: string): Promise<ApiNodeV2> {
  return apiFetchV2<ApiNodeV2>(`/graph/node/${id}`);
}

// ── v2 path query ─────────────────────────────────────────────────────────

/**
 * Find the constrained shortest path between two nodes.
 *
 * Uses the same HOPNet traversal constraint as fetchGraphV2.
 * A physically existing path that violates REAL/DEMO rules is NOT returned.
 *
 * totalCost = Dijkstra friction cost = sum(1 - weight) per edge.
 *             Lower = stronger / more-trusted path.
 *             NOT a simple hop count.
 *
 * @param from        UUID of start node
 * @param to          UUID of end node
 * @param maxDepth    Max search depth (1–6, clamped server-side, default 6)
 * @param includeDemo Whether DEMO nodes may be traversed (default true)
 */
export async function fetchPathV2(
  from: string,
  to: string,
  maxDepth = 6,
  includeDemo = true,
  filters?: { types?: string[]; minTrust?: number; exclude?: string[] },
  k = 3,
  offset = 0
): Promise<ApiPathResponseV2> {
  const params = new URLSearchParams({
    from,
    to,
    maxDepth: String(maxDepth),
    includeDemo: String(includeDemo),
    k: String(k),
    offset: String(offset),
  });
  if (filters?.types && filters.types.length > 0) {
    params.set('types', filters.types.join(','));
  }
  if (filters?.minTrust !== undefined) {
    params.set('minTrust', String(filters.minTrust));
  }
  if (filters?.exclude && filters.exclude.length > 0) {
    params.set('exclude', filters.exclude.join(','));
  }
  return apiFetchV2<ApiPathResponseV2>(`/graph/path?${params}`);
}

// ── v2 Person CRUD ────────────────────────────────────────────────────────
//
// These are the PRIMARY write operations for the College provider.
// They call /api/v2/persons/* and are used by graphStore CRUD actions
// when dataSource === 'api-v2'.
//
// REAL/DEMO semantics:
//   Both REAL and DEMO nodes share the same write path.
//   The GUI distinguishes them visually (badge, accent color).
//   nodeType is immutable after creation — the service will reject changes.
//
// Protected fields (id, publicId, nodeType, createdAt, updatedAt, deletedAt,
// createdBy) cannot be overwritten by update payloads — the service and
// repository enforce this at the Neo4j merge level.

export interface CreatePersonV2Input {
  nodeType: 'REAL' | 'DEMO';
  fullName: string;
  username?: string;
  email?: string;
  phone?: string;
  company?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  cluster?: string;
  tags?: string[];
  sourceConnectors?: string[];
  createdBy?: string;
}

export interface UpdatePersonV2Input {
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  company?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  cluster?: string;
  tags?: string[];
}

async function apiFetchV2Mutation<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${BASE_URL_V2}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'include',
    });
    // 204 No Content — return empty object
    if (res.status === 204) return {} as T;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.message ?? json?.error ?? `v2 ${method} ${path} failed: ${res.status}`);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}

/** POST /api/v2/persons — create REAL or DEMO person node */
export async function createPersonV2(input: CreatePersonV2Input): Promise<ApiNodeV2> {
  return apiFetchV2Mutation<ApiNodeV2>('/persons', 'POST', input);
}

/** PATCH /api/v2/persons/:id — sparse update (only provided fields are written) */
export async function updatePersonV2(id: string, updates: UpdatePersonV2Input): Promise<ApiNodeV2> {
  return apiFetchV2Mutation<ApiNodeV2>(`/persons/${id}`, 'PATCH', updates);
}

/** DELETE /api/v2/persons/:id — soft-delete (sets deletedAt, preserves relationships) */
export async function deletePersonV2(id: string): Promise<void> {
  await apiFetchV2Mutation<void>(`/persons/${id}`, 'DELETE');
}

/** POST /api/v2/persons/:id/restore — restore a soft-deleted person */
export async function restorePersonV2(id: string): Promise<ApiNodeV2> {
  return apiFetchV2Mutation<ApiNodeV2>(`/persons/${id}/restore`, 'POST');
}

// ── v2 Relationship CRUD ──────────────────────────────────────────────────

export interface CreateRelationshipV2Input {
  sourceId: string;
  targetId: string;
  relationshipType: string;
  trustScore?: number;
  interactionFrequency?: number;
  connectorSource?: string;
  createdBy?: string;
}

export interface UpdateRelationshipV2Input {
  relationshipType?: string;
  trustScore?: number;
  interactionFrequency?: number;
}

export interface ApiRelationshipV2 {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: string;
  trustScore: number;
  interactionFrequency: number;
  connectorSource: string;
  edgeKind: 'REAL_EDGE' | 'DEMO_EDGE';
  weight: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/** POST /api/v2/relationships — create a directed relationship */
export async function createRelationshipV2(
  input: CreateRelationshipV2Input
): Promise<ApiRelationshipV2> {
  return apiFetchV2Mutation<ApiRelationshipV2>('/relationships', 'POST', input);
}

/** PATCH /api/v2/relationships/:id — sparse update */
export async function updateRelationshipV2(
  id: string,
  updates: UpdateRelationshipV2Input
): Promise<ApiRelationshipV2> {
  return apiFetchV2Mutation<ApiRelationshipV2>(`/relationships/${id}`, 'PATCH', updates);
}

/** DELETE /api/v2/relationships/:id — soft-delete */
export async function deleteRelationshipV2(id: string): Promise<void> {
  await apiFetchV2Mutation<void>(`/relationships/${id}`, 'DELETE');
}

/** POST /api/v2/relationships/:id/restore — restore a soft-deleted relationship */
export async function restoreRelationshipV2(
  id: string
): Promise<{ status: string; relationship: ApiRelationshipV2 }> {
  return apiFetchV2Mutation<{ status: string; relationship: ApiRelationshipV2 }>(
    `/relationships/${id}/restore`,
    'POST'
  );
}

/** GET /api/v2/persons/by-public-id/:publicId */
export async function fetchPersonByPublicIdV2(publicId: string): Promise<ApiNodeV2> {
  return apiFetchV2<ApiNodeV2>(`/persons/by-public-id/${encodeURIComponent(publicId)}`);
}
