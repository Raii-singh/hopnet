/**
 * HOPNet â Neo4j Database Setup Script
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * Installs all required constraints and indexes on the configured Neo4j database.
 *
 * Community Edition note:
 *   Neo4j Community Edition does not support CREATE DATABASE.
 *   The default 'neo4j' database is used as the HOPNet live graph database.
 *   Set NEO4J_DATABASE=neo4j in backend/.env (already done).
 *
 * Usage:
 *   cd backend && npx ts-node -r tsconfig-paths/register --transpile-only scripts/setup_neo4j.ts
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import 'dotenv/config';
import { verifyConnectivity, getSession, closeDriver } from '../src/config/neo4j';

async function run() {
  const dbTarget = process.env.NEO4J_DATABASE || 'neo4j';

  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  HOPNet â Neo4j Constraint & Index Setup');
  console.log(`  Target database: ${dbTarget}`);
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  // ââ Step 1: Verify connectivity ââââââââââââââââââââââââââââââââââââââââ
  console.log(`ââ Step 1: Verifying connectivity to '${dbTarget}' ââ`);
  try {
    await verifyConnectivity();
  } catch (err: any) {
    console.error(`  â Cannot connect to Neo4j: ${err.message}`);
    console.log('\n  Check that:');
    console.log('  1. Neo4j is running: sudo systemctl start neo4j');
    console.log('  2. NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD are correct in backend/.env');
    console.log(`  3. NEO4J_DATABASE is set to an existing database (currently: ${dbTarget})`);
    await closeDriver();
    process.exit(1);
  }

  // ââ Step 2: Install node constraints and indexes âââââââââââââââââââââââ
  console.log(`\nââ Step 2: Installing node constraints and indexes ââ`);

  const session = getSession();

  const nodeStatements = [
    {
      label: 'Uniqueness constraint: Person.id',
      cypher: 'CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
    },
    {
      label: 'Uniqueness constraint: Person.publicId',
      cypher: 'CREATE CONSTRAINT person_public_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.publicId IS UNIQUE',
    },
    {
      label: 'Index: Person.nodeType (REAL/DEMO filter)',
      cypher: 'CREATE INDEX person_node_type IF NOT EXISTS FOR (p:Person) ON (p.nodeType)',
    },
    {
      label: 'Index: Person.deletedAt (soft-delete filter)',
      cypher: 'CREATE INDEX person_deleted_at IF NOT EXISTS FOR (p:Person) ON (p.deletedAt)',
    },
    {
      label: 'Index: Person.email (search + duplicate detection)',
      cypher: 'CREATE INDEX person_email IF NOT EXISTS FOR (p:Person) ON (p.email)',
    },
    {
      label: 'Index: Person.fullName (search)',
      cypher: 'CREATE INDEX person_full_name IF NOT EXISTS FOR (p:Person) ON (p.fullName)',
    },
  ];

  try {
    for (const stmt of nodeStatements) {
      try {
        await session.run(stmt.cypher);
        console.log(`  â ${stmt.label}`);
      } catch (e: any) {
        console.warn(`  â ï¸  ${stmt.label}: ${e.message.split('\n')[0]}`);
      }
    }
  } finally {
    await session.close();
  }

  // ââ Step 3: Install relationship constraints and indexes âââââââââââââââ
  console.log(`\nââ Step 3: Installing relationship constraints and indexes ââ`);

  const relSession = getSession();
  const relStatements = [
    {
      label: 'Uniqueness constraint: CONNECTED.id (requires Neo4j 5.7+)',
      cypher: 'CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS FOR ()-[r:CONNECTED]-() REQUIRE r.id IS UNIQUE',
    },
    {
      label: 'Index: CONNECTED.deletedAt (soft-delete filter)',
      cypher: 'CREATE INDEX rel_deleted_at IF NOT EXISTS FOR ()-[r:CONNECTED]-() ON (r.deletedAt)',
    },
    {
      label: 'Index: CONNECTED.edgeKind (REAL_EDGE/DEMO_EDGE filter)',
      cypher: 'CREATE INDEX rel_edge_kind IF NOT EXISTS FOR ()-[r:CONNECTED]-() ON (r.edgeKind)',
    },
  ];

  try {
    for (const stmt of relStatements) {
      try {
        await relSession.run(stmt.cypher);
        console.log(`  â ${stmt.label}`);
      } catch (e: any) {
        console.warn(`  â ï¸  ${stmt.label}: ${e.message.split('\n')[0]}`);
      }
    }
  } finally {
    await relSession.close();
  }

  // ââ Step 4: List installed constraints âââââââââââââââââââââââââââââââââ
  console.log(`\nââ Step 4: Installed constraints on '${dbTarget}' ââ`);
  const verifySession = getSession();
  try {
    const constraints = await verifySession.run('SHOW CONSTRAINTS');
    if (constraints.records.length === 0) {
      console.log('  (no constraints found)');
    } else {
      for (const r of constraints.records) {
        const name = r.get('name');
        const type = r.get('type');
        console.log(`  â¢ ${name}  [${type}]`);
      }
    }
  } catch (e: any) {
    console.warn('  â ï¸  Could not list constraints:', e.message.split('\n')[0]);
  } finally {
    await verifySession.close();
  }

  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  Setup complete.');
  console.log('  Next: npm run seed:demo  (when seed script is implemented)');
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  await closeDriver();
}

run().catch(err => {
  console.error('[SetupScript] Unhandled error:', err.message);
  process.exit(1);
});
