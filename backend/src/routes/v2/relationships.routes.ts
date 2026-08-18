/**
 * HOPNet v2 — Relationship Routes
 * Base path: /api/v2/relationships
 *
 * NOTE: Route order matters for Express.
 *   /between/:sourceId/:targetId and /by-person/:personId must be declared
 *   BEFORE /:id to avoid Express treating "between" or "by-person" as a UUID.
 */

import { Router } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import {
  createRelationship,
  listRelationships,
  getRelationshipById,
  getRelationshipsBetween,
  listRelationshipsByPerson,
  updateRelationship,
  softDeleteRelationship,
  restoreRelationship,
} from '../../controllers/relationship.controller';

const router = Router();

// ── Collection operations ──────────────────────────────────────────────────
router.post('/', requireAdmin, createRelationship);                                     // POST   /api/v2/relationships
router.get('/', listRelationships);                                       // GET    /api/v2/relationships

// ── Sub-collection lookups (must be before /:id) ──────────────────────────
router.get('/between/:sourceId/:targetId', getRelationshipsBetween);     // GET    /api/v2/relationships/between/:a/:b
router.get('/by-person/:personId', listRelationshipsByPerson);           // GET    /api/v2/relationships/by-person/:personId

// ── Single resource by UUID ────────────────────────────────────────────────
router.get('/:id', getRelationshipById);                                  // GET    /api/v2/relationships/:id
router.patch('/:id', requireAdmin, updateRelationship);                                 // PATCH  /api/v2/relationships/:id
router.delete('/:id', requireAdmin, softDeleteRelationship);                            // DELETE /api/v2/relationships/:id

// ── State transition ───────────────────────────────────────────────────────
router.post('/:id/restore', requireAdmin, restoreRelationship);                         // POST   /api/v2/relationships/:id/restore

export default router;
