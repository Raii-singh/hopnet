/**
 * HOPNet — Live Graph Seed Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Imports the authentic live network dataset into Neo4j via the v2 service layer.
 * Dataset source: database/graph-providers/live/seed_live.json
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { verifyConnectivity, closeDriver } from '../src/config/neo4j';
import { findPersonBySourceRecord } from '../src/repositories/person.repository';
import { createPerson } from '../src/services/person.service';
import { createRelationship } from '../src/services/relationship.service';

const DATASET_PATH = path.resolve(
  __dirname,
  '../../database/graph-providers/live/seed_live.json'
);
const SOURCE_DATASET = 'live_authentic';
const CREATED_BY     = 'LiveGraph Seed v2';

interface DatasetNode {
  id:                  string;
  publicId?:           string;
  fullName:            string;
  username?:           string;
  email?:              string;
  phone?:              string;
  company?:            string;
  cluster?:            string;
  influenceScore?:     number;
  nodeType:            'REAL' | 'DEMO';
  tags?:               string[];
  sourceConnectors?:   string[];
}

interface DatasetEdge {
  id?:                 string;
  source?:             string;
  target?:             string;
  sourceId?:           string;
  targetId?:           string;
  sourcePublicId?:     string;
  targetPublicId?:     string;
  relationshipType:    string;
  trustScore?:         number;
  interactionFrequency?: number;
  connectorSource?:    string;
  edgeType?:           string;
  edgeKind?:           'REAL_EDGE' | 'DEMO_EDGE';
}

interface SeedResult {
  nodesCreated: number;
  nodesSkipped: number;
  nodesFailed:  number;
  relsCreated:  number;
  relsSkipped:  number;
  relsFailed:   number;
  nodeMap:      Map<string, string>;
  publicIdMap:  Map<string, string>;
  errors:       string[];
}

async function seedNodes(nodes: DatasetNode[]): Promise<{ result: SeedResult }> {
  const result: SeedResult = {
    nodesCreated: 0,
    nodesSkipped: 0,
    nodesFailed:  0,
    relsCreated:  0,
    relsSkipped:  0,
    relsFailed:   0,
    nodeMap:      new Map<string, string>(),
    publicIdMap:  new Map<string, string>(),
    errors:       [],
  };

  console.log(`\n── Seeding ${nodes.length} Person nodes ──`);

  for (const node of nodes) {
    try {
      const existing = await findPersonBySourceRecord(SOURCE_DATASET, node.id);
      if (existing) {
        result.nodeMap.set(node.id, existing.id);
        if (existing.publicId) result.publicIdMap.set(existing.publicId, existing.id);
        if (node.publicId) result.publicIdMap.set(node.publicId, existing.id);
        result.nodesSkipped++;
        console.log(`  [SKIP] Node '${node.fullName}' already exists (${existing.id})`);
        continue;
      }

      const created = await createPerson({
        nodeType:         node.nodeType,
        fullName:         node.fullName,
        username:         node.username,
        email:            node.email,
        phone:            node.phone,
        company:          node.company,
        cluster:          node.cluster,
        influenceScore:   node.influenceScore ?? 0,
        tags:             node.tags,
        sourceConnectors: node.sourceConnectors,
        sourceDataset:    SOURCE_DATASET,
        sourceRecordId:   node.id,
        createdBy:        CREATED_BY,
      });

      result.nodeMap.set(node.id, created.id);
      if (created.publicId) result.publicIdMap.set(created.publicId, created.id);
      if (node.publicId) result.publicIdMap.set(node.publicId, created.id);
      result.nodesCreated++;
      console.log(`  [CREATE] Person '${created.fullName}' (${created.publicId}) -> ${created.id}`);
    } catch (err: any) {
      result.nodesFailed++;
      const msg = `Failed node '${node.fullName}' (${node.id}): ${err.message}`;
      result.errors.push(msg);
      console.error(`  [FAIL] ${msg}`);
    }
  }

  return { result };
}

async function seedRelationships(edges: DatasetEdge[], nodeMap: Map<string, string>, publicIdMap: Map<string, string>, result: SeedResult): Promise<void> {
  console.log(`\n── Seeding ${edges.length} Relationships ──`);

  for (const edge of edges) {
    const rawSrc = edge.sourceId || edge.source;
    const rawTgt = edge.targetId || edge.target;

    const fromId = (rawSrc ? nodeMap.get(rawSrc) : undefined) || (edge.sourcePublicId ? publicIdMap.get(edge.sourcePublicId) : undefined);
    const toId   = (rawTgt ? nodeMap.get(rawTgt) : undefined) || (edge.targetPublicId ? publicIdMap.get(edge.targetPublicId) : undefined);

    if (!fromId || !toId) {
      result.relsFailed++;
      const msg = `Relationship missing endpoint ID map: source='${rawSrc || edge.sourcePublicId}' target='${rawTgt || edge.targetPublicId}'`;
      result.errors.push(msg);
      console.error(`  [SKIP] ${msg}`);
      continue;
    }

    try {
      const rel = await createRelationship({
        sourceId:             fromId,
        targetId:             toId,
        relationshipType:     edge.relationshipType || 'CONNECTS_WITH',
        trustScore:           edge.trustScore ?? 80,
        interactionFrequency: edge.interactionFrequency ?? 1,
        connectorSource:      edge.connectorSource || 'Manual Workspace',
        createdBy:            CREATED_BY,
      });

      result.relsCreated++;
      console.log(`  [CREATE] Rel ${edge.relationshipType} between ${fromId.slice(0, 8)}... and ${toId.slice(0, 8)}... (${rel.id})`);
    } catch (err: any) {
      if (err.code === 'DUPLICATE_RELATIONSHIP') {
        result.relsSkipped++;
        console.log(`  [SKIP] Rel already active between ${fromId.slice(0, 8)}... and ${toId.slice(0, 8)}...`);
      } else {
        result.relsFailed++;
        const msg = `Failed rel between ${fromId} and ${toId}: ${err.message}`;
        result.errors.push(msg);
        console.error(`  [FAIL] ${msg}`);
      }
    }
  }
}

async function run() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  HOPNet — Live Graph Seed');
  console.log('════════════════════════════════════════════════════════════\n');

  try {
    await verifyConnectivity();
  } catch (err: any) {
    console.error(`❌ Connection failed: ${err.message}`);
    process.exit(1);
  }

  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`[ERROR] Dataset not found: ${DATASET_PATH}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
  const realNodes: DatasetNode[] = raw.realNodes || [];
  const demoNodes: DatasetNode[] = raw.demoNodes || [];
  const allNodes: DatasetNode[] = [...realNodes, ...demoNodes];
  const edges: DatasetEdge[] = raw.edges || [];

  console.log(`  Dataset loaded from ${path.basename(DATASET_PATH)}:`);
  console.log(`    Nodes: ${allNodes.length} (${realNodes.length} REAL, ${demoNodes.length} DEMO)`);
  console.log(`    Edges: ${edges.length}\n`);

  const { result } = await seedNodes(allNodes);
  await seedRelationships(edges, result.nodeMap, result.publicIdMap, result);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  Seed Summary');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Nodes:         ${result.nodesCreated} created, ${result.nodesSkipped} skipped, ${result.nodesFailed} failed`);
  console.log(`  Relationships: ${result.relsCreated} created, ${result.relsSkipped} skipped, ${result.relsFailed} failed`);
  console.log('════════════════════════════════════════════════════════════\n');

  await closeDriver();
}

run().catch(console.error);
