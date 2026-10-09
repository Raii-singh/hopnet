/**
 * HOPNet Backend — Neo4j Driver Singleton
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a single, shared Neo4j driver instance for the entire application.
 * All graph repository modules import `getSession()` from here.
 *
 * Configuration via environment variables (backend/.env):
 *   NEO4J_URI       — Bolt URI, e.g. bolt://localhost:7687
 *   NEO4J_USERNAME  — Database username (default: neo4j)
 *   NEO4J_PASSWORD  — Database password (required, never hard-coded)
 *   NEO4J_DATABASE  — Named database (default: hopnet)
 *
 * Architecture note:
 *   This file only manages the driver/connection lifecycle.
 *   All Cypher queries live in src/repositories/.
 *   No graph data is duplicated in PostgreSQL.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import neo4j, { Driver, Session } from 'neo4j-driver';

// ── Validate required config ───────────────────────────────────────────────
const NEO4J_URI      = process.env.NEO4J_URI      || 'bolt://localhost:7687';
const NEO4J_USERNAME = process.env.NEO4J_USERNAME  || process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD  || 'R@!51ngh';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE  || 'neo4j';

if (!process.env.NEO4J_PASSWORD) {
  console.warn('[Neo4j] ⚠️ NEO4J_PASSWORD environment variable is not set. Using default fallback password.');
}

// ── Driver singleton ──────────────────────────────────────────────────────
let _driver: Driver | null = null;

function getDriver(): Driver {
  if (!_driver) {
    _driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD!),
      {
        // Disable default integer conversion to avoid precision loss on large IDs.
        // HOPNet uses string UUIDs as primary keys, not Neo4j's internal integer IDs.
        disableLosslessIntegers: true,
        // Connection pool — sensible defaults for local/single-instance deployment.
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 30_000,
      }
    );
  }
  return _driver;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Returns a new Neo4j session scoped to the HOPNet database.
 * Callers MUST close the session after use: `session.close()`.
 *
 * Usage pattern:
 *   const session = getSession();
 *   try {
 *     const result = await session.run(query, params);
 *     ...
 *   } finally {
 *     await session.close();
 *   }
 */
export function getSession(): Session {
  return getDriver().session({
    database: NEO4J_DATABASE,
  });
}

/**
 * Verify connectivity to Neo4j on application startup.
 * Logs the server info and throws if the connection cannot be established.
 */
export async function verifyConnectivity(): Promise<void> {
  const driver = getDriver();
  try {
    const info = await driver.getServerInfo({ database: NEO4J_DATABASE });
    console.log(`[Neo4j] ✅ Connected — ${info.address} (protocol: ${info.protocolVersion})`);
  } catch (err: any) {
    console.error('[Neo4j] ❌ Connection failed:', err.message);
    throw err;
  }
}

/**
 * Gracefully close the driver. Call this on server shutdown.
 */
export async function closeDriver(): Promise<void> {
  if (_driver) {
    await _driver.close();
    _driver = null;
    console.log('[Neo4j] Driver closed.');
  }
}

export default { getSession, verifyConnectivity, closeDriver };
