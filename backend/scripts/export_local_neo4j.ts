/**
 * HOPNet — Export Local Neo4j Graph Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports all Person nodes and CONNECTED relationships from local Neo4j instance
 * (bolt://localhost:7687) into database/graph-providers/live/seed_live.json
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import neo4j from 'neo4j-driver';

const LOCAL_URI      = process.env.NEO4J_URI      || 'bolt://localhost:7687';
const LOCAL_USER     = process.env.NEO4J_USERNAME  || process.env.NEO4J_USER || 'neo4j';
const LOCAL_PASSWORD = process.env.NEO4J_PASSWORD  || 'R@!51ngh';
const LOCAL_DATABASE = process.env.NEO4J_DATABASE  || 'neo4j';

const OUTPUT_PATH = path.resolve(
  __dirname,
  '../../database/graph-providers/live/seed_live.json'
);

async function exportLocalGraph() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  HOPNet — Export Local Graph to seed_live.json');
  console.log(`  Target: ${LOCAL_URI} (db: ${LOCAL_DATABASE})`);
  console.log('════════════════════════════════════════════════════════════\n');

  const driver = neo4j.driver(
    LOCAL_URI,
    neo4j.auth.basic(LOCAL_USER, LOCAL_PASSWORD),
    { disableLosslessIntegers: true }
  );

  const session = driver.session({ database: LOCAL_DATABASE });

  try {
    // 1. Fetch all active Person nodes (excluding soft-deleted)
    const nodeRes = await session.run(`
      MATCH (p:Person)
      WHERE p.deletedAt IS NULL
      RETURN p
    `);

    const realNodes: any[] = [];
    const demoNodes: any[] = [];

    for (const rec of nodeRes.records) {
      const props = rec.get('p').properties;
      const cleanNode = {
        id: props.id,
        publicId: props.publicId,
        fullName: props.fullName,
        username: props.username || undefined,
        email: props.email || undefined,
        phone: props.phone || undefined,
        company: props.company || undefined,
        cluster: props.cluster || 'Tech',
        influenceScore: props.influenceScore ?? 0,
        nodeType: props.nodeType || 'REAL',
        tags: props.tags || [],
        sourceConnectors: props.sourceConnectors || ['Manual Workspace'],
        createdAt: props.createdAt || new Date().toISOString(),
        updatedAt: props.updatedAt || new Date().toISOString(),
        createdBy: props.createdBy || 'Manual Workspace',
      };

      if (cleanNode.nodeType === 'DEMO') {
        demoNodes.push(cleanNode);
      } else {
        realNodes.push(cleanNode);
      }
    }

    console.log(`  Fetched ${realNodes.length + demoNodes.length} nodes (${realNodes.length} REAL, ${demoNodes.length} DEMO).`);

    // 2. Fetch all active CONNECTED relationships
    const relRes = await session.run(`
      MATCH (a:Person)-[r:CONNECTED]->(b:Person)
      WHERE r.deletedAt IS NULL AND a.deletedAt IS NULL AND b.deletedAt IS NULL
      RETURN r, a.id AS sourceId, b.id AS targetId, a.publicId AS sourcePublicId, b.publicId AS targetPublicId
    `);

    const edges: any[] = [];
    for (const rec of relRes.records) {
      const rProps = rec.get('r').properties;
      edges.push({
        id: rProps.id,
        sourceId: rec.get('sourceId'),
        targetId: rec.get('targetId'),
        sourcePublicId: rec.get('sourcePublicId'),
        targetPublicId: rec.get('targetPublicId'),
        relationshipType: rProps.relationshipType || 'CONNECTS_WITH',
        trustScore: rProps.trustScore ?? 80,
        interactionFrequency: rProps.interactionFrequency ?? 1,
        connectorSource: rProps.connectorSource || 'Manual Editor',
        edgeType: rProps.edgeKind || 'REAL_EDGE',
        edgeKind: rProps.edgeKind || 'REAL_EDGE',
        weight: rProps.weight ?? 0.8,
        inferred: rProps.inferred ?? false,
        createdAt: rProps.createdAt || new Date().toISOString(),
        updatedAt: rProps.updatedAt || new Date().toISOString(),
        createdBy: rProps.createdBy || 'Manual Workspace',
      });
    }

    console.log(`  Fetched ${edges.length} relationships.`);

    const outputData = {
      _meta: {
        provider: 'live',
        dataset: 'authentic_network_full',
        version: '2.0.0',
        description: 'Complete authentic live network dataset exported from local Neo4j graph.',
        exportedAt: new Date().toISOString(),
        stats: {
          totalNodes: realNodes.length + demoNodes.length,
          totalEdges: edges.length,
        },
      },
      realNodes,
      demoNodes,
      edges,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`\n  ✅ Successfully exported ${realNodes.length + demoNodes.length} nodes and ${edges.length} edges to:`);
    console.log(`     ${OUTPUT_PATH}\n`);

  } finally {
    await session.close();
    await driver.close();
  }
}

exportLocalGraph().catch(console.error);
