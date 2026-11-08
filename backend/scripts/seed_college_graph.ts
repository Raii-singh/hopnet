/**
 * HOPNet â College Graph Seed (Step 14)
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * Imports the 45-node college dataset into Neo4j via the v2 service layer.
 *
 * PROVENANCE DESIGN:
 *   Every seeded node receives two sparse Neo4j properties:
 *     sourceDataset  = "college"
 *     sourceRecordId = <dataset node id, e.g. "HNP-000001">
 *
 *   These are stored as ordinary sparse Neo4j node properties via the
 *   existing `[key: string]: unknown` extension on CreatePersonInput.
 *   No new schema or migrations are required.
 *
 *   On subsequent runs, the script queries:
 *     MATCH (p:Person {sourceDataset: "college", sourceRecordId: <id>})
 *   to determine whether a node already exists. If it does, the node
 *   is skipped (idempotent). This is resilient to:
 *     - changed email addresses
 *     - changed fullName
 *     - duplicate names across datasets
 *     - missing email
 *
 * SEEDING APPROACH:
 *   Service layer (createPerson / createRelationship) is called directly â
 *   not via HTTP â so all business rules (publicId generation, atomic
 *   relationship creation, nodeType immutability, REAL/DEMO validation) apply
 *   identically to a production write.
 *
 * IDEMPOTENCY:
 *   - Nodes already seeded (by sourceRecordId) are skipped.
 *   - Relationships between already-seeded nodes are checked by the
 *     relationship service duplicate rule and skipped if active.
 *   - Script may be run any number of times safely.
 *
 * DATA CLASSIFICATION:
 *   All 45 seeded nodes are live HOPNet entities.
 *   DEMO nodes are first-class live DEMO entities, not test data.
 *   This graph is the initial live HOPNet database.
 *
 * CREATED BY:
 *   "CollegeGraph Seed v1"
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register --transpile-only scripts/seed_college_graph.ts
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { verifyConnectivity, closeDriver } from '../src/config/neo4j';
import { findPersonBySourceRecord } from '../src/repositories/person.repository';
import { createPerson } from '../src/services/person.service';
import { createRelationship } from '../src/services/relationship.service';

// ââ Constants âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const DATASET_PATH = path.resolve(
  __dirname,
  '../../database/graph-providers/college/datasets/processed/college_graph_full.json'
);
const SOURCE_DATASET = 'college';
const CREATED_BY     = 'CollegeGraph Seed v1';

// ââ Types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface DatasetNode {
  id:                  string;
  publicId:            string;
  fullName:            string;
  username?:           string;
  email?:              string;
  phone?:              string;
  linkedinUrl?:        string;
  twitterHandle?:      string;
  company?:            string;
  cluster?:            string;
  influenceScore?:     number;
  connectionCount?:    number;
  realConnections?:    number;
  demoConnections?:    number;
  tags?:               string[];
  sourceConnectors?:   string[];
  nodeType:            'REAL' | 'DEMO';
  metadata?:           Record<string, unknown>;
}

interface DatasetEdge {
  id:                   string;
  source:               string;   // source record ID (e.g. "HNP-000001")
  target:               string;   // source record ID (e.g. "HNP-000002")
  relationshipType:     string;
  trustScore:           number;
  interactionFrequency: number;
  connectorSource:      string;
  edgeType?:            string;   // dataset uses "edgeType" â mapped to edgeKind in v2
}

interface Dataset {
  _meta: { provider: string; version: string; nodeCount: number; edgeCount: number };
  nodes: DatasetNode[];
  edges: DatasetEdge[];
}

// ââ Counters ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface SeedResult {
  nodesCreated:  number;
  nodesSkipped:  number;
  nodesFailed:   number;
  relsCreated:   number;
  relsSkipped:   number;
  relsFailed:    number;
  errors:        string[];
  /** sourceRecordId â new Neo4j UUID */
  nodeMap:       Map<string, string>;
}

// ââ Main ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function seedNodes(
  datasetNodes: DatasetNode[]
): Promise<{ result: SeedResult }> {
  const result: SeedResult = {
    nodesCreated: 0, nodesSkipped: 0, nodesFailed: 0,
    relsCreated:  0, relsSkipped:  0, relsFailed:  0,
    errors: [],
    nodeMap: new Map(),
  };

  console.log(`\n  Seeding ${datasetNodes.length} nodes...`);

  for (const n of datasetNodes) {
    try {
      // ââ Provenance check â is this source record already in Neo4j? ââââââ
      const existing = await findPersonBySourceRecord(SOURCE_DATASET, n.id);
      if (existing) {
        console.log(`    â© SKIP  ${n.id} â ${existing.id} (${existing.fullName})`);
        result.nodeMap.set(n.id, existing.id);
        result.nodesSkipped++;
        continue;
      }

      // ââ Create via service layer (applies all business rules) ââââââââââ
      const created = await createPerson({
        nodeType:        n.nodeType,
        fullName:        n.fullName,
        username:        n.username,
        email:           n.email,
        phone:           n.phone,
        company:         n.company,
        linkedinUrl:     n.linkedinUrl,
        twitterHandle:   n.twitterHandle,
        cluster:         n.cluster,
        tags:            n.tags,
        sourceConnectors: n.sourceConnectors,
        // ââ Provenance (stored as sparse properties) âââââââââââââââââââââ
        sourceDataset:   SOURCE_DATASET,
        sourceRecordId:  n.id,
        // ââ Origin metadata from the dataset âââââââââââââââââââââââââââââ
        ...(n.metadata ?? {}),
        createdBy:       CREATED_BY,
      });

      console.log(`    â CREATE ${n.id} â ${created.id} (${created.publicId}) ${n.fullName} [${n.nodeType}]`);
      result.nodeMap.set(n.id, created.id);
      result.nodesCreated++;

    } catch (err: any) {
      const msg = `Node ${n.id} (${n.fullName}): ${err.message ?? err}`;
      console.error(`    â FAIL  ${msg}`);
      result.errors.push(msg);
      result.nodesFailed++;
    }
  }

  return { result };
}

async function seedRelationships(
  datasetEdges: DatasetEdge[],
  nodeMap: Map<string, string>,
  result: SeedResult
): Promise<void> {
  console.log(`\n  Seeding ${datasetEdges.length} relationships...`);

  for (const e of datasetEdges) {
    const sourceId = nodeMap.get(e.source);
    const targetId = nodeMap.get(e.target);

    if (!sourceId || !targetId) {
      const msg = `Edge ${e.id}: cannot resolve ${e.source} â ${e.target} (node not in map)`;
      console.error(`    â SKIP  ${msg}`);
      result.errors.push(msg);
      result.relsFailed++;
      continue;
    }

    try {
      await createRelationship({
        sourceId,
        targetId,
        relationshipType:     e.relationshipType,
        trustScore:           e.trustScore,
        interactionFrequency: e.interactionFrequency,
        connectorSource:      e.connectorSource ?? CREATED_BY,
        createdBy:            CREATED_BY,
      });
      console.log(`    â REL  ${e.source} â ${e.target} [${e.relationshipType}]`);
      result.relsCreated++;
    } catch (err: any) {
      // DUPLICATE_RELATIONSHIP means this rel already exists â idempotent skip
      if (err?.code === 'DUPLICATE_RELATIONSHIP' || /duplicate/i.test(err?.message)) {
        console.log(`    â© SKIP  ${e.source} â ${e.target} [${e.relationshipType}] (duplicate)`);
        result.relsSkipped++;
      } else {
        const msg = `Edge ${e.id} (${e.source}â${e.target}): ${err.message ?? err}`;
        console.error(`    â FAIL  ${msg}`);
        result.errors.push(msg);
        result.relsFailed++;
      }
    }
  }
}

async function main() {
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  HOPNet â College Graph Seed (Step 14)');
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');

  await verifyConnectivity();
  console.log('  [Neo4j] Connected');

  // ââ Load dataset ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`  [ERROR] Dataset not found: ${DATASET_PATH}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8')) as Dataset;
  const { nodes, edges } = raw;

  console.log(`\n  Dataset loaded:`);
  console.log(`    Provider:  ${raw._meta.provider}`);
  console.log(`    Version:   ${raw._meta.version}`);
  console.log(`    Nodes:     ${nodes.length} (REAL: ${nodes.filter(n => n.nodeType === 'REAL').length}, DEMO: ${nodes.filter(n => n.nodeType === 'DEMO').length})`);
  console.log(`    Edges:     ${edges.length}`);

  console.log(`\n  Provenance: sourceDataset="${SOURCE_DATASET}", sourceRecordId=<dataset node id>`);
  console.log(`  Stored as sparse Neo4j properties on each Person node.\n`);

  // ââ Seed nodes ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const { result } = await seedNodes(nodes);

  // ââ Seed relationships ââââââââââââââââââââââââââââââââââââââââââââââââââ
  await seedRelationships(edges, result.nodeMap, result);

  // ââ Summary âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const realCreated  = nodes.filter(n => n.nodeType === 'REAL' && result.nodeMap.has(n.id) && result.nodesCreated > 0).length;
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  Seed Summary');
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log(`  Nodes:         ${result.nodesCreated} created, ${result.nodesSkipped} skipped, ${result.nodesFailed} failed`);
  console.log(`  Relationships: ${result.relsCreated} created, ${result.relsSkipped} skipped, ${result.relsFailed} failed`);
  console.log(`  ID mapping:    ${result.nodeMap.size}/${nodes.length} source records resolved`);
  if (result.errors.length > 0) {
    console.log(`\n  Errors:`);
    result.errors.forEach(e => console.log(`    â¢ ${e}`));
  }
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  await closeDriver();
  process.exit(result.nodesFailed > 0 || result.relsFailed > 0 ? 1 : 0);
}

main().catch(async err => {
  console.error('[Seed] Unhandled error:', err.message ?? err);
  await closeDriver();
  process.exit(1);
});
