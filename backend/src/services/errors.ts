/**
 * HOPNet — Service Layer Error Model
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines the typed error hierarchy for all HOPNet service operations.
 *
 * Architecture contract:
 *   - Service functions throw HOPNetError subclasses, never raw Neo4j errors.
 *   - The API/controller layer catches HOPNetError and maps each code to an
 *     appropriate HTTP status (future: Step 12+).
 *   - Neo4j driver errors may bubble up only if they represent unexpected
 *     infrastructure failures, not domain logic violations.
 *
 * Error code design:
 *   Each code is a stable string that the API layer and tests can match on.
 *   Do not use HTTP status codes as error codes — keep domain and transport
 *   concerns separate.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Base error ─────────────────────────────────────────────────────────────

export type HOPNetErrorCode =
  // ── Node errors ──────────────────────────────────────────────────────────
  | 'NODE_NOT_FOUND'
  | 'NODE_ALREADY_DELETED'
  | 'NODE_NOT_DELETED'          // restore attempted on active node
  | 'INVALID_NODE_TYPE'         // value is not 'REAL' or 'DEMO'
  | 'NODE_TYPE_IMMUTABLE'       // attempt to change nodeType on existing node
  | 'DUPLICATE_PUBLIC_ID'       // publicId already in use
  // ── Relationship errors ──────────────────────────────────────────────────
  | 'RELATIONSHIP_NOT_FOUND'
  | 'RELATIONSHIP_ALREADY_DELETED'
  | 'RELATIONSHIP_NOT_DELETED'  // restore attempted on active relationship
  | 'DUPLICATE_RELATIONSHIP'    // active (sourceId, targetId, relationshipType) already exists
  | 'SELF_LOOP'                 // source === target
  | 'INVALID_RELATIONSHIP_TYPE' // empty or invalid value
  | 'DELETED_ENDPOINT'          // one or both endpoints are soft-deleted
  | 'ENDPOINT_NOT_FOUND'        // one or both endpoints do not exist
  // Restore succeeded but relationship is still inactive because an endpoint
  // is soft-deleted. RESTORE RELATIONSHIP ≠ ACTIVATE RELATIONSHIP.
  | 'RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED'
  // ── Validation errors ────────────────────────────────────────────────────
  | 'VALIDATION_ERROR'          // generic input validation failure
  | 'IMMUTABLE_FIELD'           // attempt to update an immutable field
  // ── Auth errors ──────────────────────────────────────────────────────────
  | 'UNAUTHORIZED';

/**
 * Base class for all HOPNet service errors.
 * Use `instanceof HOPNetError` in the controller layer to distinguish service
 * errors from unexpected infrastructure failures.
 */
export class HOPNetError extends Error {
  constructor(
    public readonly code: HOPNetErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HOPNetError';
    // Maintain correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Convenience factories ─────────────────────────────────────────────────

export function nodeNotFound(id: string): HOPNetError {
  return new HOPNetError('NODE_NOT_FOUND', `Person node not found: ${id}`, { id });
}

export function nodeAlreadyDeleted(id: string): HOPNetError {
  return new HOPNetError('NODE_ALREADY_DELETED', `Person node is already soft-deleted: ${id}`, { id });
}

export function nodeNotDeleted(id: string): HOPNetError {
  return new HOPNetError('NODE_NOT_DELETED', `Person node is not soft-deleted (cannot restore): ${id}`, { id });
}

export function invalidNodeType(value: unknown): HOPNetError {
  return new HOPNetError('INVALID_NODE_TYPE', `Invalid nodeType: "${value}". Must be 'REAL' or 'DEMO'.`, { value });
}

export function nodeTypeImmutable(): HOPNetError {
  return new HOPNetError(
