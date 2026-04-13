/**
 * HOPNet — Shared Error Handler Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts HOPNetError instances into structured JSON HTTP responses.
 * All other errors become 500 (infrastructure failures).
 *
 * This is the single place where HOPNetErrorCode → HTTP status mapping lives.
 * Controllers must NOT catch HOPNetErrors themselves — they should let them
 * propagate to this handler.
 *
 * HOPNetErrorCode → HTTP status mapping:
 *
 *   NODE_NOT_FOUND                           → 404
 *   RELATIONSHIP_NOT_FOUND                   → 404
 *   NODE_ALREADY_DELETED                     → 409
 *   NODE_NOT_DELETED                         → 409
 *   RELATIONSHIP_ALREADY_DELETED             → 409
 *   RELATIONSHIP_NOT_DELETED                 → 409
 *   DUPLICATE_RELATIONSHIP                   → 409
 *   DUPLICATE_PUBLIC_ID                      → 409
 *   SELF_LOOP                                → 422
 *   INVALID_NODE_TYPE                        → 422
 *   NODE_TYPE_IMMUTABLE                      → 422
 *   INVALID_RELATIONSHIP_TYPE                → 422
 *   DELETED_ENDPOINT                         → 422
 *   ENDPOINT_NOT_FOUND                       → 422
 *   IMMUTABLE_FIELD                          → 422
 *   VALIDATION_ERROR                         → 400
 *   RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED → 200 (see note below)
 *   (all other / unexpected)                 → 500
 *
 * Note on RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED:
 *   This is a 200 OK because the operation succeeded. The response body
 *   includes `"status": "restored_pending_endpoint"` to signal partial
 *   activation. The controller must catch this specific code and handle
 *   it as a successful path (not as an error path) — see
 *   relationship.controller.ts for the restore endpoint.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Request, Response, NextFunction } from 'express';
import { HOPNetError, type HOPNetErrorCode } from '../services/errors';

// ── HOPNetErrorCode → HTTP status ─────────────────────────────────────────

const STATUS_MAP: Record<HOPNetErrorCode, number> = {
  // 401 — unauthorized
  UNAUTHORIZED:                                401,
  // 404 — resource not found
  NODE_NOT_FOUND:                              404,
  RELATIONSHIP_NOT_FOUND:                      404,
  // 409 — conflict / already in that state
  NODE_ALREADY_DELETED:                        409,
  NODE_NOT_DELETED:                            409,
  RELATIONSHIP_ALREADY_DELETED:                409,
  RELATIONSHIP_NOT_DELETED:                    409,
  DUPLICATE_RELATIONSHIP:                      409,
  DUPLICATE_PUBLIC_ID:                         409,
  // 422 — unprocessable: valid request format, invalid semantics
  SELF_LOOP:                                   422,
  INVALID_NODE_TYPE:                           422,
  NODE_TYPE_IMMUTABLE:                         422,
  INVALID_RELATIONSHIP_TYPE:                   422,
  DELETED_ENDPOINT:                            422,
  ENDPOINT_NOT_FOUND:                          422,
  IMMUTABLE_FIELD:                             422,
  // 400 — bad request: malformed/missing input
  VALIDATION_ERROR:                            400,
  // 200 — success with partial activation state (handled in controller, not here)
  RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED:  200,
};

// ── Response shape ────────────────────────────────────────────────────────

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ── Express error handler ─────────────────────────────────────────────────

/**
