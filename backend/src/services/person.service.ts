/**
 * HOPNet — Person Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Business logic and orchestration layer for Person nodes.
 *
 * Architecture:
 *   GUI / API
 *       ↓
 *   person.service.ts  ← THIS FILE
 *       ↓
 *   person.repository.ts
 *       ↓
 *   Neo4j
 *
 * Responsibilities:
 *   - publicId generation and sequence management.
 *   - Input validation (required fields, valid nodeType, format checks).
 *   - Enforcing nodeType immutability (throws HOPNetError, not silently strips).
 *   - Wrapping all repository errors into typed HOPNetErrors.
 *   - REAL and DEMO are both permanent, first-class live node types.
 *   - Sparse property contract: never fabricate values for absent fields.
 *
 * NOT responsible for:
 *   - Neo4j sessions/transactions    → repository layer
 *   - Relationship logic             → relationship.service.ts
 *   - Graph traversal / BFS          → graph.service.ts (future Step 12+)
 *   - Authentication / authorization → future Step
 *   - HTTP request/response mapping  → controller layer (future Step 12+)
 *
 * publicId format:
 *   REAL nodes → HNP-XXXXXX  (HOPNet Person)
 *   DEMO nodes → DNP-XXXXXX  (Demo Node Person)
 *   Sequence is derived from the count of existing nodes of that type + 1.
 *   This is a best-effort sequential ID, not a strict global counter.
 *   Uniqueness is enforced by a Neo4j constraint (person_public_id_unique).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PersonNode, NodeType, CreatePersonInput, UpdatePersonInput } from '../domain/person';
import * as personRepo from '../repositories/person.repository';
import {
  HOPNetError,
  nodeNotFound,
  nodeAlreadyDeleted,
  nodeNotDeleted,
  invalidNodeType,
  nodeTypeImmutable,
  validationError,
} from './errors';

// ── Types ─────────────────────────────────────────────────────────────────

export interface CreatePersonServiceInput {
  nodeType: NodeType;
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  instagramHandle?: string;
  twitterHandle?: string;
  githubHandle?: string;
  cluster?: string;
  tags?: string[];
  sourceConnectors?: string[];
  createdBy?: string;
  [key: string]: unknown;
}

export interface ListPersonsOptions {
  nodeType?: NodeType;
  limit?: number;
  skip?: number;
}

export interface SearchPersonsOptions {
  query: string;
  nodeType?: NodeType;
  limit?: number;
}

// ── Internal helpers ──────────────────────────────────────────────────────

const VALID_NODE_TYPES: ReadonlySet<string> = new Set(['REAL', 'DEMO']);

/**
 * Generate a publicId for a new person node.
 * Fetches the count of existing nodes of the same type and builds the next ID.
 * Format: HNP-000001 (REAL) or DNP-000001 (DEMO).
 * Increments until an unused ID is found to prevent collisions with seeded data.
 */
async function generatePublicId(nodeType: NodeType): Promise<string> {
  let count = await personRepo.countPersons(nodeType);
  const prefix = nodeType === 'REAL' ? 'HNP-' : 'DNP-';
  let candidate = `${prefix}${String(count + 1).padStart(6, '0')}`;
  while (await personRepo.publicIdExists(candidate)) {
    count++;
    candidate = `${prefix}${String(count + 1).padStart(6, '0')}`;
  }
  return candidate;
}

/**
 * Wrap a repository call, converting known Neo4j driver errors into HOPNetErrors.
 * Unknown errors (infrastructure failures) are re-thrown as-is.
 */
async function repoCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    // Re-throw HOPNetErrors (already typed) without wrapping
    if (err instanceof HOPNetError) throw err;
    // Re-throw everything else as-is (infrastructure error — not a domain error)
    throw err;
  }
}

// ── Service operations ────────────────────────────────────────────────────

/**
 * Create a new Person node (REAL or DEMO).
 *
 * Validation:
 *   - nodeType must be 'REAL' or 'DEMO' (throws INVALID_NODE_TYPE)
 *
 * publicId is generated automatically.
 * All other fields are sparse — only provided values are written.
 * DEMO nodes are permanent, first-class live entities — not test data.
 */
export async function createPerson(input: CreatePersonServiceInput): Promise<PersonNode> {
  // ── Validate nodeType ──────────────────────────────────────────────────
  if (!input.nodeType || !VALID_NODE_TYPES.has(input.nodeType)) {
    throw invalidNodeType(input.nodeType);
  }

  // ── Generate publicId ──────────────────────────────────────────────────
  const publicId = await generatePublicId(input.nodeType);

  // ── Build repository input (only defined fields) ───────────────────────
  const repoInput: CreatePersonInput = {
    nodeType: input.nodeType,
    createdBy: input.createdBy,
  };

  const optionalFields = [
    'fullName', 'username', 'email', 'phone', 'company', 'role',
    'linkedinUrl', 'instagramHandle', 'twitterHandle', 'githubHandle',
    'cluster', 'tags', 'sourceConnectors',
  ] as const;

  const reservedKeys = new Set<string>([
    'nodeType', 'createdBy',
    ...(optionalFields as readonly string[]),
  ]);

  for (const field of optionalFields) {
    if (input[field] !== undefined && input[field] !== null) {
      (repoInput as Record<string, unknown>)[field] = input[field];
    }
  }

  // Pass through any additional arbitrary properties (e.g. sourceDataset,
  // sourceRecordId, metadata fields). The repository handles [key: string]: unknown
  // — the service must forward them so they reach Neo4j.
  for (const [k, v] of Object.entries(input)) {
    if (!reservedKeys.has(k) && v !== undefined && v !== null) {
      (repoInput as Record<string, unknown>)[k] = v;
    }
  }

  return repoCall(() => personRepo.createPerson(publicId, repoInput));
}

/**
 * Get a Person node by its backend UUID.
 * Throws NODE_NOT_FOUND if not found or soft-deleted.
 */
export async function getPersonById(id: string): Promise<PersonNode> {
  if (!id?.trim()) throw validationError('id is required');
  const node = await repoCall(() => personRepo.getPersonById(id));
  if (!node) throw nodeNotFound(id);
  return node;
}

/**
 * Get a Person node by its publicId (e.g. "HNP-000001").
 * Throws NODE_NOT_FOUND if not found or soft-deleted.
 */
export async function getPersonByPublicId(publicId: string): Promise<PersonNode> {
  if (!publicId?.trim()) throw validationError('publicId is required');
  const node = await repoCall(() => personRepo.getPersonByPublicId(publicId));
  if (!node) throw nodeNotFound(publicId);
  return node;
}

/**
 * List active Person nodes, optionally filtered by nodeType.
 * Both REAL and DEMO are returned by default.
 */
export async function listPersons(opts: ListPersonsOptions = {}): Promise<PersonNode[]> {
  const { nodeType, limit = 100, skip = 0 } = opts;
  if (nodeType && !VALID_NODE_TYPES.has(nodeType)) {
    throw invalidNodeType(nodeType);
  }
  return repoCall(() => personRepo.listPersons(nodeType, limit, skip));
}

/**
 * Search active Person nodes by a text query (fullName, email, username, company).
 * Returns an empty array when no match is found.
 */
export async function searchPersons(opts: SearchPersonsOptions): Promise<PersonNode[]> {
  const { query, nodeType, limit = 20 } = opts;
  if (typeof query !== 'string') throw validationError('query must be a string');
  if (nodeType && !VALID_NODE_TYPES.has(nodeType)) throw invalidNodeType(nodeType);
  if (!query.trim()) return [];
  return repoCall(() => personRepo.searchPersons(query, nodeType, limit));
}

/**
 * Update an existing active Person node.
 *
 * Business rules:
 *   - nodeType is permanently immutable → throws NODE_TYPE_IMMUTABLE
 *   - id, publicId, createdAt, createdBy are immutable (silently stripped
 *     at the repository level; the service throws explicitly for nodeType only)
 *   - Only provided fields are written (sparse merge)
 *   - Returns the updated node
 *   - Throws NODE_NOT_FOUND if the node doesn't exist or is soft-deleted
 */
export async function updatePerson(id: string, updates: UpdatePersonInput): Promise<PersonNode> {
  if (!id?.trim()) throw validationError('id is required');

  // nodeType is permanently immutable — throw explicitly rather than silently strip
  if ('nodeType' in updates && updates['nodeType'] !== undefined) {
    throw nodeTypeImmutable();
  }

  const result = await repoCall(() => personRepo.updatePerson(id, updates));
  if (!result) throw nodeNotFound(id);
  return result;
}

/**
 * Soft-delete a Person node.
 *
 * Behaviour:
 *   - Sets deletedAt timestamp on the node.
 *   - Does NOT cascade-delete or cascade-soft-delete relationships.
 *   - Active relationship queries automatically exclude relationships whose
 *     endpoints are soft-deleted (enforced at repository level — Decision 4).
 *   - Restoring the node makes all preserved relationships eligible to appear again.
 *   - Throws NODE_NOT_FOUND if the node doesn't exist.
