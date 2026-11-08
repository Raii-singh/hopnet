/**
 * HOPNet â Step 12 HTTP API Verification
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * Integration tests for the v2 HTTP API layer using supertest.
 * These tests start the Express app, hit real HTTP endpoints, and verify that:
 *   - HTTP status codes are correct
 *   - Response bodies have the right shape
 *   - HOPNetError codes are correctly mapped to HTTP statuses
 *   - The RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED edge case returns 200
 *     with status:"restored_pending_endpoint"
 *   - v1 routes are unaffected
 *
 * Live Neo4j is required. All test data is cleaned up on exit.
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register --transpile-only scripts/verify_step12_api.ts
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { verifyConnectivity, getSession, closeDriver } from '../src/config/neo4j';

// ââ Counters ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

let passed = 0;
let failed = 0;
const createdNodeIds: string[] = [];

function ok(label: string) { console.log(`  â ${label}`); passed++; }
function fail(label: string, info?: unknown) { console.error(`  â ${label}`, info ?? ''); failed++; }

function assert(cond: boolean, label: string, extra?: unknown) {
  if (cond) ok(label); else fail(label, extra);
}

async function hardDeleteAll() {
  if (createdNodeIds.length === 0) return;
  const session = getSession();
  try {
    await session.run(`MATCH (p:Person) WHERE p.id IN $ids DETACH DELETE p`, { ids: createdNodeIds });
    console.log(`\n  ð§¹ Hard-deleted ${createdNodeIds.length} test node(s) + relationships.`);
  } finally { await session.close(); }
}

// ââ Helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const BASE = '/api/v2';

async function run() {
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  HOPNet â Step 12 HTTP API Verification');
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  await verifyConnectivity();
  console.log('  [Neo4j] Connected\n');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // HEALTH CHECK & v1 ROUTE PRESERVATION
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('ââ Health & v1 route preservation ââ');

  const health = await request(app).get('/api/health');
  assert(health.status === 200, 'Health: GET /api/health â 200');
  assert(health.body.status === 'ok', 'Health: body.status = "ok"');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PERSON ENDPOINTS
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  // ââ P1: POST /api/v2/persons ââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ P1: POST /api/v2/persons ââ');

  const createReal = await request(app)
    .post(`${BASE}/persons`)
    .send({ nodeType: 'REAL', fullName: 'API Test Real A', company: 'HOPNet', createdBy: 'S12Test' });
  assert(createReal.status === 201, `P1: POST REAL â 201 (got ${createReal.status})`);
  assert(createReal.body.nodeType === 'REAL', 'P1: nodeType = REAL in body');
  assert(createReal.body.publicId?.startsWith('HNP-'), `P1: publicId starts with HNP- (${createReal.body.publicId})`);
  assert(typeof createReal.body.id === 'string', 'P1: id is a string UUID');
  assert(createReal.body.tags === undefined, 'P1: tags absent when not provided (sparse)');
  const realA = createReal.body;
  createdNodeIds.push(realA.id);

  const createDemo = await request(app)
    .post(`${BASE}/persons`)
    .send({ nodeType: 'DEMO', fullName: 'API Test Demo A', createdBy: 'S12Test' });
  assert(createDemo.status === 201, `P1: POST DEMO â 201 (got ${createDemo.status})`);
  assert(createDemo.body.nodeType === 'DEMO', 'P1: nodeType = DEMO');
  assert(createDemo.body.publicId?.startsWith('DNP-'), `P1: publicId starts with DNP- (${createDemo.body.publicId})`);
  const demoA = createDemo.body;
  createdNodeIds.push(demoA.id);

  const createRealB = await request(app)
    .post(`${BASE}/persons`)
    .send({ nodeType: 'REAL', fullName: 'API Test Real B', createdBy: 'S12Test' });
  assert(createRealB.status === 201, 'P1: second REAL â 201');
  const realB = createRealB.body;
  createdNodeIds.push(realB.id);

  // ââ P2: POST /api/v2/persons â validation errors ââââââââââââââââââââââ
  console.log('\nââ P2: POST /api/v2/persons â validation errors ââ');

  const badNodeType = await request(app)
    .post(`${BASE}/persons`)
    .send({ nodeType: 'FAKE', fullName: 'Bad' });
  assert(badNodeType.status === 422, `P2: invalid nodeType â 422 (got ${badNodeType.status})`);
  assert(badNodeType.body.error?.code === 'INVALID_NODE_TYPE', 'P2: error.code = INVALID_NODE_TYPE');

  const missingNodeType = await request(app)
    .post(`${BASE}/persons`)
    .send({ fullName: 'No Type' });
  assert(missingNodeType.status === 422, `P2: missing nodeType â 422 (got ${missingNodeType.status})`);

  // ââ P3: GET /api/v2/persons âââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ P3: GET /api/v2/persons ââ');

  const listAll = await request(app).get(`${BASE}/persons`);
  assert(listAll.status === 200, `P3: list all â 200 (got ${listAll.status})`);
  assert(Array.isArray(listAll.body.data), 'P3: body.data is array');
  assert(listAll.body.count >= 3, `P3: count >= 3 (got ${listAll.body.count})`);

  const listReal = await request(app).get(`${BASE}/persons?nodeType=REAL`);
  assert(listReal.status === 200, 'P3: list REAL â 200');
  assert(listReal.body.data.every((p: any) => p.nodeType === 'REAL'), 'P3: all returned are REAL');

  const listDemo = await request(app).get(`${BASE}/persons?nodeType=DEMO`);
  assert(listDemo.status === 200, 'P3: list DEMO â 200');
  assert(listDemo.body.data.every((p: any) => p.nodeType === 'DEMO'), 'P3: all returned are DEMO');

  const listBadFilter = await request(app).get(`${BASE}/persons?nodeType=INVALID`);
  assert(listBadFilter.status === 422, `P3: invalid nodeType filter â 422 (got ${listBadFilter.status})`);

  // ââ P4: GET /api/v2/persons/search âââââââââââââââââââââââââââââââââââ
  console.log('\nââ P4: GET /api/v2/persons/search ââ');

  const search = await request(app).get(`${BASE}/persons/search?q=API+Test+Real`);
  assert(search.status === 200, `P4: search â 200 (got ${search.status})`);
  assert(search.body.data.some((p: any) => p.id === realA.id), 'P4: realA in search results');

  const emptySearch = await request(app).get(`${BASE}/persons/search?q=`);
  assert(emptySearch.status === 200, 'P4: empty query â 200 (returns empty)');
  assert(emptySearch.body.count === 0, 'P4: empty query â count = 0');

  // ââ P5: GET /api/v2/persons/:id ââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ P5: GET /api/v2/persons/:id ââ');

  const getById = await request(app).get(`${BASE}/persons/${realA.id}`);
  assert(getById.status === 200, `P5: GET by id â 200 (got ${getById.status})`);
  assert(getById.body.id === realA.id, 'P5: correct person returned');

  const getNotFound = await request(app).get(`${BASE}/persons/00000000-0000-0000-0000-000000000000`);
  assert(getNotFound.status === 404, `P5: non-existent id â 404 (got ${getNotFound.status})`);
  assert(getNotFound.body.error?.code === 'NODE_NOT_FOUND', 'P5: error.code = NODE_NOT_FOUND');

  // ââ P6: GET /api/v2/persons/by-public-id/:publicId âââââââââââââââââââ
  console.log('\nââ P6: GET /api/v2/persons/by-public-id/:publicId ââ');

  const getByPid = await request(app).get(`${BASE}/persons/by-public-id/${realA.publicId}`);
  assert(getByPid.status === 200, `P6: by-public-id â 200 (got ${getByPid.status})`);
  assert(getByPid.body.id === realA.id, 'P6: correct person returned by publicId');

  const getByPidNotFound = await request(app).get(`${BASE}/persons/by-public-id/HNP-999999`);
  assert(getByPidNotFound.status === 404, `P6: non-existent publicId â 404 (got ${getByPidNotFound.status})`);

  // ââ P7: PATCH /api/v2/persons/:id ââââââââââââââââââââââââââââââââââââ
  console.log('\nââ P7: PATCH /api/v2/persons/:id ââ');

  const patchRes = await request(app)
    .patch(`${BASE}/persons/${realA.id}`)
    .send({ company: 'Patched Corp', role: 'CTO' });
  assert(patchRes.status === 200, `P7: PATCH â 200 (got ${patchRes.status})`);
  assert(patchRes.body.company === 'Patched Corp', 'P7: company updated');
  assert(patchRes.body.role === 'CTO', 'P7: role updated');
  assert(patchRes.body.nodeType === 'REAL', 'P7: nodeType unchanged');

  const patchImmutable = await request(app)
    .patch(`${BASE}/persons/${realA.id}`)
    .send({ nodeType: 'DEMO' });
  assert(patchImmutable.status === 422, `P7: nodeType mutation â 422 (got ${patchImmutable.status})`);
  assert(patchImmutable.body.error?.code === 'NODE_TYPE_IMMUTABLE', 'P7: error.code = NODE_TYPE_IMMUTABLE');

  const patchNotFound = await request(app)
    .patch(`${BASE}/persons/00000000-0000-0000-0000-000000000000`)
    .send({ company: 'x' });
  assert(patchNotFound.status === 404, `P7: PATCH non-existent â 404 (got ${patchNotFound.status})`);

  // ââ P8: DELETE /api/v2/persons/:id âââââââââââââââââââââââââââââââââââ
  console.log('\nââ P8: DELETE /api/v2/persons/:id (soft-delete) ââ');

  // Create a node to delete
  const toDelete = (await request(app)
    .post(`${BASE}/persons`)
    .send({ nodeType: 'REAL', fullName: 'S12 Delete Test', createdBy: 'S12Test' })).body;
  createdNodeIds.push(toDelete.id);

  const deleteRes = await request(app).delete(`${BASE}/persons/${toDelete.id}`);
  assert(deleteRes.status === 204, `P8: DELETE â 204 No Content (got ${deleteRes.status})`);

  // Verify it's gone from normal reads
  const afterDelete = await request(app).get(`${BASE}/persons/${toDelete.id}`);
  assert(afterDelete.status === 404, 'P8: soft-deleted node returns 404 via GET');

  // Double delete â 409
  const doubleDelete = await request(app).delete(`${BASE}/persons/${toDelete.id}`);
  assert(doubleDelete.status === 409, `P8: double DELETE â 409 (got ${doubleDelete.status})`);
  assert(doubleDelete.body.error?.code === 'NODE_ALREADY_DELETED', 'P8: error.code = NODE_ALREADY_DELETED');

  // ââ P9: POST /api/v2/persons/:id/restore âââââââââââââââââââââââââââââ
  console.log('\nââ P9: POST /api/v2/persons/:id/restore ââ');

  const restoreRes = await request(app).post(`${BASE}/persons/${toDelete.id}/restore`);
  assert(restoreRes.status === 200, `P9: restore â 200 (got ${restoreRes.status})`);
  assert(restoreRes.body.id === toDelete.id, 'P9: restored person returned in body');

  const afterRestore = await request(app).get(`${BASE}/persons/${toDelete.id}`);
  assert(afterRestore.status === 200, 'P9: restored node visible via GET');

  const restoreActive = await request(app).post(`${BASE}/persons/${toDelete.id}/restore`);
  assert(restoreActive.status === 409, `P9: restore active â 409 (got ${restoreActive.status})`);
  assert(restoreActive.body.error?.code === 'NODE_NOT_DELETED', 'P9: error.code = NODE_NOT_DELETED');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // RELATIONSHIP ENDPOINTS
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  // ââ R1: POST /api/v2/relationships âââââââââââââââââââââââââââââââââââ
  console.log('\nââ R1: POST /api/v2/relationships ââ');

  const createRR = await request(app)
    .post(`${BASE}/relationships`)
    .send({ sourceId: realA.id, targetId: realB.id, relationshipType: 'colleague', createdBy: 'S12Test' });
  assert(createRR.status === 201, `R1: REALâREAL â 201 (got ${createRR.status})`);
  assert(createRR.body.edgeKind === 'REAL_EDGE', 'R1: edgeKind = REAL_EDGE');
  assert(typeof createRR.body.weight === 'number', 'R1: weight present and is a number');
  const relRR = createRR.body;

  const createRD = await request(app)
    .post(`${BASE}/relationships`)
    .send({ sourceId: realA.id, targetId: demoA.id, relationshipType: 'acquaintance', createdBy: 'S12Test' });
  assert(createRD.status === 201, `R1: REALâDEMO â 201 (got ${createRD.status})`);
  assert(createRD.body.edgeKind === 'DEMO_EDGE', 'R1: REALâDEMO edgeKind = DEMO_EDGE');

  // ââ R2: POST /api/v2/relationships â validation errors âââââââââââââââ
  console.log('\nââ R2: POST /api/v2/relationships â validation errors ââ');

  // Self-loop
  const selfLoop = await request(app)
    .post(`${BASE}/relationships`)
    .send({ sourceId: realA.id, targetId: realA.id });
  assert(selfLoop.status === 422, `R2: self-loop â 422 (got ${selfLoop.status})`);
  assert(selfLoop.body.error?.code === 'SELF_LOOP', 'R2: error.code = SELF_LOOP');

  // Non-existent source
  const badSrc = await request(app)
    .post(`${BASE}/relationships`)
    .send({ sourceId: '00000000-0000-0000-0000-000000000000', targetId: realA.id });
  assert(badSrc.status === 422, `R2: non-existent source â 422 (got ${badSrc.status})`);
  assert(badSrc.body.error?.code === 'ENDPOINT_NOT_FOUND', 'R2: error.code = ENDPOINT_NOT_FOUND');

  // Soft-deleted endpoint
  await request(app).delete(`${BASE}/persons/${toDelete.id}`); // re-soft-delete
  const deletedEndpoint = await request(app)
    .post(`${BASE}/relationships`)
    .send({ sourceId: toDelete.id, targetId: realA.id });
  assert(deletedEndpoint.status === 422, `R2: deleted endpoint â 422 (got ${deletedEndpoint.status})`);
  assert(deletedEndpoint.body.error?.code === 'DELETED_ENDPOINT', 'R2: error.code = DELETED_ENDPOINT');
  // Restore for cleanup
  await request(app).post(`${BASE}/persons/${toDelete.id}/restore`);

  // Empty sourceId
  const emptySrc = await request(app)
    .post(`${BASE}/relationships`)
    .send({ sourceId: '', targetId: realA.id });
  assert(emptySrc.status === 400, `R2: empty sourceId â 400 (got ${emptySrc.status})`);
  assert(emptySrc.body.error?.code === 'VALIDATION_ERROR', 'R2: error.code = VALIDATION_ERROR');

  // Duplicate relationship
  const dupRel = await request(app)
    .post(`${BASE}/relationships`)
    .send({ sourceId: realA.id, targetId: realB.id, relationshipType: 'colleague' });
  assert(dupRel.status === 409, `R2: duplicate relationship â 409 (got ${dupRel.status})`);
  assert(dupRel.body.error?.code === 'DUPLICATE_RELATIONSHIP', 'R2: error.code = DUPLICATE_RELATIONSHIP');

  // Opposite direction is allowed
  const reverseRel = await request(app)
    .post(`${BASE}/relationships`)
    .send({ sourceId: realB.id, targetId: realA.id, relationshipType: 'colleague', createdBy: 'S12Test' });
  assert(reverseRel.status === 201, `R2: opposite direction â 201 (got ${reverseRel.status})`);
  assert(reverseRel.body.sourceId === realB.id, 'R2: opposite direction sourceId correct');

  // Invalid score
  const badScore = await request(app)
    .post(`${BASE}/relationships`)
    .send({ sourceId: realA.id, targetId: demoA.id, relationshipType: 'other', trustScore: 1.5 });
  assert(badScore.status === 400, `R2: trustScore > 1 â 400 (got ${badScore.status})`);

  // ââ R3: GET /api/v2/relationships/:id ââââââââââââââââââââââââââââââââ
  console.log('\nââ R3: GET /api/v2/relationships/:id ââ');

  const getRelById = await request(app).get(`${BASE}/relationships/${relRR.id}`);
  assert(getRelById.status === 200, `R3: GET by id â 200 (got ${getRelById.status})`);
  assert(getRelById.body.id === relRR.id, 'R3: correct relationship returned');
  assert(getRelById.body.edgeKind === 'REAL_EDGE', 'R3: edgeKind correct');
  assert(typeof getRelById.body.weight === 'number', 'R3: weight present');

  const relNotFound = await request(app).get(`${BASE}/relationships/00000000-0000-0000-0000-000000000000`);
  assert(relNotFound.status === 404, `R3: non-existent â 404 (got ${relNotFound.status})`);
  assert(relNotFound.body.error?.code === 'RELATIONSHIP_NOT_FOUND', 'R3: error.code = RELATIONSHIP_NOT_FOUND');

  // ââ R4: GET /api/v2/relationships ââââââââââââââââââââââââââââââââââââ
  console.log('\nââ R4: GET /api/v2/relationships ââ');

  const listRels = await request(app).get(`${BASE}/relationships`);
  assert(listRels.status === 200, `R4: list all â 200 (got ${listRels.status})`);
  assert(Array.isArray(listRels.body.data), 'R4: body.data is array');
  assert(listRels.body.count >= 2, `R4: count >= 2 (got ${listRels.body.count})`);
  assert(listRels.body.data.every((r: any) => typeof r.weight === 'number'), 'R4: all rels have weight');

  const listRealEdge = await request(app).get(`${BASE}/relationships?edgeKind=REAL_EDGE`);
  assert(listRealEdge.status === 200, 'R4: edgeKind filter â 200');
  assert(listRealEdge.body.data.every((r: any) => r.edgeKind === 'REAL_EDGE'), 'R4: REAL_EDGE filter works');

  // ââ R5: GET /api/v2/relationships/between/:sourceId/:targetId âââââââââ
  console.log('\nââ R5: GET /api/v2/relationships/between/:a/:b ââ');

  const between = await request(app).get(`${BASE}/relationships/between/${realA.id}/${realB.id}`);
  assert(between.status === 200, `R5: between â 200 (got ${between.status})`);
  assert(between.body.count >= 1, `R5: at least 1 relationship between A and B (got ${between.body.count})`);

  const betweenNone = await request(app).get(`${BASE}/relationships/between/${realA.id}/${demoA.id}`);
  // They have an acquaintance rel so should be >= 1
  assert(betweenNone.status === 200, 'R5: between with relationship â 200');

  // ââ R6: GET /api/v2/relationships/by-person/:personId âââââââââââââââââ
  console.log('\nââ R6: GET /api/v2/relationships/by-person/:personId ââ');

  const byPerson = await request(app).get(`${BASE}/relationships/by-person/${realA.id}`);
  assert(byPerson.status === 200, `R6: by-person â 200 (got ${byPerson.status})`);
  assert(byPerson.body.count >= 2, `R6: realA has >= 2 rels (got ${byPerson.body.count})`);

  const byPersonFiltered = await request(app).get(`${BASE}/relationships/by-person/${realA.id}?edgeKind=REAL_EDGE`);
  assert(byPersonFiltered.status === 200, 'R6: by-person with edgeKind filter â 200');
  assert(byPersonFiltered.body.data.every((r: any) => r.edgeKind === 'REAL_EDGE'), 'R6: edgeKind filter respected');

  // ââ R7: PATCH /api/v2/relationships/:id ââââââââââââââââââââââââââââââ
  console.log('\nââ R7: PATCH /api/v2/relationships/:id ââ');

  const patchRel = await request(app)
    .patch(`${BASE}/relationships/${relRR.id}`)
    .send({ trustScore: 0.9, relationshipType: 'close_colleague' });
  assert(patchRel.status === 200, `R7: PATCH â 200 (got ${patchRel.status})`);
  assert(patchRel.body.trustScore === 0.9, 'R7: trustScore updated');
  assert(patchRel.body.relationshipType === 'close_colleague', 'R7: relationshipType updated');
  assert(patchRel.body.edgeKind === 'REAL_EDGE', 'R7: edgeKind immutable after PATCH');

  const patchRelBadScore = await request(app)
    .patch(`${BASE}/relationships/${relRR.id}`)
    .send({ trustScore: 2.0 });
  assert(patchRelBadScore.status === 400, `R7: trustScore > 1 in update â 400 (got ${patchRelBadScore.status})`);

  const patchRelNotFound = await request(app)
    .patch(`${BASE}/relationships/00000000-0000-0000-0000-000000000000`)
    .send({ trustScore: 0.5 });
  assert(patchRelNotFound.status === 404, `R7: PATCH non-existent â 404 (got ${patchRelNotFound.status})`);

  // ââ R8: DELETE /api/v2/relationships/:id âââââââââââââââââââââââââââââ
  console.log('\nââ R8: DELETE /api/v2/relationships/:id (soft-delete) ââ');

  const deleteRel = await request(app).delete(`${BASE}/relationships/${relRR.id}`);
  assert(deleteRel.status === 204, `R8: DELETE â 204 No Content (got ${deleteRel.status})`);

  const afterDeleteRel = await request(app).get(`${BASE}/relationships/${relRR.id}`);
  assert(afterDeleteRel.status === 404, 'R8: soft-deleted rel â 404 via GET');

  const doubleDeleteRel = await request(app).delete(`${BASE}/relationships/${relRR.id}`);
  assert(doubleDeleteRel.status === 409, `R8: double DELETE rel â 409 (got ${doubleDeleteRel.status})`);
  assert(doubleDeleteRel.body.error?.code === 'RELATIONSHIP_ALREADY_DELETED', 'R8: error.code = RELATIONSHIP_ALREADY_DELETED');

  // ââ R9: POST /api/v2/relationships/:id/restore ââââââââââââââââââââââââ
  console.log('\nââ R9: POST /api/v2/relationships/:id/restore ââ');

  // Normal restore (both endpoints active)
  const restoreRel = await request(app).post(`${BASE}/relationships/${relRR.id}/restore`);
  assert(restoreRel.status === 200, `R9: restore (normal) â 200 (got ${restoreRel.status})`);
  assert(restoreRel.body.id === relRR.id, 'R9: restored relationship in body');
  assert(typeof restoreRel.body.weight === 'number', 'R9: weight present on restored rel');

  // Restore already-active â 409
  const restoreActive2 = await request(app).post(`${BASE}/relationships/${relRR.id}/restore`);
  assert(restoreActive2.status === 409, `R9: restore active rel â 409 (got ${restoreActive2.status})`);
  assert(restoreActive2.body.error?.code === 'RELATIONSHIP_NOT_DELETED', 'R9: error.code = RELATIONSHIP_NOT_DELETED');

  // ââ R10: RESTORE â  ACTIVATE â HTTP 200 with status:"restored_pending_endpoint"
  console.log('\nââ R10: RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED â 200 status:restored_pending_endpoint ââ');

  // Setup: create a fresh rel, soft-delete it, soft-delete an endpoint, then restore the rel
  const freshRel = await request(app)
    .post(`${BASE}/relationships`)
    .send({ sourceId: realA.id, targetId: realB.id, relationshipType: 'temp_edge', createdBy: 'S12Test' });
  assert(freshRel.status === 201, 'R10-setup: fresh rel created');

  await request(app).delete(`${BASE}/relationships/${freshRel.body.id}`); // soft-delete rel
  await request(app).delete(`${BASE}/persons/${realB.id}`);              // soft-delete endpoint B

  const restorePending = await request(app).post(`${BASE}/relationships/${freshRel.body.id}/restore`);
  assert(restorePending.status === 200, `R10: restore with deleted endpoint â 200 (got ${restorePending.status})`);
  assert(restorePending.body.status === 'restored_pending_endpoint', 'R10: body.status = "restored_pending_endpoint"');
  assert(typeof restorePending.body.message === 'string', 'R10: body.message is a string');
  assert(restorePending.body.id === freshRel.body.id, 'R10: body.id matches relationship id');

  // Relationship still not visible in normal reads (endpoint still deleted)
  const stillNotVisible = await request(app).get(`${BASE}/relationships/${freshRel.body.id}`);
  assert(stillNotVisible.status === 404, 'R10: rel still not visible via GET (endpoint still deleted)');

  // Restore endpoint B â relationship becomes visible automatically
  await request(app).post(`${BASE}/persons/${realB.id}/restore`);
  const nowVisible = await request(app).get(`${BASE}/relationships/${freshRel.body.id}`);
  assert(nowVisible.status === 200, 'R10: relationship visible after endpoint restored â no action on rel needed');
  assert(nowVisible.body.edgeKind === 'REAL_EDGE', 'R10: edgeKind correct after full restoration');

  // ââ R11: Restore non-existent relationship âââââââââââââââââââââââââââ
  console.log('\nââ R11: Restore non-existent relationship ââ');

  const restoreNonExistent = await request(app).post(`${BASE}/relationships/00000000-0000-0000-0000-000000000000/restore`);
  assert(restoreNonExistent.status === 404, `R11: restore non-existent rel â 404 (got ${restoreNonExistent.status})`);
  assert(restoreNonExistent.body.error?.code === 'RELATIONSHIP_NOT_FOUND', 'R11: error.code = RELATIONSHIP_NOT_FOUND');

  // ââ Cleanup ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  await hardDeleteAll();

  // ââ Results âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  await closeDriver();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(async err => {
  console.error('[S12API] Unhandled error:', err.message ?? err);
  await hardDeleteAll();
  await closeDriver();
  process.exit(1);
});
