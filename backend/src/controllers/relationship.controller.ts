/**
 * HOPNet — Relationship Controller (v2 / Neo4j)
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin HTTP adapter between Express routes and the relationship.service layer.
 *
 * Responsibilities:
 *   - Parse and coerce request params / body
 *   - Call the appropriate service function
 *   - Serialize the result as JSON
 *   - Handle the RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED special case
 *     (200 OK + status:"restored_pending_endpoint") — this is the ONE place
 *     where this code is handled as a success path, not an error path.
 *   - Pass all other errors to next() for the shared errorHandler
 *
 * NOT responsible for:
 *   - Business logic (that lives in relationship.service)
 *   - Validation beyond parsing (service validates)
 *   - HOPNetError → HTTP status mapping for normal errors (that lives in
 *     errorHandler.ts)
 *
 * RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED handling:
 *   When restoreRelationship() throws this code, it means the restore
 *   physically succeeded (deletedAt cleared) but the relationship is still
 *   inactive because an endpoint is soft-deleted. The approved HTTP contract
 *   is:
 *     HTTP 200 OK
 *     { "status": "restored_pending_endpoint", "message": "...", "id": "..." }
 *   The controller catches this specific code and builds the 200 response
 *   directly, bypassing the error handler.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Request, Response, NextFunction } from 'express';
import * as relSvc from '../services/relationship.service';
import { HOPNetError } from '../services/errors';
import type { EdgeKind } from '../domain/relationship';

// ── POST /api/v2/relationships ────────────────────────────────────────────
// Body: CreateRelationshipServiceInput
// Response 201: RelationshipWithWeight
export async function createRelationship(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rel = await relSvc.createRelationship(req.body);
    res.status(201).json(rel);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v2/relationships ─────────────────────────────────────────────
// Query: ?edgeKind=REAL_EDGE|DEMO_EDGE  ?limit=500  ?skip=0
// Response 200: { data: RelationshipWithWeight[], count: number }
export async function listRelationships(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const edgeKind = req.query['edgeKind'] as EdgeKind | undefined;
    const limit = req.query['limit'] !== undefined
      ? Math.max(1, Math.min(1000, parseInt(req.query['limit'] as string, 10) || 500))
      : 500;
    const skip = req.query['skip'] !== undefined
      ? Math.max(0, parseInt(req.query['skip'] as string, 10) || 0)
      : 0;

    const rels = await relSvc.listRelationships({ edgeKind, limit, skip });
    res.json({ data: rels, count: rels.length });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v2/relationships/:id ─────────────────────────────────────────
// Param: id (UUID)
// Response 200: RelationshipWithWeight  |  404 RELATIONSHIP_NOT_FOUND
export async function getRelationshipById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rel = await relSvc.getRelationshipById(req.params['id'] as string);
    res.json(rel);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v2/relationships/between/:sourceId/:targetId ─────────────────
// Params: sourceId, targetId (UUIDs)
// Returns all active relationships between the two nodes (either direction).
// Response 200: { data: RelationshipWithWeight[], count: number }
export async function getRelationshipsBetween(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rels = await relSvc.getRelationshipsBetween(
      req.params['sourceId'] as string,
      req.params['targetId'] as string
    );
    res.json({ data: rels, count: rels.length });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v2/relationships/by-person/:personId ─────────────────────────
// Param: personId (UUID)
// Query: ?edgeKind=REAL_EDGE|DEMO_EDGE
// Response 200: { data: RelationshipWithWeight[], count: number }
export async function listRelationshipsByPerson(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const edgeKind = req.query['edgeKind'] as EdgeKind | undefined;
    const rels = await relSvc.listRelationshipsByPerson(
      req.params['personId'] as string,
      { edgeKind }
    );
    res.json({ data: rels, count: rels.length });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/v2/relationships/:id ───────────────────────────────────────
// Param: id (UUID)
// Body: UpdateRelationshipInput (sparse)
// Response 200: RelationshipWithWeight  |  404  |  409  |  422
export async function updateRelationship(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rel = await relSvc.updateRelationship(
      req.params['id'] as string,
      req.body
    );
    res.json(rel);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/v2/relationships/:id ──────────────────────────────────────
// Param: id (UUID)
// Soft-delete only. Preserves the relationship physically.
// Response 204 No Content  |  404  |  409 RELATIONSHIP_ALREADY_DELETED
export async function softDeleteRelationship(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await relSvc.softDeleteRelationship(req.params['id'] as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── POST /api/v2/relationships/:id/restore ────────────────────────────────
// Param: id (UUID)
//
// Normal path (both endpoints active):
//   HTTP 200 OK
//   RelationshipWithWeight
//
// Edge case path (endpoint still soft-deleted):
//   HTTP 200 OK
//   {
//     "status": "restored_pending_endpoint",
//     "message": "<descriptive message>",
//     "id": "<relationship UUID>"
//   }
//
// Errors:
//   404 RELATIONSHIP_NOT_FOUND
//   409 RELATIONSHIP_NOT_DELETED  (already active)
export async function restoreRelationship(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const id = req.params['id'] as string;
  try {
    const rel = await relSvc.restoreRelationship(id);
    // Normal path: relationship is restored and both endpoints are active.
    res.json(rel);
  } catch (err) {
    // Special case: RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED
    // The restore physically succeeded but the relationship is still inactive
    // because at least one endpoint is soft-deleted.
    // Approved contract: HTTP 200 OK with status:"restored_pending_endpoint".
    if (
      err instanceof HOPNetError &&
      err.code === 'RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED'
    ) {
      res.status(200).json({
        status: 'restored_pending_endpoint',
        message:
          'The relationship has been restored (deletedAt cleared). ' +
          'It will become visible in normal graph reads automatically ' +
          'once all endpoint nodes are also restored.',
        id,
        ...(err.details ?? {}),
      });
      return;
    }
    // All other errors (RELATIONSHIP_NOT_FOUND, RELATIONSHIP_NOT_DELETED, etc.)
    // are passed to the shared error handler.
    next(err);
  }
}
