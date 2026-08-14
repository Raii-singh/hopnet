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

  return (filters.minTrustScore !== undefined || filters.relationshipTypes !== undefined) ? filters : undefined;
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
