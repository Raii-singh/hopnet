/**
 * HOPNet — Graph Controller v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin HTTP adapter between Express routes and graph.service.v2.
 *
 * Responsibilities:
 *   - Parse and coerce query/path parameters
 *   - Delegate to graph service functions
 *   - Serialize results as JSON
 *   - Pass errors to the shared errorHandler
 *
 * NOT responsible for:
 *   - Traversal logic (graph.service.v2)
 *   - Neo4j queries (graph.repository)
 *   - HOPNetError → HTTP status mapping (errorHandler.ts)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Request, Response, NextFunction } from 'express';
import { getSubgraph, getNodeProfile, findPath } from '../services/graph.service.v2';
import { validationError } from '../services/errors';
import type { GraphFilters } from '../repositories/graph.repository';

/**
 * Parses query parameters into GraphFilters.
 * Validates minTrust and types.
 */
function parseFilters(req: Request): GraphFilters | undefined {
  const filters: GraphFilters = {};
  
  const minTrustRaw = req.query['minTrust'];
  if (minTrustRaw !== undefined) {
    const minTrust = parseFloat(minTrustRaw as string);
    if (isNaN(minTrust) || minTrust < 0 || minTrust > 1) {
      throw validationError('minTrust must be a number between 0 and 1');
    }
    filters.minTrustScore = minTrust;
  }

  const typesRaw = req.query['types'];
  if (typesRaw !== undefined && typeof typesRaw === 'string') {
    const types = typesRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (types.length > 0) {
      filters.relationshipTypes = types;
    }
  }

  const excludeRaw = req.query['exclude'];
  if (excludeRaw !== undefined && typeof excludeRaw === 'string') {
    const ids = excludeRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (ids.length > 0) {
      filters.excludedNodeIds = new Set(ids);
    }
  }

  return (filters.minTrustScore !== undefined || filters.relationshipTypes !== undefined || filters.excludedNodeIds !== undefined) ? filters : undefined;
}

// ── GET /api/v2/graph ──────────────────────────────────────────────────────
// Query params:
//   centerId   string  (required) UUID of the center node
//   depth      integer  default 2, clamped [1,6]
//   includeDemo boolean  default true
// Response 200: GraphSubgraphResponse
// Response 400: VALIDATION_ERROR (missing centerId)
// Response 404: NODE_NOT_FOUND (centerId not found or soft-deleted)
export async function getGraph(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const centerId    = (req.query['centerId'] as string) ?? '';
    const depth       = parseInt(req.query['depth'] as string, 10) || 2;
    const includeDemo = req.query['includeDemo'] !== 'false';
    const filters     = parseFilters(req);

    const result = await getSubgraph(centerId, depth, includeDemo, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v2/graph/node/:id ─────────────────────────────────────────────
// Param: id (UUID)
// Response 200: NodeProfileResponse
// Response 404: NODE_NOT_FOUND
export async function getNode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getNodeProfile(req.params['id'] as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v2/graph/path ───────────────────────────────────────────────────────
// Query params:
//   from         string UUID    (required)
//   to           string UUID    (required)
//   maxDepth     integer        default 6, clamped [1,6]
//   includeDemo  boolean        default true
//
// Path honors the HOPNet traversal constraint (collegeConstraint).
// A physically existing path that violates REAL/DEMO rules is NOT returned.
//
// totalCost = Dijkstra accumulated friction (sum of 1-weight per edge).
//             Lower = stronger/more-trusted path.
//
// Response 200: PathResponse
// Response 400: VALIDATION_ERROR (missing/equal from|to)
export async function getPath(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const from        = (req.query['from'] as string) ?? '';
    const to          = (req.query['to'] as string)   ?? '';
    const maxDepth    = parseInt(req.query['maxDepth'] as string, 10) || 6;
    const includeDemo = req.query['includeDemo'] !== 'false';
    const k           = parseInt(req.query['k'] as string, 10) || 3;
    const offset      = parseInt(req.query['offset'] as string, 10) || 0;
    const filters     = parseFilters(req);

    const result = await findPath(from, to, maxDepth, includeDemo, filters, k, offset);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
// ── WORKSPACE: Merge & Duplicate suggestions (Step 19) ───────────────

import { detectDuplicatesV2, mergeUsersV2 } from '../services/graph.service.v2';

export async function getDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const suggestions = await detectDuplicatesV2();
    res.json({ suggestions });
  } catch (err: any) {
    next(err);
  }
}

export async function mergeUserIdentities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sourceId, targetId } = req.body;
    if (!sourceId || !targetId) {
      res.status(400).json({ error: 'sourceId and targetId are required' });
      return;
    }
    const targetNode = await mergeUsersV2(sourceId, targetId);
    res.json({ success: true, targetNode });
  } catch (err: any) {
    next(err);
  }
}
