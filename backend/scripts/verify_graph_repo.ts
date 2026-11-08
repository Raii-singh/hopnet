/**
 * HOPNet â Graph Repository Verification Script
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * Verifies every exported function in graph.repository.ts against the live
 * local Neo4j database.
 *
 * Test topology (all hard-deleted at the end):
 *
 *   GR1 (REAL) ââREAL_EDGEâââº GR2 (REAL)
 *   GR1 (REAL) ââDEMO_EDGEâââº GD1 (DEMO)
 *   GD1 (DEMO) ââDEMO_EDGEâââº GR3 (REAL)   â creates REALâDEMOâREAL chain
 *   GR2 (REAL) ââREAL_EDGEâââº GR3 (REAL)
 *
 *   GR4 (REAL) is isolated (no connections) â for edge-case tests
 *
 * Expected hop distances from GR1:
 *   hop 1 â {GR2, GD1}
 *   hop 2 â {GR2, GD1, GR3}
 *   hop 2 (includeDemo=false) â {GR2, GR3}
 *
 * Relationships are created directly via Cypher in this script because
 * relationship.repository.ts is Step 10 (not yet implemented).
 *
 * Run: npx ts-node -r tsconfig-paths/register --transpile-only scripts/verify_graph_repo.ts
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { verifyConnectivity, getSession, closeDriver } from '../src/config/neo4j';
import {
  getNeighbourhood,
  getPersonWithConnections,
  getDegrees,
  pathExists,
} from '../src/repositories/graph.repository';

// ââ Counters âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

let passed = 0;
let failed = 0;

function ok(label: string) { console.log(`  â ${label}`); passed++; }
function fail(label: string, err?: unknown) { console.error(`  â ${label}`, err ?? ''); failed++; }
function assert(cond: boolean, label: string, extra?: unknown) {
  if (cond) ok(label);
  else fail(label, extra ?? '');
}

// ââ Test node IDs âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const ids = {
  gr1: uuidv4(), gr2: uuidv4(), gr3: uuidv4(), gr4: uuidv4(),
  gd1: uuidv4(),
};

// ââ Setup helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function createTestGraph() {
  const session = getSession();
  try {
    const now = new Date().toISOString();

    // Create 4 REAL + 1 DEMO node
    await session.run(`
      CREATE (gr1:Person {id: $gr1, publicId: 'GTEST_HNP-001', nodeType: 'REAL',
                          fullName: 'Graph Real 1', createdAt: $now, updatedAt: $now, createdBy: 'GraphVerify'})
      CREATE (gr2:Person {id: $gr2, publicId: 'GTEST_HNP-002', nodeType: 'REAL',
                          fullName: 'Graph Real 2', createdAt: $now, updatedAt: $now, createdBy: 'GraphVerify'})
      CREATE (gr3:Person {id: $gr3, publicId: 'GTEST_HNP-003', nodeType: 'REAL',
                          fullName: 'Graph Real 3', createdAt: $now, updatedAt: $now, createdBy: 'GraphVerify'})
      CREATE (gr4:Person {id: $gr4, publicId: 'GTEST_HNP-004', nodeType: 'REAL',
                          fullName: 'Graph Real 4 (isolated)', createdAt: $now, updatedAt: $now, createdBy: 'GraphVerify'})
      CREATE (gd1:Person {id: $gd1, publicId: 'GTEST_DNP-001', nodeType: 'DEMO',
                          fullName: 'Graph Demo 1', createdAt: $now, updatedAt: $now, createdBy: 'GraphVerify'})
    `, { ...ids, now });

    // Create relationships: GR1âGR2, GR1âGD1, GD1âGR3, GR2âGR3
    await session.run(`
      MATCH (gr1:Person {id: $gr1})
      MATCH (gr2:Person {id: $gr2})
      MATCH (gr3:Person {id: $gr3})
      MATCH (gd1:Person {id: $gd1})
      CREATE (gr1)-[:CONNECTED {id: $r1, sourceId: $gr1, targetId: $gr2,
                                 relationshipType: 'colleague', edgeKind: 'REAL_EDGE',
                                 trustScore: 0.8, interactionFrequency: 0.7,
                                 connectorSource: 'GraphVerify', inferred: false,
                                 confidenceScore: 1.0, createdBy: 'GraphVerify',
                                 createdAt: $now, updatedAt: $now}]->(gr2)
      CREATE (gr1)-[:CONNECTED {id: $r2, sourceId: $gr1, targetId: $gd1,
                                 relationshipType: 'acquaintance', edgeKind: 'DEMO_EDGE',
                                 trustScore: 0.5, interactionFrequency: 0.4,
                                 connectorSource: 'GraphVerify', inferred: false,
                                 confidenceScore: 1.0, createdBy: 'GraphVerify',
                                 createdAt: $now, updatedAt: $now}]->(gd1)
      CREATE (gd1)-[:CONNECTED {id: $r3, sourceId: $gd1, targetId: $gr3,
                                 relationshipType: 'acquaintance', edgeKind: 'DEMO_EDGE',
                                 trustScore: 0.4, interactionFrequency: 0.3,
                                 connectorSource: 'GraphVerify', inferred: false,
                                 confidenceScore: 1.0, createdBy: 'GraphVerify',
                                 createdAt: $now, updatedAt: $now}]->(gr3)
      CREATE (gr2)-[:CONNECTED {id: $r4, sourceId: $gr2, targetId: $gr3,
                                 relationshipType: 'colleague', edgeKind: 'REAL_EDGE',
                                 trustScore: 0.7, interactionFrequency: 0.6,
                                 connectorSource: 'GraphVerify', inferred: false,
                                 confidenceScore: 1.0, createdBy: 'GraphVerify',
                                 createdAt: $now, updatedAt: $now}]->(gr3)
    `, { ...ids, r1: uuidv4(), r2: uuidv4(), r3: uuidv4(), r4: uuidv4(), now });

    console.log('  ð Test graph created (4 REAL + 1 DEMO node, 4 relationships)');
  } finally {
    await session.close();
  }
}

async function hardDeleteTestGraph() {
  const session = getSession();
  try {
    await session.run(
      `MATCH (p:Person) WHERE p.id IN $ids DETACH DELETE p`,
      { ids: Object.values(ids) }
    );
    console.log(`\n  ð§¹ Hard-deleted ${Object.values(ids).length} test nodes from Neo4j.`);
  } finally {
    await session.close();
  }
}

// ââ Test suite âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function run() {
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  HOPNet â Graph Repository Verification');
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  // 1. Connectivity
  console.log('ââ 1. Neo4j connectivity ââ');
  try {
    await verifyConnectivity();
    ok('Connected to Neo4j');
  } catch (e) {
    fail('Neo4j connection failed', e);
    process.exit(1);
  }

  // Setup
  console.log('\nââ Setup: Creating test graph ââ');
  await createTestGraph();

  // 2. getNeighbourhood â depth 1 (includeDemo=true default)
  console.log('\nââ 2. getNeighbourhood (depth=1, includeDemo=true) ââ');
  try {
    const { nodes, relationships } = await getNeighbourhood(ids.gr1, 1);
    const nodeIds = nodes.map(n => n.id);

    assert(nodeIds.includes(ids.gr1), 'root (GR1) included at depth=1');
    assert(nodeIds.includes(ids.gr2), 'GR2 (hop 1 REAL) included');
    assert(nodeIds.includes(ids.gd1), 'GD1 (hop 1 DEMO) included');
    assert(!nodeIds.includes(ids.gr3), 'GR3 (hop 2) NOT included at depth=1');
    assert(!nodeIds.includes(ids.gr4), 'GR4 (isolated) NOT included');
    assert(nodes.length === 3, `node count = 3 (got ${nodes.length})`);
    assert(relationships.length === 2, `relationship count = 2 (got ${relationships.length})`);
    assert(relationships.every(r => r.id !== undefined), 'all rels have id');
    assert(relationships.every(r => r.edgeKind !== undefined), 'all rels have edgeKind');
  } catch (e) {
    fail('getNeighbourhood depth=1 threw', e);
  }

  // 3. getNeighbourhood â depth 2 (includeDemo=true)
  console.log('\nââ 3. getNeighbourhood (depth=2, includeDemo=true) ââ');
  try {
    const { nodes, relationships } = await getNeighbourhood(ids.gr1, 2);
    const nodeIds = nodes.map(n => n.id);

    assert(nodeIds.includes(ids.gr1), 'root (GR1) included');
    assert(nodeIds.includes(ids.gr2), 'GR2 (hop 1) included');
    assert(nodeIds.includes(ids.gd1), 'GD1 (hop 1 DEMO) included');
    assert(nodeIds.includes(ids.gr3), 'GR3 (hop 2 via GR2 or GD1) included');
    assert(!nodeIds.includes(ids.gr4), 'GR4 (isolated) NOT included');
    assert(nodes.length === 4, `node count = 4 (got ${nodes.length})`);
    // 4 relationships: GR1âGR2, GR1âGD1, GD1âGR3, GR2âGR3
    assert(relationships.length === 4, `relationship count = 4 (got ${relationships.length})`);

    // Verify node types and edgeKind mapping
    const realNodes = nodes.filter(n => n.nodeType === 'REAL');
    const demoNodes = nodes.filter(n => n.nodeType === 'DEMO');
    assert(realNodes.length === 3, 'exactly 3 REAL nodes');
    assert(demoNodes.length === 1, 'exactly 1 DEMO node');

    const realEdges = relationships.filter(r => r.edgeKind === 'REAL_EDGE');
    const demoEdges = relationships.filter(r => r.edgeKind === 'DEMO_EDGE');
    assert(realEdges.length === 2, 'exactly 2 REAL_EDGE relationships');
    assert(demoEdges.length === 2, 'exactly 2 DEMO_EDGE relationships');
  } catch (e) {
    fail('getNeighbourhood depth=2 threw', e);
  }

  // 4. getNeighbourhood â depth 2, includeDemo=false
  console.log('\nââ 4. getNeighbourhood (depth=2, includeDemo=false) ââ');
  try {
    const { nodes, relationships } = await getNeighbourhood(ids.gr1, 2, { includeDemo: false });
    const nodeIds = nodes.map(n => n.id);

    assert(nodeIds.includes(ids.gr1), 'root (GR1) included (REAL)');
    assert(nodeIds.includes(ids.gr2), 'GR2 (hop 1 REAL) included');
    assert(nodeIds.includes(ids.gr3), 'GR3 (hop 2 via GR2) included');
    assert(!nodeIds.includes(ids.gd1), 'GD1 (DEMO) EXCLUDED when includeDemo=false');
    assert(nodes.every(n => n.nodeType === 'REAL'), 'all returned nodes are REAL');
    // Only REALâREAL relationships: GR1âGR2, GR2âGR3
    assert(relationships.length === 2, `relationship count = 2 REAL_EDGE (got ${relationships.length})`);
    assert(relationships.every(r => r.edgeKind === 'REAL_EDGE'), 'all rels are REAL_EDGE');
  } catch (e) {
    fail('getNeighbourhood includeDemo=false threw', e);
  }

  // 5. getNeighbourhood â non-existent root
  console.log('\nââ 5. getNeighbourhood (non-existent root) ââ');
  try {
    const { nodes, relationships } = await getNeighbourhood('00000000-0000-0000-0000-000000000000', 2);
    assert(nodes.length === 0, 'returns empty nodes for non-existent root');
    assert(relationships.length === 0, 'returns empty relationships for non-existent root');
  } catch (e) {
    fail('getNeighbourhood non-existent root threw', e);
  }

  // 6. getNeighbourhood â isolated node
  console.log('\nââ 6. getNeighbourhood (isolated node) ââ');
  try {
    const { nodes, relationships } = await getNeighbourhood(ids.gr4, 2);
    assert(nodes.length === 1, 'isolated node returns only itself');
    assert(nodes[0].id === ids.gr4, 'isolated node id correct');
    assert(relationships.length === 0, 'isolated node has no relationships');
  } catch (e) {
    fail('getNeighbourhood isolated node threw', e);
  }

  // 7. getPersonWithConnections â hub node
  console.log('\nââ 7. getPersonWithConnections (hub node GR1) ââ');
  try {
    const { node, relationships } = await getPersonWithConnections(ids.gr1);
    assert(node !== null, 'node found');
    assert(node?.nodeType === 'REAL', 'nodeType correct');
    assert(node?.fullName === 'Graph Real 1', 'fullName correct');
    // GR1 has 2 outgoing rels (GR1âGR2, GR1âGD1) â undirected gives 2 distinct rels
    assert(relationships.length === 2, `GR1 has 2 direct rels (got ${relationships.length})`);
  } catch (e) {
    fail('getPersonWithConnections hub threw', e);
  }

  // 8. getPersonWithConnections â isolated node
  console.log('\nââ 8. getPersonWithConnections (isolated) ââ');
  try {
    const { node, relationships } = await getPersonWithConnections(ids.gr4);
    assert(node !== null, 'isolated node found');
    assert(relationships.length === 0, 'isolated node has 0 connections');
  } catch (e) {
    fail('getPersonWithConnections isolated threw', e);
  }

  // 9. getPersonWithConnections â non-existent
  console.log('\nââ 9. getPersonWithConnections (non-existent) ââ');
  try {
    const { node, relationships } = await getPersonWithConnections('non-existent-id');
    assert(node === null, 'returns null for non-existent id');
    assert(relationships.length === 0, 'returns empty rels for non-existent id');
  } catch (e) {
    fail('getPersonWithConnections non-existent threw', e);
  }

  // 10. getDegrees â hub node (GR1 has 2 direct connections: GR2 + GD1)
  console.log('\nââ 10. getDegrees (hub node GR1) ââ');
  try {
    const deg = await getDegrees(ids.gr1);
    assert(deg.total === 2, `total degree = 2 (got ${deg.total})`);
    assert(deg.realEdges === 1, `realEdges = 1 (got ${deg.realEdges})`);
    assert(deg.demoEdges === 1, `demoEdges = 1 (got ${deg.demoEdges})`);
  } catch (e) {
    fail('getDegrees hub threw', e);
  }

  // 11. getDegrees â GR3 has 2 incoming rels (GD1âGR3, GR2âGR3)
  console.log('\nââ 11. getDegrees (GR3 with 2 incoming) ââ');
  try {
    const deg = await getDegrees(ids.gr3);
    assert(deg.total === 2, `total degree = 2 (got ${deg.total})`);
    assert(deg.realEdges === 1, `realEdges = 1 (got ${deg.realEdges})`);
    assert(deg.demoEdges === 1, `demoEdges = 1 (got ${deg.demoEdges})`);
  } catch (e) {
    fail('getDegrees GR3 threw', e);
  }

  // 12. getDegrees â isolated node
  console.log('\nââ 12. getDegrees (isolated) ââ');
  try {
    const deg = await getDegrees(ids.gr4);
    assert(deg.total === 0, `isolated node total degree = 0 (got ${deg.total})`);
    assert(deg.realEdges === 0, `realEdges = 0 (got ${deg.realEdges})`);
    assert(deg.demoEdges === 0, `demoEdges = 0 (got ${deg.demoEdges})`);
  } catch (e) {
    fail('getDegrees isolated threw', e);
  }

  // 13. getDegrees â non-existent
  console.log('\nââ 13. getDegrees (non-existent) ââ');
  try {
    const deg = await getDegrees('00000000-0000-0000-0000-000000000000');
    assert(deg.total === 0, 'non-existent node â total 0');
  } catch (e) {
    fail('getDegrees non-existent threw', e);
  }

  // 14. pathExists â connected at 2 hops
  console.log('\nââ 14. pathExists ââ');
  try {
    assert(await pathExists(ids.gr1, ids.gr3, 2), 'GR1âGR3 connected at 2 hops');
    assert(await pathExists(ids.gr1, ids.gr2, 1), 'GR1âGR2 connected at 1 hop');
    assert(!(await pathExists(ids.gr1, ids.gr4, 3)), 'GR1âGR4 NOT connected (isolated)');
    assert(!(await pathExists(ids.gr1, ids.gr3, 1)), 'GR1âGR3 NOT connected at 1 hop');
    assert(!(await pathExists('non-existent', ids.gr1, 2)), 'non-existent node â false');
  } catch (e) {
    fail('pathExists threw', e);
  }

  // 15. Sparse properties preserved
  console.log('\nââ 15. Sparse property contract ââ');
  try {
    const { nodes } = await getNeighbourhood(ids.gr1, 1);
    const gr1 = nodes.find(n => n.id === ids.gr1);
    assert(gr1 !== undefined, 'root node found');
    assert(gr1?.fullName === 'Graph Real 1', 'fullName preserved');
    // phone, email, company were not set â must be absent (not null)
    assert(gr1?.phone === undefined, 'phone absent (sparse)');
    assert(gr1?.email === undefined, 'email absent (sparse)');
    assert(gr1?.company === undefined, 'company absent (sparse)');
  } catch (e) {
    fail('Sparse property contract threw', e);
  }

  // ââ Cleanup ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  await hardDeleteTestGraph();

  // ââ Results âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  await closeDriver();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('[GraphVerify] Unhandled error:', err.message ?? err);
  process.exit(1);
});
