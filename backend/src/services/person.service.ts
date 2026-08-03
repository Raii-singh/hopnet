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

