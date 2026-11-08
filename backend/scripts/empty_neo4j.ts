/**
 * HOPNet Database Empty Script
 * 
 * Safely removes all persistent graph nodes and relationships from Neo4j
 * without destroying indexes, constraints, or the PostgreSQL auth schema.
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register --transpile-only scripts/empty_neo4j.ts
 */

import { driver } from '../src/config/neo4j';

async function emptyGraph() {
  const session = driver.session();
  try {
    console.log('Connecting to Neo4j...');
    
    // Test connection
    await session.run('RETURN 1');
    console.log('â Connected to Neo4j.');

    console.log('Clearing all graph nodes and relationships...');
    const result = await session.run(`
      MATCH (n)
      DETACH DELETE n
      RETURN count(n) as count
    `);
    
    console.log(`â Successfully deleted ${result.records[0].get('count').toNumber()} nodes and their relationships.`);
    
  } catch (error: any) {
    console.error('â Error emptying graph:', error.message);
  } finally {
    await session.close();
    await driver.close();
    process.exit(0);
  }
}

emptyGraph();