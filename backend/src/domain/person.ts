/**
 * HOPNet Domain — Person Node
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines the TypeScript representation of a Person node in Neo4j.
 *
 * Architecture:
 *   - All Person nodes carry `nodeType: 'REAL' | 'DEMO'` as a first-class property.
 *   - REAL = verified/believed-real entity.
 *   - DEMO = hypothetical, unverified, or synthetic entity.
 *   - Both types are permanent, live HOPNet entities. Neither is "test-only".
 *   - Properties are sparse: a node only has the properties that are known.
 *     Optional fields are absent from the Neo4j node if never written.
 *
 * REAL→DEMO→REAL traversal constraint:
 *   A DEMO node must never cause two REAL people to appear connected through
 *   a legitimate path. This is enforced at query time (Cypher WHERE clause)
 *   and at the application layer (shared graph engine constraint).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Node type discriminator ───────────────────────────────────────────────
export type NodeType = 'REAL' | 'DEMO';

// ── Full PersonNode (as returned from Neo4j and served by the API) ────────
export interface PersonNode {
  // ── Mandatory (always present on every node) ──────────────────────────
  id: string;         // Backend-generated UUID v4. Stable primary API key.
  publicId: string;   // Human-readable: HNP-000001 (REAL) or DNP-000001 (DEMO).
  nodeType: NodeType; // 'REAL' | 'DEMO'. Stored as Neo4j property. API-facing name.
  createdAt: string;  // ISO 8601 timestamp.
  updatedAt: string;  // ISO 8601 timestamp.
  createdBy: string;  // Who/what created: "Manual", "LinkedIn Connector", etc.

  // ── Strongly recommended (absent only if genuinely unknown) ──────────
  fullName?: string;

  // ── Optional identity ─────────────────────────────────────────────────
  username?: string;
  email?: string;
  phone?: string;

  // ── Optional professional ─────────────────────────────────────────────
  company?: string;
  role?: string;

  // ── Optional social handles ───────────────────────────────────────────
  linkedinUrl?: string;
  instagramHandle?: string;
  twitterHandle?: string;
  githubHandle?: string;

  // ── Optional classification ───────────────────────────────────────────
  cluster?: string;
  tags?: string[];
  sourceConnectors?: string[]; // e.g. ["LinkedIn", "Gmail Connector"]

  // ── Graph intelligence (stored, computed by intelligence service) ──────
  // Absent until the first centrality pass runs after node creation.
  influenceScore?: number;    // 0–100 composite score
  degreeCentrality?: number;  // 0–1 normalized degree
  weightedDegree?: number;    // Sum of incident edge weights

  // ── Soft delete ───────────────────────────────────────────────────────
  // null or absent = active. ISO string = soft-deleted at that time.
  deletedAt?: string | null;

  // ── Flexible extension ────────────────────────────────────────────────
  // Neo4j stores sparse properties natively. Additional properties
  // (e.g. location, bio, nationality) can be written without schema migration.
  // The index signature allows the service layer to read/write arbitrary properties.
  [key: string]: unknown;
}

// ── Input for creating a new node ────────────────────────────────────────
export interface CreatePersonInput {
  nodeType: NodeType;          // Required: must explicitly declare REAL or DEMO
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  instagramHandle?: string;
  twitterHandle?: string;
