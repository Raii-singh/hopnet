/**
 * HOPNet — Raj Shamani Network Neo4j Seeder (High-Performance Batch UNWIND)
 * ─────────────────────────────────────────────────────────────────────────────
 * Ingests 10,000 nodes and 25,239 relationships from:
 *   database/graph-providers/Raj/seed_raj.json
 * into local Neo4j in fast atomic batches.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { getSession, closeDriver } from '../src/config/neo4j';

const DATASET_PATH = path.resolve(__dirname, '../../database/graph-providers/Raj/seed_raj.json');
const SOURCE_DATASET = 'raj';
const BATCH_SIZE = 1000;

async function seedRajNetwork() {
  console.log(`[Seed] Loading dataset from ${DATASET_PATH}...`);
  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`Dataset not found at ${DATASET_PATH}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
  const nodes = raw.realNodes || [];
  const edges = raw.edges || [];

  console.log(`[Seed] Loaded ${nodes.length} nodes and ${edges.length} edges.`);

  const session = getSession();

  try {
    // 1. Ensure indexes exist for fast lookup
    console.log('[Seed] Ensuring index on Person(id) and Person(publicId)...');
    await session.run(`CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE`);
    await session.run(`CREATE INDEX IF NOT EXISTS FOR (p:Person) ON (p.publicId)`);
    await session.run(`CREATE INDEX IF NOT EXISTS FOR (p:Person) ON (p.sourceDataset)`);

    // 2. Batch insert nodes
    console.log(`[Seed] Inserting ${nodes.length} nodes in batches of ${BATCH_SIZE}...`);
    const startTime = Date.now();

    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE).map((n: any) => ({
        id: n.id,
        publicId: n.publicId,
        fullName: n.fullName,
        username: n.username || null,
        email: n.email || null,
        phone: n.phone || null,
        company: n.company || null,
        role: n.role || null,
        cluster: n.cluster || null,
        influenceScore: n.influenceScore || 70,
        nodeType: n.nodeType || 'REAL',
        tags: n.tags || [],
        sourceConnectors: n.sourceConnectors || ['Raj Shamani Network'],
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        createdBy: n.createdBy,
        isDeleted: false,
        sourceDataset: SOURCE_DATASET,
      }));

      await session.run(
        `
        UNWIND $batch AS item
        MERGE (p:Person {id: item.id})
        SET p += item
        `,
        { batch }
      );
      process.stdout.write(`  Inserted nodes: ${Math.min(i + BATCH_SIZE, nodes.length)} / ${nodes.length}\r`);
    }
    console.log(`\n[Seed] Nodes inserted in ${(Date.now() - startTime) / 1000}s.`);

    // 3. Batch insert relationships
    console.log(`[Seed] Inserting ${edges.length} relationships in batches of ${BATCH_SIZE}...`);
    const edgeStartTime = Date.now();

    for (let i = 0; i < edges.length; i += BATCH_SIZE) {
      const batch = edges.slice(i, i + BATCH_SIZE).map((e: any) => ({
        id: e.id,
        sourceId: e.sourceId,
        targetId: e.targetId,
        relationshipType: e.relationshipType,
        trustScore: e.trustScore,
        interactionFrequency: e.interactionFrequency,
        connectorSource: e.connectorSource || 'Network Ingest',
        edgeType: e.edgeType || 'REAL_EDGE',
        edgeKind: e.edgeType || 'REAL_EDGE',
        weight: e.weight,
        inferred: false,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        createdBy: e.createdBy,
        isDeleted: false,
        sourceDataset: SOURCE_DATASET,
      }));

      await session.run(
        `
        UNWIND $batch AS item
        MATCH (s:Person {id: item.sourceId})
        MATCH (t:Person {id: item.targetId})
        MERGE (s)-[r:CONNECTED {id: item.id}]->(t)
        SET r += item
        `,
        { batch }
      );
      process.stdout.write(`  Inserted edges: ${Math.min(i + BATCH_SIZE, edges.length)} / ${edges.length}\r`);
    }
    console.log(`\n[Seed] Relationships inserted in ${(Date.now() - edgeStartTime) / 1000}s.`);

    // 4. Verify counts in Neo4j
    const resNodes = await session.run(
      `MATCH (p:Person {sourceDataset: $src}) RETURN count(p) AS cnt`,
      { src: SOURCE_DATASET }
    );
    const resEdges = await session.run(
      `MATCH ()-[r:CONNECTED {sourceDataset: $src}]->() RETURN count(r) AS cnt`,
      { src: SOURCE_DATASET }
    );

    const nodeCount = resNodes.records[0].get('cnt').toNumber ? resNodes.records[0].get('cnt').toNumber() : Number(resNodes.records[0].get('cnt'));
    const edgeCount = resEdges.records[0].get('cnt').toNumber ? resEdges.records[0].get('cnt').toNumber() : Number(resEdges.records[0].get('cnt'));

    console.log(`\n[Seed] Verification in Neo4j:`);
    console.log(`  Nodes with sourceDataset='raj': ${nodeCount}`);
    console.log(`  Edges with sourceDataset='raj': ${edgeCount}`);
    console.log('[Seed] Seeding completed successfully!');
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
  } finally {
    await session.close();
    await closeDriver();
  }
}

seedRajNetwork();
