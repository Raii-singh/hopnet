/**
 * HOPNet v2 — Person Routes
 * Base path: /api/v2/persons
 *
 * NOTE: Route order matters for Express.
 *   /search and /by-public-id/:publicId must be declared BEFORE /:id
 *   to avoid Express matching "search" or "by-public-id" as an id value.
 */

import { Router } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import {
  createPerson,
  listPersons,
  searchPersons,
  getPersonById,
  getPersonByPublicId,
  updatePerson,
  softDeletePerson,
  restorePerson,
} from '../../controllers/person.controller';

import {
  getDuplicates,
  mergeUserIdentities,
} from '../../controllers/graph.controller.v2';

const router = Router();

// ── Collection operations ──────────────────────────────────────────────────
router.post('/', requireAdmin, createPerson);                              // POST   /api/v2/persons
router.get('/', listPersons);                               // GET    /api/v2/persons

// ── Search (must be before /:id) ───────────────────────────────────────────
router.get('/search', searchPersons);                       // GET    /api/v2/persons/search?q=...

// ── Lookup by publicId (must be before /:id) ──────────────────────────────
router.get('/by-public-id/:publicId', getPersonByPublicId); // GET    /api/v2/persons/by-public-id/HNP-000001

// ── Workspace: Identity Resolution (Step 19) ───────────────────────────────
router.get('/duplicates/all', getDuplicates);               // GET    /api/v2/persons/duplicates/all
router.post('/merge', requireAdmin, mergeUserIdentities);   // POST   /api/v2/persons/merge


// ── Single resource by UUID ────────────────────────────────────────────────
router.get('/:id', getPersonById);                          // GET    /api/v2/persons/:id
router.patch('/:id', requireAdmin, updatePerson);                         // PATCH  /api/v2/persons/:id
router.delete('/:id', requireAdmin, softDeletePerson);                    // DELETE /api/v2/persons/:id

// ── State transition ───────────────────────────────────────────────────────
router.post('/:id/restore', requireAdmin, restorePerson);                 // POST   /api/v2/persons/:id/restore

export default router;
