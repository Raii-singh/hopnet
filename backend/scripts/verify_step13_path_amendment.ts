/**
 * HOPNet â Step 13 Path Amendment Verification
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * Tests for the constrained findPath() amendment (Option A):
 *   - getNeighbourhood â BFS + collegeConstraint â Dijkstra â reconstructPath
 *
 * This test suite verifies that the path endpoint uses the SAME definition
 * of traversable connectivity as the subgraph endpoint. A physically existing
 * path that violates the REAL/DEMO constraint is NOT returned.
 *
 * Weight / cost distinction confirmed:
 *   relationship.weight = trustScore * 0.6 + interactionFrequency * 0.4 (strength, 0â1)
 *   Dijkstra cost per edge = 1 - weight  (friction, lower = stronger path)
 *   totalCost = sum of (1 - weight) per edge on optimal path
 *
 * Test graph topology (same as S13):
 *
 *   REAL_A ââcolleague(ts=0.8, freq=0.7)âââ¶ REAL_B ââcolleague(ts=0.7, freq=0.6)âââ¶ REAL_C
 *     â                                         â
 *     â acquaintance(ts=0.5, freq=0.3)           â mentor(ts=0.6, freq=0.4)
 *     â¼                                         â¼
 *   DEMO_D ââally(ts=0.4, freq=0.3)âââ¶ DEMO_E ââally(ts=0.3, freq=0.2)âââ¶ REAL_F
 *
 * Key cases:
 *   AâBâC  : REALâREAL valid path (weight-optimal via Dijkstra)
 *   AâD    : REALâDEMO valid (depth 1, includeDemo=true)
 *   AâF    : physically possible (AâBâEâF) but BLOCKED by constraint (EâF = DEMOâREAL)
 *   DâE    : DEMOâDEMO valid path
 *   DâA    : DEMOâREAL blocked
 *   AâF, includeDemo=false: blocked (both by constraint AND by DEMO exclusion)
 *   AâC, includeDemo=false: valid REAL-only path
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register --transpile-only scripts/verify_step13_path_amendment.ts
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { verifyConnectivity, getSession, closeDriver } from '../src/config/neo4j';
import { findPath } from '../src/services/graph.service.v2';
import { HOPNetError } from '../src/services/errors';

// ââ Counters ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

let passed = 0;
let failed = 0;
const createdNodeIds: string[] = [];

function ok(label: string)           { console.log(`  â ${label}`); passed++; }
function fail(label: string, e?: unknown) { console.error(`  â ${label}`, e ?? ''); failed++; }
function assert(c: boolean, label: string, extra?: unknown) { c ? ok(label) : fail(label, extra); }

async function hardDeleteAll() {
  if (!createdNodeIds.length) return;
  const s = getSession();
  try {
    await s.run(`MATCH (p:Person) WHERE p.id IN $ids DETACH DELETE p`, { ids: createdNodeIds });
    console.log(`\n  ð§¹ Hard-deleted ${createdNodeIds.length} test node(s) + relationships.`);
  } finally { await s.close(); }
}

const BASE = '/api/v2';

async function createPerson(nodeType: 'REAL' | 'DEMO', name: string): Promise<any> {
  const r = await request(app)
    .post(`${BASE}/persons`)
    .send({ nodeType, fullName: name, createdBy: 'S13PathTest' });
  createdNodeIds.push(r.body.id);
  return r.body;
}

async function createRel(sourceId: string, targetId: string, type: string, ts: number, freq: number): Promise<any> {
  const r = await request(app)
    .post(`${BASE}/relationships`)
    .send({ sourceId, targetId, relationshipType: type, trustScore: ts, interactionFrequency: freq, createdBy: 'S13PathTest' });
  return r.body;
}

async function run() {
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  HOPNet â Step 13 Path Amendment Verification');
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('\n  Weight/Cost semantics:');
  console.log('    relationship.weight = trustScore * 0.6 + interactionFrequency * 0.4  (strength)');
  console.log('    Dijkstra cost = 1 - weight  (friction)');
  console.log('    totalCost = sum(1 - weight) per path edge  (lower = stronger path)');
  console.log('    constraint: collegeConstraint (DEMO â REAL: BLOCKED)\n');

  await verifyConnectivity();
  console.log('  [Neo4j] Connected\n');

  // Build test graph
  console.log('  Building test topology...');
  const realA = await createPerson('REAL', 'PA-RealA');
  const realB = await createPerson('REAL', 'PA-RealB');
  const realC = await createPerson('REAL', 'PA-RealC');
  const demoD = await createPerson('DEMO', 'PA-DemoD');
  const demoE = await createPerson('DEMO', 'PA-DemoE');
  const realF = await createPerson('REAL', 'PA-RealF');

  // Weights computed:
  //   relAB: ts=0.8, freq=0.7 â weight = 0.8*0.6 + 0.7*0.4 = 0.48+0.28 = 0.76 â cost = 0.24
  //   relBC: ts=0.7, freq=0.6 â weight = 0.42+0.24 = 0.66 â cost = 0.34
  //   relBE: ts=0.6, freq=0.4 â weight = 0.36+0.16 = 0.52 â cost = 0.48
  //   relAD: ts=0.5, freq=0.3 â weight = 0.30+0.12 = 0.42 â cost = 0.58
  //   relDE: ts=0.4, freq=0.3 â weight = 0.24+0.12 = 0.36 â cost = 0.64
  //   relEF: ts=0.3, freq=0.2 â weight = 0.18+0.08 = 0.26 â cost = 0.74
  // Path AâBâC: cost = 0.24 + 0.34 = 0.58
  // Path AâBâEâF: physically 0.24+0.48+0.74 = 1.46 BUT EâF = DEMOâREAL = BLOCKED
  // Path AâDâEâF: physically 0.58+0.64+0.74 = 1.96 BUT EâF = DEMOâREAL = BLOCKED

  await createRel(realA.id, realB.id, 'colleague',    0.8, 0.7); // cost 0.24
  await createRel(realB.id, realC.id, 'colleague',    0.7, 0.6); // cost 0.34
  await createRel(realA.id, demoD.id, 'acquaintance', 0.5, 0.3); // cost 0.58
  await createRel(realB.id, demoE.id, 'mentor',       0.6, 0.4); // cost 0.48
  await createRel(demoD.id, demoE.id, 'ally',         0.4, 0.3); // cost 0.64
  await createRel(demoE.id, realF.id, 'ally',         0.3, 0.2); // cost 0.74

  console.log('  REAL_A â REAL_B â REAL_C');
  console.log('  REAL_A â DEMO_D â DEMO_E â REAL_F (constraint: EâF blocked)');
  console.log('  REAL_B â DEMO_E\n');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA1: REAL â REAL valid path
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('ââ PA1: REAL â REAL path (A â C) ââ');

  const pathAC = await findPath(realA.id, realC.id, 6, true);
  assert(pathAC.exists, 'PA1: AâC path exists');
  assert(pathAC.path !== null, 'PA1: path is non-null');
  assert(pathAC.path!.nodeIds[0] === realA.id, 'PA1: path starts at A');
  assert(pathAC.path!.nodeIds[pathAC.path!.nodeIds.length - 1] === realC.id, 'PA1: path ends at C');
  assert(pathAC.path!.nodes.length === pathAC.path!.nodeIds.length, 'PA1: nodes[] length matches nodeIds[]');
  assert(pathAC.path!.nodes[0].id === realA.id, 'PA1: first GraphNode = A');
  assert(pathAC.path!.nodes[0].hopDistance === 0, 'PA1: A hopDistance = 0 (start)');
  assert(pathAC.path!.nodes[1].hopDistance === 1, 'PA1: B hopDistance = 1');
  assert(pathAC.path!.nodes[2].hopDistance === 2, 'PA1: C hopDistance = 2 (end)');
  assert(typeof pathAC.totalCost === 'number', 'PA1: totalCost is number');
  assert(pathAC.totalCost! > 0, `PA1: totalCost > 0 (got ${pathAC.totalCost})`);

  // Verify totalCost = Dijkstra cost (NOT sum of weights)
  // Expected Dijkstra cost for AâBâC: (1-0.76) + (1-0.66) = 0.24 + 0.34 = 0.58
  const expectedAC = Math.round((0.24 + 0.34) * 10000) / 10000;
  const gotAC = pathAC.totalCost!;
  assert(
    Math.abs(gotAC - expectedAC) < 0.01,
    `PA1: totalCost = Dijkstra friction cost ~${expectedAC} (got ${gotAC})`
  );
  console.log(`  â AâC totalCost = ${gotAC} (friction sum, NOT weight sum)`);

  // All path nodes are REAL
  assert(pathAC.path!.nodes.every(n => n.nodeType === 'REAL'), 'PA1: all path nodes are REAL');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA2: REAL â DEMO valid path (includeDemo=true)
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA2: REAL â DEMO path (A â D, includeDemo=true) ââ');

  const pathAD = await findPath(realA.id, demoD.id, 6, true);
  assert(pathAD.exists, 'PA2: AâD path exists with includeDemo=true');
  assert(pathAD.path!.nodeIds[pathAD.path!.nodeIds.length - 1] === demoD.id, 'PA2: path ends at DEMO_D');
  assert(pathAD.path!.nodes.some(n => n.nodeType === 'DEMO'), 'PA2: path includes DEMO node');
  console.log(`  â AâD path: ${pathAD.path!.nodeIds.length} hops, cost=${pathAD.totalCost}`);

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA3: REAL â DEMO excluded when includeDemo=false
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA3: REAL â DEMO blocked when includeDemo=false ââ');

  const pathAD_noDemo = await findPath(realA.id, demoD.id, 6, false);
  assert(!pathAD_noDemo.exists, 'PA3: AâD path does NOT exist with includeDemo=false');
  assert(pathAD_noDemo.path === null, 'PA3: path is null with includeDemo=false');
  console.log('  â DEMO target excluded by includeDemo=false: correct');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA4: REAL â DEMO â REAL blocked by constraint
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA4: REAL â DEMO â REAL blocked by constraint (A â F) ââ');

  const pathAF = await findPath(realA.id, realF.id, 6, true);
  assert(!pathAF.exists, 'PA4: AâF path BLOCKED (Aâ...âDEMO_EâREAL_F = DEMOâREAL)');
  assert(pathAF.path === null, 'PA4: path is null (constraint blocked)');
  assert(pathAF.totalCost === null, 'PA4: totalCost is null');
  console.log('  â AâF: physically exists but DEMOâREAL violation. Correctly blocked.');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA5: DEMO â DEMO valid path
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA5: DEMO â DEMO path (D â E) ââ');

  const pathDE = await findPath(demoD.id, demoE.id, 6, true);
  assert(pathDE.exists, 'PA5: DâE path exists (DEMOâDEMO allowed)');
  assert(pathDE.path!.nodeIds[0] === demoD.id, 'PA5: path starts at D');
  assert(pathDE.path!.nodeIds[1] === demoE.id, 'PA5: path ends at E');
  console.log(`  â DâE (DEMOâDEMO) path: exists=true, cost=${pathDE.totalCost}`);

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA6: DEMO â REAL blocked
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA6: DEMO â REAL blocked (D â A) ââ');

  const pathDA = await findPath(demoD.id, realA.id, 6, true);
  assert(!pathDA.exists, 'PA6: DâA path BLOCKED (DEMOâREAL by constraint)');
  assert(pathDA.path === null, 'PA6: path is null');
  console.log('  â DâA (DEMOâREAL): correctly blocked by constraint.');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA7: Physically existing path that violates HOPNet constraint
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA7: Physically existing path blocked by constraint ââ');

  // REAL_F is physically reachable from REAL_A (via AâBâEâF).
  // But EâF is DEMOâREAL â blocked.
  // The old unconstrained Cypher shortestPath would return this path.
  // The new constrained findPath must NOT.
  const pathAF_v2 = await findPath(realA.id, realF.id, 6, true);
  assert(!pathAF_v2.exists,
    'PA7: AâF physically exists but HOPNet constraint blocks DEMOâREAL â correctly not returned');
  assert(pathAF_v2.totalCost === null, 'PA7: totalCost null for constraint-blocked physical path');
  console.log('  â The new constrained findPath correctly rejects what old unconstrained shortestPath would return.');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA8: No path (isolated node)
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA8: No path (isolated node) ââ');

  const isolated = await createPerson('REAL', 'PA-Isolated');
  const noPath = await findPath(realA.id, isolated.id, 6, true);
  assert(!noPath.exists, 'PA8: no path to isolated node â exists = false');
  assert(noPath.path === null, 'PA8: path = null');
  assert(noPath.totalCost === null, 'PA8: totalCost = null');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA9: maxDepth boundary
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA9: maxDepth boundary ââ');

  // AâC requires 2 hops. depth=1 should not find it.
  const pathAC_d1 = await findPath(realA.id, realC.id, 1, false);
  assert(!pathAC_d1.exists, 'PA9: AâC not found at depth 1 (requires 2 hops)');

  // At depth 2, AâC is found.
  const pathAC_d2 = await findPath(realA.id, realC.id, 2, false);
  assert(pathAC_d2.exists, 'PA9: AâC found at depth 2');

  // depth=0 clamped to 1
  const pathAC_d0 = await findPath(realA.id, realB.id, 0, false);
  assert(pathAC_d0.exists, 'PA9: depth 0 clamped to 1, AâB (1 hop) still found');

  // depth=99 clamped to 6
  const pathAC_d99 = await findPath(realA.id, realC.id, 99, false);
  assert(pathAC_d99.exists, 'PA9: depth 99 clamped to 6, AâC still found');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA10: includeDemo default = true
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA10: includeDemo default = true ââ');

  // Call without includeDemo argument â should default to true
  const pathAD_default = await findPath(realA.id, demoD.id, 6);
  assert(pathAD_default.exists, 'PA10: AâD exists when includeDemo defaults to true');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA11: includeDemo=false â REAL-only path
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA11: includeDemo=false â REAL-only path ââ');

  const pathAC_realOnly = await findPath(realA.id, realC.id, 6, false);
  assert(pathAC_realOnly.exists, 'PA11: AâC exists with includeDemo=false (REAL-only path AâBâC)');
  assert(pathAC_realOnly.path!.nodes.every(n => n.nodeType === 'REAL'),
    'PA11: all path nodes are REAL with includeDemo=false');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA12: Ordered nodeIds and GraphNodes
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA12: Ordered nodeIds and GraphNodes ââ');

  const pathAC_ord = await findPath(realA.id, realC.id, 6, false);
  assert(pathAC_ord.path!.nodeIds[0] === realA.id, 'PA12: nodeIds[0] = fromId');
  assert(pathAC_ord.path!.nodeIds[pathAC_ord.path!.nodeIds.length - 1] === realC.id, 'PA12: nodeIds[-1] = toId');
  // Verify hopDistance is positional (0, 1, 2, ...)
  const hops = pathAC_ord.path!.nodes.map(n => n.hopDistance);
  assert(
    hops.every((h, i) => h === i),
    `PA12: hopDistance is sequential 0,1,2,... (got ${hops.join(',')})`
  );

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA13: Correct totalCost semantics â friction cost, not weight sum
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA13: totalCost = Dijkstra friction cost, NOT weight sum ââ');

  // AâB: weight=0.76, cost=0.24. Verify single-hop totalCost.
  const pathAB = await findPath(realA.id, realB.id, 1, false);
  assert(pathAB.exists, 'PA13: AâB path exists');
  // cost = 1 - (0.8*0.6 + 0.7*0.4) = 1 - (0.48+0.28) = 1 - 0.76 = 0.24
  const expectedAB_cost = Math.round((1 - (0.8 * 0.6 + 0.7 * 0.4)) * 10000) / 10000;
  const gotAB_cost = pathAB.totalCost!;
  assert(
    Math.abs(gotAB_cost - expectedAB_cost) < 0.001,
    `PA13: AâB totalCost = ${expectedAB_cost} (1 - weight). Got ${gotAB_cost}`
  );

  // Weight sum would be 0.76 â confirm that's NOT what we return
  const wrongCost = 0.76;
  assert(
    Math.abs(gotAB_cost - wrongCost) > 0.01,
    `PA13: totalCost is NOT weight-sum (${wrongCost}). It is friction cost (${gotAB_cost})`
  );
  console.log(`  â AâB weight=0.76 (strength), totalCost=${gotAB_cost} (friction = 1-weight). Distinct. â`);

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PA14: HTTP GET /api/v2/graph/path â constraint and includeDemo
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ PA14: HTTP GET /api/v2/graph/path â full API ââ');

  // AâC valid
  const http_AC = await request(app)
    .get(`/api/v2/graph/path?from=${realA.id}&to=${realC.id}&maxDepth=6`);
  assert(http_AC.status === 200, `PA14: AâC â 200 (got ${http_AC.status})`);
  assert(http_AC.body.exists === true, 'PA14: AâC exists = true');
  assert(http_AC.body.totalCost !== null, 'PA14: totalCost is not null');

  // AâF blocked by constraint
  const http_AF = await request(app)
    .get(`/api/v2/graph/path?from=${realA.id}&to=${realF.id}&maxDepth=6`);
  assert(http_AF.status === 200, `PA14: AâF â 200 (got ${http_AF.status})`);
  assert(http_AF.body.exists === false, 'PA14: AâF exists = false (DEMOâREAL constraint)');
  assert(http_AF.body.path === null, 'PA14: AâF path = null');

  // includeDemo=false blocks DEMO target
  const http_AD_noDemo = await request(app)
    .get(`/api/v2/graph/path?from=${realA.id}&to=${demoD.id}&includeDemo=false`);
  assert(http_AD_noDemo.status === 200, `PA14: AâD includeDemo=false â 200`);
  assert(http_AD_noDemo.body.exists === false, 'PA14: AâD includeDemo=false â exists=false');

  // includeDemo default = true (no param)
  const http_AD_default = await request(app)
    .get(`/api/v2/graph/path?from=${realA.id}&to=${demoD.id}`);
  assert(http_AD_default.body.exists === true, 'PA14: AâD includeDemo default=true â exists=true');

  // DâA blocked
  const http_DA = await request(app)
    .get(`/api/v2/graph/path?from=${demoD.id}&to=${realA.id}`);
  assert(http_DA.body.exists === false, 'PA14: DâA DEMOâREAL blocked â exists=false');

  // Self-path
  const http_self = await request(app)
    .get(`/api/v2/graph/path?from=${realA.id}&to=${realA.id}`);
  assert(http_self.status === 400, `PA14: self-path â 400 (got ${http_self.status})`);

  // Missing from
  const http_missing = await request(app).get(`/api/v2/graph/path?to=${realC.id}`);
  assert(http_missing.status === 400, `PA14: missing from â 400`);

  // ââ Cleanup âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  await hardDeleteAll();

  // ââ Results âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  await closeDriver();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(async err => {
  console.error('[PA] Unhandled error:', err.message ?? err);
  await hardDeleteAll();
  await closeDriver();
  process.exit(1);
});
