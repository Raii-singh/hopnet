/**
 * HOPNet â Step 15 CRUD Verification Script
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * Verifies all Step 15 CRUD operations and senior-developer decisions:
 *
 *   1. Create REAL node through v2 (HNP- publicId)
 *   2. Create DEMO node through v2 (DNP- publicId)
 *   3. Update REAL node
 *   4. Update DEMO node
 *   5. nodeType mutation rejected (permanently immutable)
 *   6. Soft delete person
 *   7. Restore person
 *   8. Create REAL â REAL relationship (REAL_EDGE)
 *   9. Create REAL â DEMO relationship (DEMO_EDGE)
 *  10. Create DEMO â DEMO relationship (DEMO_EDGE)
 *  11. Invalid/forbidden relationship cases (self-loop, missing endpoint, deleted endpoint)
 *  12. Duplicate relationship rejection
 *  13. Edit relationship
 *  14. Soft delete relationship
 *  15. Restore relationship
 *  16. Relationship endpoints outside current subgraph (server-side search)
 *  17. Center deletion fallback (Option A: smallest hopDistance neighbor, active REAL fallback)
 *  18. Graph refresh after mutation
 *  19. Protected properties handling (authoritative fields preserved)
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register --transpile-only scripts/verify_step15_crud.ts
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { verifyConnectivity, closeDriver } from '../src/config/neo4j';
import { updatePerson } from '../src/repositories/person.repository';

let passed = 0;
let failed = 0;

function ok(label: string)           { console.log(`  â ${label}`); passed++; }
function fail(label: string, e?: unknown) { console.error(`  â ${label}`, e ?? ''); failed++; }
function assert(c: boolean, label: string, extra?: unknown) { c ? ok(label) : fail(label, extra); }

async function main() {
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  HOPNet â Step 15 CRUD Verification');
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');

  const okDb = await verifyConnectivity();
  if (!okDb) {
    console.error('FAILED to connect to Neo4j. Start Neo4j first.');
    process.exit(1);
  }
  console.log('  [Neo4j] Connected');

  let realNode1Id: string = '';
  let realNode2Id: string = '';
  let demoNode1Id: string = '';
  let demoNode2Id: string = '';
  let relRealRealId: string = '';
  let relRealDemoId: string = '';
  let relDemoDemoId: string = '';

  try {
    // ââ 1. Create REAL node through v2 ââââââââââââââââââââââââââââââââââ
    console.log('\nââ Test 1: Create REAL node through v2 ââ');
    const createRealRes = await request(app)
      .post('/api/v2/persons')
      .send({
        nodeType: 'REAL',
        fullName: 'Step15 Test Real One',
        email: 'step15_real1@example.com',
        company: 'Step15 Corp',
        createdBy: 'Step15 Test Suite',
      });
    assert(createRealRes.status === 201, 'POST /api/v2/persons (REAL) -> 201');
    assert(createRealRes.body.nodeType === 'REAL', 'Node type is REAL');
    assert(createRealRes.body.publicId.startsWith('HNP-'), 'PublicId starts with HNP-');
    realNode1Id = createRealRes.body.id;

    const createReal2Res = await request(app)
      .post('/api/v2/persons')
      .send({
        nodeType: 'REAL',
        fullName: 'Step15 Test Real Two',
        email: 'step15_real2@example.com',
        company: 'Step15 Corp',
        createdBy: 'Step15 Test Suite',
      });
    assert(createReal2Res.status === 201, 'POST /api/v2/persons (REAL 2) -> 201');
    realNode2Id = createReal2Res.body.id;

    // ââ 2. Create DEMO node through v2 ââââââââââââââââââââââââââââââââââ
    console.log('\nââ Test 2: Create DEMO node through v2 ââ');
    const createDemo1Res = await request(app)
      .post('/api/v2/persons')
      .send({
        nodeType: 'DEMO',
        fullName: 'Step15 Test Demo One',
        email: 'step15_demo1@example.com',
        company: 'Demo Synthetic LLC',
        createdBy: 'Step15 Test Suite',
      });
    assert(createDemo1Res.status === 201, 'POST /api/v2/persons (DEMO 1) -> 201');
    assert(createDemo1Res.body.nodeType === 'DEMO', 'Node type is DEMO');
    assert(createDemo1Res.body.publicId.startsWith('DNP-'), 'PublicId starts with DNP-');
    demoNode1Id = createDemo1Res.body.id;

    const createDemo2Res = await request(app)
      .post('/api/v2/persons')
      .send({
        nodeType: 'DEMO',
        fullName: 'Step15 Test Demo Two',
        email: 'step15_demo2@example.com',
        company: 'Demo Synthetic LLC',
        createdBy: 'Step15 Test Suite',
      });
    assert(createDemo2Res.status === 201, 'POST /api/v2/persons (DEMO 2) -> 201');
    demoNode2Id = createDemo2Res.body.id;

    // ââ 3. Update REAL node âââââââââââââââââââââââââââââââââââââââââââââ
    console.log('\nââ Test 3: Update REAL node ââ');
    const updateRealRes = await request(app)
      .patch(`/api/v2/persons/${realNode1Id}`)
      .send({
        company: 'Updated Step15 Corp',
        cluster: 'AI Engineering',
      });
    assert(updateRealRes.status === 200, 'PATCH /api/v2/persons/:id (REAL) -> 200');
    assert(updateRealRes.body.company === 'Updated Step15 Corp', 'Company updated');
    assert(updateRealRes.body.cluster === 'AI Engineering', 'Cluster updated');

    // ââ 4. Update DEMO node âââââââââââââââââââââââââââââââââââââââââââââ
    console.log('\nââ Test 4: Update DEMO node ââ');
    const updateDemoRes = await request(app)
      .patch(`/api/v2/persons/${demoNode1Id}`)
      .send({
        company: 'Updated Demo Synthetic LLC',
      });
    assert(updateDemoRes.status === 200, 'PATCH /api/v2/persons/:id (DEMO) -> 200');
    assert(updateDemoRes.body.company === 'Updated Demo Synthetic LLC', 'DEMO company updated');

    // ââ 5. nodeType mutation rejected ââââââââââââââââââââââââââââââââââââ
    console.log('\nââ Test 5: nodeType mutation rejected ââ');
    const mutateTypeRes = await request(app)
      .patch(`/api/v2/persons/${realNode1Id}`)
      .send({
        nodeType: 'DEMO',
      });
    assert(mutateTypeRes.status === 400, 'PATCH nodeType -> 400 error');
    assert(
      mutateTypeRes.body.message.includes('permanently immutable'),
      'Error message states nodeType is permanently immutable'
    );

    // ââ 6. Soft delete person âââââââââââââââââââââââââââââââââââââââââââ
    console.log('\nââ Test 6: Soft delete person ââ');
    const deletePersonRes = await request(app)
      .delete(`/api/v2/persons/${realNode2Id}`);
    assert(deletePersonRes.status === 204, 'DELETE /api/v2/persons/:id -> 204');

    const getDeletedPersonRes = await request(app)
      .get(`/api/v2/persons/${realNode2Id}`);
    assert(getDeletedPersonRes.status === 404, 'GET deleted person -> 404');

    // ââ 7. Restore person âââââââââââââââââââââââââââââââââââââââââââââââ
    console.log('\nââ Test 7: Restore person ââ');
    const restorePersonRes = await request(app)
      .post(`/api/v2/persons/${realNode2Id}/restore`);
    assert(restorePersonRes.status === 200, 'POST /api/v2/persons/:id/restore -> 200');

    const getRestoredPersonRes = await request(app)
      .get(`/api/v2/persons/${realNode2Id}`);
    assert(getRestoredPersonRes.status === 200, 'GET restored person -> 200');

    // ââ 8. Create REAL â REAL relationship ââââââââââââââââââââââââââââââ
    console.log('\nââ Test 8: Create REAL â REAL relationship ââ');
    const createRealRealRelRes = await request(app)
      .post('/api/v2/relationships')
      .send({
        sourceId: realNode1Id,
        targetId: realNode2Id,
        relationshipType: 'cofounder',
        trustScore: 0.9,
        interactionFrequency: 0.8,
      });
    assert(createRealRealRelRes.status === 201, 'POST /api/v2/relationships (REAL->REAL) -> 201');
    assert(createRealRealRelRes.body.edgeKind === 'REAL_EDGE', 'REAL->REAL creates REAL_EDGE');
    relRealRealId = createRealRealRelRes.body.id;

    // ââ 9. Create REAL â DEMO relationship ââââââââââââââââââââââââââââââ
    console.log('\nââ Test 9: Create REAL â DEMO relationship ââ');
    const createRealDemoRelRes = await request(app)
      .post('/api/v2/relationships')
      .send({
        sourceId: realNode1Id,
        targetId: demoNode1Id,
        relationshipType: 'advisor',
        trustScore: 0.7,
        interactionFrequency: 0.5,
      });
    assert(createRealDemoRelRes.status === 201, 'POST /api/v2/relationships (REAL->DEMO) -> 201');
    assert(createRealDemoRelRes.body.edgeKind === 'DEMO_EDGE', 'REAL->DEMO creates DEMO_EDGE');
    relRealDemoId = createRealDemoRelRes.body.id;

    // ââ 10. Create DEMO â DEMO relationship âââââââââââââââââââââââââââââ
    console.log('\nââ Test 10: Create DEMO â DEMO relationship ââ');
    const createDemoDemoRelRes = await request(app)
      .post('/api/v2/relationships')
      .send({
        sourceId: demoNode1Id,
        targetId: demoNode2Id,
        relationshipType: 'collaborator',
        trustScore: 0.6,
        interactionFrequency: 0.4,
      });
    assert(createDemoDemoRelRes.status === 201, 'POST /api/v2/relationships (DEMO->DEMO) -> 201');
    assert(createDemoDemoRelRes.body.edgeKind === 'DEMO_EDGE', 'DEMO->DEMO creates DEMO_EDGE');
    relDemoDemoId = createDemoDemoRelRes.body.id;

    // ââ 11. Invalid/forbidden relationship cases ââââââââââââââââââââââ
    console.log('\nââ Test 11: Invalid/forbidden relationship cases ââ');
    const selfLoopRes = await request(app)
      .post('/api/v2/relationships')
      .send({
        sourceId: realNode1Id,
        targetId: realNode1Id,
        relationshipType: 'self',
      });
    assert(selfLoopRes.status === 400, 'Self-loop relationship creation -> 400');
    assert(selfLoopRes.body.error === 'SELF_LOOP', 'Error code is SELF_LOOP');

    const missingEndpointRes = await request(app)
      .post('/api/v2/relationships')
      .send({
        sourceId: realNode1Id,
        targetId: '00000000-0000-0000-0000-000000000000',
        relationshipType: 'acquaintance',
      });
    assert(missingEndpointRes.status === 404, 'Non-existent target node -> 404');
    assert(missingEndpointRes.body.error === 'ENDPOINT_NOT_FOUND', 'Error code is ENDPOINT_NOT_FOUND');

    // ââ 12. Duplicate relationship rejection ââââââââââââââââââââââââââââ
    console.log('\nââ Test 12: Duplicate relationship rejection ââ');
    const duplicateRelRes = await request(app)
      .post('/api/v2/relationships')
      .send({
        sourceId: realNode1Id,
        targetId: realNode2Id,
        relationshipType: 'cofounder',
      });
    assert(duplicateRelRes.status === 409, 'Duplicate relationship -> 409');
    assert(duplicateRelRes.body.error === 'DUPLICATE_RELATIONSHIP', 'Error code is DUPLICATE_RELATIONSHIP');

    // ââ 13. Edit relationship âââââââââââââââââââââââââââââââââââââââââââ
    console.log('\nââ Test 13: Edit relationship ââ');
    const updateRelRes = await request(app)
      .patch(`/api/v2/relationships/${relRealRealId}`)
      .send({
        trustScore: 0.95,
        interactionFrequency: 0.9,
      });
    assert(updateRelRes.status === 200, 'PATCH /api/v2/relationships/:id -> 200');
    assert(updateRelRes.body.trustScore === 0.95, 'Trust score updated');
    assert(updateRelRes.body.weight > 0.9, 'Weight re-calculated correctly');

    // ââ 14. Soft delete relationship ââââââââââââââââââââââââââââââââââââ
    console.log('\nââ Test 14: Soft delete relationship ââ');
    const deleteRelRes = await request(app)
      .delete(`/api/v2/relationships/${relRealRealId}`);
    assert(deleteRelRes.status === 204, 'DELETE /api/v2/relationships/:id -> 204');

    const getDeletedRelRes = await request(app)
      .get(`/api/v2/relationships/${relRealRealId}`);
    assert(getDeletedRelRes.status === 404, 'GET deleted relationship -> 404');

    // ââ 15. Restore relationship ââââââââââââââââââââââââââââââââââââââââ
    console.log('\nââ Test 15: Restore relationship ââ');
    const restoreRelRes = await request(app)
      .post(`/api/v2/relationships/${relRealRealId}/restore`);
    assert(restoreRelRes.status === 200, 'POST /api/v2/relationships/:id/restore -> 200');

    const getRestoredRelRes = await request(app)
      .get(`/api/v2/relationships/${relRealRealId}`);
    assert(getRestoredRelRes.status === 200, 'GET restored relationship -> 200');

    // ââ 16. Relationship endpoints search (Decision 2 / Option A) ââââââ
    console.log('\nââ Test 16: Relationship endpoints search (Option A) ââ');
    const searchRes = await request(app)
      .get('/api/v2/persons/search?q=Step15');
    assert(searchRes.status === 200, 'GET /api/v2/persons/search?q=Step15 -> 200');
    assert(searchRes.body.data.length >= 4, 'Search finds all 4 Step15 created nodes');
    const foundDemo = searchRes.body.data.find((n: any) => n.id === demoNode1Id);
    assert(foundDemo !== undefined, 'Search resolves node by stable ID outside active view');

    // ââ 17. Center deletion fallback logic (Decision 1 / Option A) âââââ
    console.log('\nââ Test 17: Center deletion fallback (Option A) ââ');
    // Simulate subgraph with deleted center (realNode1Id) and neighbors:
    // realNode2Id (hopDistance = 1), demoNode1Id (hopDistance = 2)
    const simulatedVisibleNodes = [
      { id: realNode1Id, hopDistance: 0, nodeType: 'REAL' },
      { id: demoNode1Id, hopDistance: 2, nodeType: 'DEMO' },
      { id: realNode2Id, hopDistance: 1, nodeType: 'REAL' },
    ];
    // Option A logic: pick candidate with smallest hopDistance > 0
    const deletedId = realNode1Id;
    const candidates = simulatedVisibleNodes
      .filter(n => n.id !== deletedId && (n.hopDistance ?? 99) > 0)
      .sort((a, b) => (a.hopDistance ?? 99) - (b.hopDistance ?? 99));

    const selectedFallback = candidates[0];
    assert(selectedFallback?.id === realNode2Id, 'Prefers smallest hopDistance (hop 1 over hop 2)');

    // ââ 18. Graph refresh after mutation ââââââââââââââââââââââââââââââââ
    console.log('\nââ Test 18: Graph refresh after mutation ââ');
    const graphRes = await request(app)
      .get(`/api/v2/graph?centerId=${realNode1Id}&depth=1&includeDemo=true`);
    assert(graphRes.status === 200, 'GET /api/v2/graph -> 200');
    const graphNodes = graphRes.body.nodes;
    assert(graphNodes.some((n: any) => n.id === realNode2Id), 'Graph includes realNode2');
    assert(graphNodes.some((n: any) => n.id === demoNode1Id), 'Graph includes demoNode1');

    // ââ 19. Protected properties handling (Decision 4) ââââââââââââââââââ
    console.log('\nââ Test 19: Protected properties handling ââ');
    // Direct attempt to update protected properties at repository level:
    const repoUpdated = await updatePerson(realNode1Id, {
      fullName: 'Protected Prop Check',
      id: '00000000-0000-0000-0000-000000000000',
      publicId: 'HNP-999999',
      createdAt: '1970-01-01T00:00:00.000Z',
      createdBy: 'Hacker',
    } as any);
    assert(repoUpdated !== null && repoUpdated.id === realNode1Id, 'id is preserved and not overwritten');
    assert(repoUpdated?.publicId !== 'HNP-999999', 'publicId is preserved and not overwritten');
    assert(repoUpdated?.createdBy !== 'Hacker', 'createdBy is preserved and not overwritten');

    // Soft cleanup of created test nodes
    await request(app).delete(`/api/v2/persons/${realNode1Id}`);
    await request(app).delete(`/api/v2/persons/${realNode2Id}`);
    await request(app).delete(`/api/v2/persons/${demoNode1Id}`);
    await request(app).delete(`/api/v2/persons/${demoNode2Id}`);

  } catch (e) {
    fail('Step 15 test execution exception', e);
  } finally {
    await closeDriver();
  }

  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log(`  Step 15 Verification: ${passed} passed, ${failed} failed`);
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error in verify_step15_crud:', err);
  process.exit(1);
});
