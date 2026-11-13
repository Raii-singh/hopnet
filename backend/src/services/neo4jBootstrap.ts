import * as fs from 'fs';
import * as path from 'path';
import { getSession } from '../config/neo4j';

const BATCH_SIZE = 1000;
const SOURCE_DATASET = 'raj';

function findRajDatasetPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), '../database/graph-providers/Raj/seed_raj.json'),
    path.resolve(process.cwd(), 'database/graph-providers/Raj/seed_raj.json'),
    path.resolve(__dirname, '../../../../database/graph-providers/Raj/seed_raj.json'),
    path.resolve(__dirname, '../../../database/graph-providers/Raj/seed_raj.json'),
    path.resolve(__dirname, '../../database/graph-providers/Raj/seed_raj.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function bootstrapNeo4j(): Promise<void> {
  const session = getSession();

  try {
    // 1. Ensure basic schema constraints
    await session.run(`CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE`).catch(() => {});
    await session.run(`CREATE INDEX IF NOT EXISTS FOR (p:Person) ON (p.publicId)`).catch(() => {});
    await session.run(`CREATE INDEX IF NOT EXISTS FOR (p:Person) ON (p.sourceDataset)`).catch(() => {});

    // 2. Check if Raj network is already seeded
    const checkRes = await session.run(
      `MATCH (p:Person {sourceDataset: $sourceDataset}) RETURN count(p) AS count`,
      { sourceDataset: SOURCE_DATASET }
    );

    const rajCount = checkRes.records[0]?.get('count')?.toNumber?.() ?? Number(checkRes.records[0]?.get('count') || 0);

    if (rajCount >= 10000) {
      console.log(`[Bootstrap] Raj Shamani Network is already seeded (${rajCount} nodes in Neo4j).`);
      return;
    }

    const datasetPath = findRajDatasetPath();
    if (!datasetPath) {
      console.warn('[Bootstrap] seed_raj.json not found in candidate paths. Skipping auto-seed.');
      return;
    }

    console.log(`[Bootstrap] Starting ingestion of Raj Shamani dataset from ${datasetPath}...`);
    const raw = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
    const nodes = raw.realNodes || [];
    const edges = raw.edges || [];

    const startTime = Date.now();

    // Batch insert nodes
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
    }
    console.log(`[Bootstrap] Inserted ${nodes.length} nodes in ${(Date.now() - startTime) / 1000}s.`);

    // Batch insert edges
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
        MATCH (a:Person {id: item.sourceId})
        MATCH (b:Person {id: item.targetId})
        MERGE (a)-[r:CONNECTED {id: item.id}]->(b)
        SET r += item
        `,
        { batch }
      );
    }

    console.log(`[Bootstrap] Inserted ${edges.length} edges in ${(Date.now() - edgeStartTime) / 1000}s.`);
    console.log(`[Bootstrap] Successfully populated Raj Shamani Network into Neo4j! Total time: ${(Date.now() - startTime) / 1000}s.`);
  } catch (error) {
    console.error('[Bootstrap] Error during Neo4j bootstrapping:', error);
  } finally {
    await session.close();
  }
}

