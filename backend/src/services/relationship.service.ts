/**
 * HOPNet — Relationship Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Business logic and orchestration layer for [:CONNECTED] relationships.
 *
 * Architecture:
 *   GUI / API
 *       ↓
 *   relationship.service.ts  ← THIS FILE
 *       ↓
 *   relationship.repository.ts  (+ person.repository for endpoint checks)
 *       ↓
 *   Neo4j
 *
 * Responsibilities:
 *   - Input validation (required fields, types, numeric ranges).
 *   - Self-loop prevention (sourceId === targetId).
 *   - Endpoint existence and active-state validation.
 *   - Duplicate active relationship prevention (Decision 3, Step 10).
 *   - REAL/DEMO relationship creation semantics (all 4 combinations documented).
 *   - Wrapping repository results into typed HOPNetErrors.
 *   - Attaching computed weight to returned relationships.
 *
 * NOT responsible for:
 *   - Neo4j sessions / transactions    → repository layer
 *   - edgeKind derivation              → atomic Cypher in repository
 *   - publicId generation              → person.service
 *   - Graph traversal / BFS            → graph service (future)
 *   - HTTP mapping                     → controller (future Step 12+)
 *
 * ── REAL/DEMO relationship creation semantics ────────────────────────────────
 *
 *   REAL → REAL  → REAL_EDGE   ALLOWED. Standard live connection.
 *   REAL → DEMO  → DEMO_EDGE   ALLOWED. Admin models a hypothetical connection
 *                               from a real person to a synthetic/unverified entity.
 *   DEMO → REAL  → DEMO_EDGE   ALLOWED. Hypothetical entity points to a real person.
 *                               The REAL→DEMO→REAL traversal constraint prevents
 *                               this from creating a fake reachability path
 *                               between two REAL people (enforced during traversal,
 *                               not at relationship creation time).
 *   DEMO → DEMO  → DEMO_EDGE   ALLOWED. Two hypothetical entities connected.
 *
 *   The REAL→DEMO→REAL traversal restriction is a graph-traversal concern,
 *   not a relationship-creation restriction. All four combinations are allowed
 *   at write time. The restriction is enforced by the graph engine during BFS.
 *
 * ── Duplicate relationship rule (Decision 3, approved Step 10 review) ────────
 *
 *   Uniqueness key: (sourceId, targetId, relationshipType)
 *   Direction matters: A→B KNOWS and B→A KNOWS are distinct.
 *
 *   Soft-deleted relationships are NOT treated as existing for the purpose of
 *   duplicate prevention. If a KNOWS relationship between A and B was created,
 *   then soft-deleted, a new KNOWS relationship can be created between the same
 *   pair. This means historical/soft-deleted data does not block re-creation.
 *   Rationale: DEMO nodes in particular may model ephemeral hypothetical
 *   connections that are deleted and re-created as the graph evolves.
 *
 * ── Transaction semantics ────────────────────────────────────────────────────
 *
 *   createRelationship spans two repository reads (endpoint existence checks)
 *   and one write (createRelationship in the repo, which is itself atomic).
 *   The pre-creation endpoint checks are done at the service level, not inside
 *   a single Neo4j transaction.
 *
 *   Race scenario: two concurrent callers both pass the service-level checks
 *   and both attempt to create a duplicate. The second caller would succeed at
 *   the repository level (repository is permissive). For the current single-admin
 *   system, this race is practically impossible. If concurrency becomes a concern
 *   in future, add a Neo4j MERGE or a locking mechanism at that time.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Relationship, RelationshipWithWeight, UpdateRelationshipInput } from '../domain/relationship';
import { withWeight } from '../domain/relationship';
import type { EdgeKind } from '../domain/relationship';
import * as relRepo from '../repositories/relationship.repository';
import * as personRepo from '../repositories/person.repository';
import {
  HOPNetError,
  relationshipNotFound,
  relationshipAlreadyDeleted,
  relationshipNotDeleted,
  duplicateRelationship,
