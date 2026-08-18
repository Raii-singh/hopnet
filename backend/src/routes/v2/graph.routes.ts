/**
 * HOPNet v2 — Graph Routes
 * Base path: /api/v2/graph
 *
 * NOTE: Route order matters.
 *   /node/:id and /path must be declared BEFORE any future wildcard routes.
 */

import { Router } from 'express';
import { getGraph, getNode, getPath } from '../../controllers/graph.controller.v2';

const router = Router();

// ── Subgraph query (primary HOPNet operation) ─────────────────────────────
router.get('/', getGraph);                // GET /api/v2/graph?centerId=...&depth=...

// ── Node profile with 1-hop connections ───────────────────────────────────
router.get('/node/:id', getNode);         // GET /api/v2/graph/node/:id

// ── Path query ────────────────────────────────────────────────────────────
router.get('/path', getPath);             // GET /api/v2/graph/path?from=...&to=...

export default router;
