/**
 * HOPNet â Step 11 Service Layer Verification
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * Tests the actual HOPNet domain rules as enforced by the service layer.
 * These tests operate ABOVE the repository â they call service functions and
 * verify that business rules, error types, and orchestration are correct.
 *
 * Coverage:
 *   Person service:
 *     - REAL node creation
 *     - DEMO node creation (first-class live entity, not test data)
 *     - publicId format and auto-generation
 *     - getById (found / not found)
 *     - getByPublicId (found / not found)
 *     - listPersons (all / filtered by nodeType)
 *     - searchPersons
 *     - update (valid / immutable nodeType rejection)
 *     - softDelete (idempotency, error on already-deleted)
 *     - restore (error on active node)
 *     - nodeType mutation rejection with correct error code
 *
 *   Relationship service:
 *     - Self-loop prevention (SELF_LOOP)
 *     - Invalid endpoint (ENDPOINT_NOT_FOUND)
 *     - Deleted endpoint (DELETED_ENDPOINT)
 *     - Invalid relationshipType (INVALID_RELATIONSHIP_TYPE)
 *     - Score range validation (VALIDATION_ERROR)
 *     - REALâREAL creation â edgeKind = REAL_EDGE
 *     - REALâDEMO creation â edgeKind = DEMO_EDGE
 *     - DEMOâREAL creation â edgeKind = DEMO_EDGE
 *     - DEMOâDEMO creation â edgeKind = DEMO_EDGE
 *     - computed weight attached to result
 *     - duplicate active relationship rejection (DUPLICATE_RELATIONSHIP)
 *     - soft-deleted relationship does NOT block re-creation
 *     - opposite-direction relationship is allowed
 *     - soft-deleted endpoint exclusion (RELATIONSHIP_NOT_FOUND from service)
 *     - getById (found / not found)
 *     - listByPerson
 *     - listRelationships
 *     - update (valid / duplicate type check)
 *     - softDelete (idempotency via error code)
 *     - restore
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register --transpile-only scripts/verify_step11_services.ts
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import 'dotenv/config';
import { verifyConnectivity, getSession, closeDriver } from '../src/config/neo4j';
import { HOPNetError } from '../src/services/errors';
import * as personSvc from '../src/services/person.service';
import * as relSvc from '../src/services/relationship.service';

// ââ Counters ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

let passed = 0;
let failed = 0;
const createdNodeIds: string[] = [];

function ok(label: string) { console.log(`  â ${label}`); passed++; }
function fail(label: string, err?: unknown) { console.error(`  â ${label}`, err ?? ''); failed++; }
function assert(cond: boolean, label: string, extra?: unknown) {
  if (cond) ok(label); else fail(label, extra);
}

async function assertThrowsCode(
  fn: () => Promise<unknown>,
  code: string,
  label: string
) {
  try {
    await fn();
    fail(`${label} â expected to throw code=${code} but did not throw`);
  } catch (e: unknown) {
    if (e instanceof HOPNetError && e.code === code) {
      ok(`${label} (throws HOPNetError code=${code})`);
    } else if (e instanceof HOPNetError) {
      fail(`${label} â threw HOPNetError but wrong code: expected=${code} got=${e.code}`, e.message);
    } else {
      fail(`${label} â threw non-HOPNetError`, e);
    }
  }
}

async function hardDeleteAll() {
  if (createdNodeIds.length === 0) return;
  const session = getSession();
  try {
    await session.run(
      `MATCH (p:Person) WHERE p.id IN $ids DETACH DELETE p`,
      { ids: createdNodeIds }
    );
    console.log(`\n  ð§¹ Hard-deleted ${createdNodeIds.length} test node(s) + relationships.`);
  } finally { await session.close(); }
}

// ââ Main ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function run() {
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  HOPNet â Step 11 Service Layer Verification');
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  await verifyConnectivity();
  console.log('  [Neo4j] Connected\n');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PERSON SERVICE
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  // ââ P1: REAL node creation âââââââââââââââââââââââââââââââââââââââââââ
  console.log('ââ P1: createPerson (REAL) ââ');
  let realA: Awaited<ReturnType<typeof personSvc.createPerson>>;
  let realB: Awaited<ReturnType<typeof personSvc.createPerson>>;
  try {
    realA = await personSvc.createPerson({
      nodeType: 'REAL',
      fullName: 'Service Test Real A',
      company: 'HOPNet Tests',
      createdBy: 'S11Test',
    });
    createdNodeIds.push(realA.id);
    assert(realA.nodeType === 'REAL', 'P1: nodeType = REAL');
    assert(realA.publicId.startsWith('HNP-'), `P1: publicId starts with HNP- (got ${realA.publicId})`);
    assert(realA.id.length === 36, 'P1: id is a UUID');
    assert(realA.fullName === 'Service Test Real A', 'P1: fullName stored');
    assert(realA.createdBy === 'S11Test', 'P1: createdBy stored');
    assert(realA.deletedAt === undefined || realA.deletedAt === null, 'P1: not deleted on creation');
    // Sparse: tags not provided â must be absent, not empty array
    assert(realA.tags === undefined, 'P1: tags absent when not provided (sparse)');

    realB = await personSvc.createPerson({
      nodeType: 'REAL',
      fullName: 'Service Test Real B',
      createdBy: 'S11Test',
    });
    createdNodeIds.push(realB.id);
    assert(realB.publicId.startsWith('HNP-'), `P1: second REAL gets HNP- publicId (${realB.publicId})`);
    assert(realB.publicId !== realA.publicId, 'P1: publicIds are unique');
  } catch (e) {
    fail('P1: createPerson REAL threw', e);
    await hardDeleteAll(); await closeDriver(); process.exit(1);
  }

  // ââ P2: DEMO node creation (first-class live entity) âââââââââââââââââ
  console.log('\nââ P2: createPerson (DEMO â first-class live entity, NOT test data) ââ');
  let demoA: Awaited<ReturnType<typeof personSvc.createPerson>>;
  let demoB: Awaited<ReturnType<typeof personSvc.createPerson>>;
  try {
    demoA = await personSvc.createPerson({
      nodeType: 'DEMO',
      fullName: 'Service Test Demo A',
      createdBy: 'S11Test',
    });
    createdNodeIds.push(demoA.id);
    assert(demoA.nodeType === 'DEMO', 'P2: nodeType = DEMO');
    assert(demoA.publicId.startsWith('DNP-'), `P2: publicId starts with DNP- (got ${demoA.publicId})`);
    assert(demoA.id.length === 36, 'P2: id is a UUID');

    demoB = await personSvc.createPerson({
      nodeType: 'DEMO',
      fullName: 'Service Test Demo B',
      createdBy: 'S11Test',
    });
    createdNodeIds.push(demoB.id);
    assert(demoB.publicId.startsWith('DNP-'), `P2: second DEMO gets DNP- publicId (${demoB.publicId})`);
  } catch (e) {
    fail('P2: createPerson DEMO threw', e);
    await hardDeleteAll(); await closeDriver(); process.exit(1);
  }

  // ââ P3: Invalid nodeType ââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ P3: invalid nodeType â INVALID_NODE_TYPE ââ');
  await assertThrowsCode(
    () => personSvc.createPerson({ nodeType: 'FAKE' as any }),
    'INVALID_NODE_TYPE',
    'P3: createPerson with invalid nodeType'
  );
  await assertThrowsCode(
    () => personSvc.createPerson({ nodeType: '' as any }),
    'INVALID_NODE_TYPE',
    'P3: createPerson with empty nodeType'
  );

  // ââ P4: getPersonById âââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ P4: getPersonById ââ');
  const foundById = await personSvc.getPersonById(realA.id);
  assert(foundById.id === realA.id, 'P4: found by id');
  assert(foundById.nodeType === 'REAL', 'P4: nodeType correct');
  await assertThrowsCode(
    () => personSvc.getPersonById('00000000-0000-0000-0000-000000000000'),
    'NODE_NOT_FOUND',
    'P4: getPersonById non-existent'
  );
  await assertThrowsCode(
    () => personSvc.getPersonById(''),
    'VALIDATION_ERROR',
    'P4: getPersonById empty id'
  );

  // ââ P5: getPersonByPublicId âââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ P5: getPersonByPublicId ââ');
  const foundByPid = await personSvc.getPersonByPublicId(realA.publicId);
  assert(foundByPid.id === realA.id, 'P5: found by publicId');
  await assertThrowsCode(
    () => personSvc.getPersonByPublicId('HNP-999999'),
    'NODE_NOT_FOUND',
    'P5: getPersonByPublicId non-existent'
  );

  // ââ P6: listPersons âââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ P6: listPersons ââ');
  const allPersons = await personSvc.listPersons();
  assert(allPersons.length >= 4, `P6: listPersons returns >= 4 (got ${allPersons.length})`);

  const realPersons = await personSvc.listPersons({ nodeType: 'REAL' });
  assert(realPersons.every(p => p.nodeType === 'REAL'), 'P6: REAL filter works');
  assert(realPersons.some(p => p.id === realA.id), 'P6: realA in REAL list');

  const demoPersons = await personSvc.listPersons({ nodeType: 'DEMO' });
  assert(demoPersons.every(p => p.nodeType === 'DEMO'), 'P6: DEMO filter works');
  assert(demoPersons.some(p => p.id === demoA.id), 'P6: demoA in DEMO list');

  await assertThrowsCode(
    () => personSvc.listPersons({ nodeType: 'INVALID' as any }),
    'INVALID_NODE_TYPE',
    'P6: invalid nodeType filter'
  );

  // ââ P7: searchPersons âââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ P7: searchPersons ââ');
  const searchResults = await personSvc.searchPersons({ query: 'Service Test Real' });
  assert(searchResults.some(p => p.id === realA.id), 'P7: searchPersons finds realA by name');

  const emptySearch = await personSvc.searchPersons({ query: '' });
  assert(emptySearch.length === 0, 'P7: empty query returns empty array');

  // ââ P8: updatePerson âââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ P8: updatePerson ââ');
  const updated = await personSvc.updatePerson(realA.id, { company: 'Updated Corp' });
  assert(updated.company === 'Updated Corp', 'P8: company updated');
  assert(updated.nodeType === 'REAL', 'P8: nodeType unchanged after update');

  // nodeType mutation â NODE_TYPE_IMMUTABLE
  await assertThrowsCode(
    () => personSvc.updatePerson(realA.id, { nodeType: 'DEMO' } as any),
    'NODE_TYPE_IMMUTABLE',
    'P8: nodeType mutation throws NODE_TYPE_IMMUTABLE'
  );
  await assertThrowsCode(
    () => personSvc.updatePerson(realA.id, { nodeType: 'REAL' } as any),
    'NODE_TYPE_IMMUTABLE',
    'P8: even setting same nodeType throws NODE_TYPE_IMMUTABLE'
  );

  // Update non-existent node
  await assertThrowsCode(
    () => personSvc.updatePerson('00000000-0000-0000-0000-000000000000', { company: 'x' }),
    'NODE_NOT_FOUND',
    'P8: update non-existent node'
  );

  // ââ P9: softDelete and restore ââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ P9: softDeletePerson / restorePerson ââ');

  // Create a disposable node
  const disposable = await personSvc.createPerson({
    nodeType: 'REAL', fullName: 'S11 Disposable', createdBy: 'S11Test',
  });
  createdNodeIds.push(disposable.id);

  await personSvc.softDeletePerson(disposable.id);

  // Deleted node is no longer found by getById
  await assertThrowsCode(
    () => personSvc.getPersonById(disposable.id),
    'NODE_NOT_FOUND',
    'P9: soft-deleted node not found by getPersonById'
  );

  // Double soft-delete â NODE_ALREADY_DELETED
  await assertThrowsCode(
    () => personSvc.softDeletePerson(disposable.id),
    'NODE_ALREADY_DELETED',
    'P9: soft-deleting already-deleted node throws NODE_ALREADY_DELETED'
  );

  // Restore
  const restored = await personSvc.restorePerson(disposable.id);
  assert(restored.id === disposable.id, 'P9: restorePerson returns node');
  assert(restored.deletedAt === undefined || restored.deletedAt === null, 'P9: deletedAt cleared after restore');

  const foundAfterRestore = await personSvc.getPersonById(disposable.id);
  assert(foundAfterRestore.id === disposable.id, 'P9: node visible again after restore');

  // Restore already-active node â NODE_NOT_DELETED
  await assertThrowsCode(
    () => personSvc.restorePerson(disposable.id),
    'NODE_NOT_DELETED',
    'P9: restoring active node throws NODE_NOT_DELETED'
  );

  // softDelete non-existent â NODE_NOT_FOUND
  await assertThrowsCode(
    () => personSvc.softDeletePerson('00000000-0000-0000-0000-000000000000'),
    'NODE_NOT_FOUND',
    'P9: softDelete non-existent node'
  );

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // RELATIONSHIP SERVICE
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  // ââ R1: Input validation ââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ R1: Relationship input validation ââ');

  await assertThrowsCode(
    () => relSvc.createRelationship({ sourceId: '', targetId: realB.id }),
    'VALIDATION_ERROR',
    'R1: empty sourceId'
  );
  await assertThrowsCode(
    () => relSvc.createRelationship({ sourceId: realA.id, targetId: '' }),
    'VALIDATION_ERROR',
    'R1: empty targetId'
  );
  await assertThrowsCode(
    () => relSvc.createRelationship({ sourceId: realA.id, targetId: realA.id }),
    'SELF_LOOP',
    'R1: self-loop prevention'
  );
  await assertThrowsCode(
    () => relSvc.createRelationship({ sourceId: realA.id, targetId: realB.id, relationshipType: '' }),
    'INVALID_RELATIONSHIP_TYPE',
    'R1: empty relationshipType'
  );
  await assertThrowsCode(
    () => relSvc.createRelationship({ sourceId: realA.id, targetId: realB.id, trustScore: 1.5 }),
    'VALIDATION_ERROR',
    'R1: trustScore > 1.0'
  );
  await assertThrowsCode(
    () => relSvc.createRelationship({ sourceId: realA.id, targetId: realB.id, interactionFrequency: -0.1 }),
    'VALIDATION_ERROR',
    'R1: interactionFrequency < 0'
  );

  // ââ R2: Endpoint validation âââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ R2: Endpoint validation ââ');

  await assertThrowsCode(
    () => relSvc.createRelationship({ sourceId: '00000000-0000-0000-0000-000000000000', targetId: realA.id }),
    'ENDPOINT_NOT_FOUND',
    'R2: non-existent source â ENDPOINT_NOT_FOUND'
  );
  await assertThrowsCode(
    () => relSvc.createRelationship({ sourceId: realA.id, targetId: '00000000-0000-0000-0000-000000000000' }),
    'ENDPOINT_NOT_FOUND',
    'R2: non-existent target â ENDPOINT_NOT_FOUND'
  );

  // Soft-deleted endpoint â DELETED_ENDPOINT
  const tempNode = await personSvc.createPerson({
    nodeType: 'REAL', fullName: 'S11 Temp Endpoint', createdBy: 'S11Test',
  });
  createdNodeIds.push(tempNode.id);
  await personSvc.softDeletePerson(tempNode.id);

  await assertThrowsCode(
    () => relSvc.createRelationship({ sourceId: tempNode.id, targetId: realA.id }),
    'DELETED_ENDPOINT',
    'R2: soft-deleted source â DELETED_ENDPOINT'
  );
  await assertThrowsCode(
    () => relSvc.createRelationship({ sourceId: realA.id, targetId: tempNode.id }),
    'DELETED_ENDPOINT',
    'R2: soft-deleted target â DELETED_ENDPOINT'
  );

  await personSvc.restorePerson(tempNode.id);

  // ââ R3: REAL/DEMO edge kind derivation ââââââââââââââââââââââââââââââââ
  console.log('\nââ R3: REAL/DEMO edge kind derivation (all 4 combinations) ââ');

  const relRR = await relSvc.createRelationship({
    sourceId: realA.id, targetId: realB.id,
    relationshipType: 'colleague', createdBy: 'S11Test',
  });
  assert(relRR.edgeKind === 'REAL_EDGE', 'R3: REALâREAL â REAL_EDGE');
  assert(typeof relRR.weight === 'number', 'R3: weight computed and attached');
  assert(relRR.weight >= 0 && relRR.weight <= 1, 'R3: weight in [0, 1]');

  const relRD = await relSvc.createRelationship({
    sourceId: realA.id, targetId: demoA.id,
    relationshipType: 'acquaintance', createdBy: 'S11Test',
  });
  assert(relRD.edgeKind === 'DEMO_EDGE', 'R3: REALâDEMO â DEMO_EDGE');

  const relDR = await relSvc.createRelationship({
    sourceId: demoA.id, targetId: realA.id,
    relationshipType: 'acquaintance', createdBy: 'S11Test',
  });
  assert(relDR.edgeKind === 'DEMO_EDGE', 'R3: DEMOâREAL â DEMO_EDGE');

  const relDD = await relSvc.createRelationship({
    sourceId: demoA.id, targetId: demoB.id,
    relationshipType: 'acquaintance', createdBy: 'S11Test',
  });
  assert(relDD.edgeKind === 'DEMO_EDGE', 'R3: DEMOâDEMO â DEMO_EDGE');

  // ââ R4: Weight computation ââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ R4: weight computation ââ');
  const relWithScores = await relSvc.createRelationship({
    sourceId: realA.id, targetId: tempNode.id,
    relationshipType: 'mentor',
    trustScore: 0.8, interactionFrequency: 0.6,
    createdBy: 'S11Test',
  });
  const expectedWeight = 0.8 * 0.6 + 0.6 * 0.4;
  assert(
    Math.abs(relWithScores.weight - expectedWeight) < 0.0001,
    `R4: weight = trustScore*0.6 + interactionFrequency*0.4 = ${expectedWeight} (got ${relWithScores.weight})`
  );

  // ââ R5: Duplicate active relationship rejection ââââââââââââââââââââââââ
  console.log('\nââ R5: duplicate active relationship â DUPLICATE_RELATIONSHIP ââ');

  // Try to create a second realAârealB colleague â should fail
  await assertThrowsCode(
    () => relSvc.createRelationship({
      sourceId: realA.id, targetId: realB.id,
      relationshipType: 'colleague', createdBy: 'S11Test',
    }),
    'DUPLICATE_RELATIONSHIP',
    'R5: duplicate (sourceId, targetId, type) rejected'
  );

  // ââ R6: Opposite direction is allowed ââââââââââââââââââââââââââââââââ
  console.log('\nââ R6: opposite direction is a distinct relationship ââ');

  const relBA = await relSvc.createRelationship({
    sourceId: realB.id, targetId: realA.id,
    relationshipType: 'colleague', createdBy: 'S11Test',
  });
  assert(relBA.id !== relRR.id, 'R6: BâA colleague has a different id from AâB colleague');
  assert(relBA.sourceId === realB.id, 'R6: sourceId is B');
  assert(relBA.targetId === realA.id, 'R6: targetId is A');
  assert(relBA.edgeKind === 'REAL_EDGE', 'R6: edgeKind still REAL_EDGE for reversed direction');

  // ââ R7: Soft-deleted relationship does NOT block re-creation ââââââââââ
  console.log('\nââ R7: soft-deleted rel does not block re-creation ââ');

  const relTemp = await relSvc.createRelationship({
    sourceId: realB.id, targetId: tempNode.id,
    relationshipType: 'friend', createdBy: 'S11Test',
  });
  assert(relTemp.edgeKind === 'REAL_EDGE', 'R7-setup: BâTemp friend created');

  await relSvc.softDeleteRelationship(relTemp.id);

  // Should NOT throw DUPLICATE_RELATIONSHIP because relTemp is now soft-deleted
  const relTempNew = await relSvc.createRelationship({
    sourceId: realB.id, targetId: tempNode.id,
    relationshipType: 'friend', createdBy: 'S11Test',
  });
  assert(relTempNew.id !== relTemp.id, 'R7: new relationship created after soft-deleting previous one');
  assert(relTempNew.relationshipType === 'friend', 'R7: same type allowed after soft-delete');

  // ââ R8: getRelationshipById âââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ R8: getRelationshipById ââ');

  const foundRel = await relSvc.getRelationshipById(relRR.id);
  assert(foundRel.id === relRR.id, 'R8: found by id');
  assert(foundRel.edgeKind === 'REAL_EDGE', 'R8: edgeKind correct');
  assert(typeof foundRel.weight === 'number', 'R8: weight present');

  await assertThrowsCode(
    () => relSvc.getRelationshipById('00000000-0000-0000-0000-000000000000'),
    'RELATIONSHIP_NOT_FOUND',
    'R8: non-existent id â RELATIONSHIP_NOT_FOUND'
  );

  // Soft-deleted endpoint â RELATIONSHIP_NOT_FOUND from service
  await personSvc.softDeletePerson(realB.id);
  await assertThrowsCode(
    () => relSvc.getRelationshipById(relRR.id), // realAârealB, realB is soft-deleted
    'RELATIONSHIP_NOT_FOUND',
    'R8: soft-deleted endpoint â RELATIONSHIP_NOT_FOUND from service'
  );
  await personSvc.restorePerson(realB.id);

  // ââ R9: listRelationshipsByPerson and listRelationships âââââââââââââââ
  console.log('\nââ R9: listRelationshipsByPerson / listRelationships ââ');

  const realARels = await relSvc.listRelationshipsByPerson(realA.id);
  assert(realARels.length >= 3, `R9: realA has >= 3 rels (got ${realARels.length})`);
  assert(realARels.every(r => typeof r.weight === 'number'), 'R9: weight on all rels');

  const allRels = await relSvc.listRelationships();
  assert(allRels.length >= 5, `R9: total rels >= 5 (got ${allRels.length})`);

  const realEdgesOnly = await relSvc.listRelationships({ edgeKind: 'REAL_EDGE' });
  assert(realEdgesOnly.every(r => r.edgeKind === 'REAL_EDGE'), 'R9: REAL_EDGE filter works');

  // ââ R10: updateRelationship âââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ R10: updateRelationship ââ');

  const updatedRel = await relSvc.updateRelationship(relRR.id, {
    trustScore: 0.9,
    relationshipType: 'close_colleague',
  });
  assert(updatedRel.trustScore === 0.9, 'R10: trustScore updated');
  assert(updatedRel.relationshipType === 'close_colleague', 'R10: relationshipType updated');
  assert(updatedRel.edgeKind === 'REAL_EDGE', 'R10: edgeKind immutable after update');

  // Score range validation on update
  await assertThrowsCode(
    () => relSvc.updateRelationship(relRR.id, { trustScore: 2.0 }),
    'VALIDATION_ERROR',
    'R10: trustScore > 1.0 in update'
  );

  // Update duplicate type check â relBA is already close_colleague in reverse direction
  // Change relBA to close_colleague â should be fine (different direction)
  await relSvc.updateRelationship(relBA.id, { relationshipType: 'close_colleague' });
  ok('R10: same type in opposite direction allowed on update');

  // Update non-existent
  await assertThrowsCode(
    () => relSvc.updateRelationship('00000000-0000-0000-0000-000000000000', { trustScore: 0.5 }),
    'RELATIONSHIP_NOT_FOUND',
    'R10: update non-existent relationship'
  );

  // ââ R11: softDelete / restore relationship ââââââââââââââââââââââââââââ
  console.log('\nââ R11: softDeleteRelationship / restoreRelationship ââ');

  // Create a fresh rel to soft-delete
  const relForDelete = await relSvc.createRelationship({
    sourceId: realA.id, targetId: demoB.id,
    relationshipType: 'test_delete', createdBy: 'S11Test',
  });

  await relSvc.softDeleteRelationship(relForDelete.id);

  await assertThrowsCode(
    () => relSvc.getRelationshipById(relForDelete.id),
    'RELATIONSHIP_NOT_FOUND',
    'R11: soft-deleted rel not found by getById'
  );

  await assertThrowsCode(
    () => relSvc.softDeleteRelationship(relForDelete.id),
    'RELATIONSHIP_ALREADY_DELETED',
    'R11: double soft-delete â RELATIONSHIP_ALREADY_DELETED'
  );

  // Restore
  // Note: this relationship has active endpoints so restore+getById works
  await relSvc.restoreRelationship(relForDelete.id);
  const restoredRel = await relSvc.getRelationshipById(relForDelete.id);
  assert(restoredRel.id === relForDelete.id, 'R11: relationship visible after restore');

  await assertThrowsCode(
    () => relSvc.restoreRelationship(relForDelete.id),
    'RELATIONSHIP_NOT_DELETED',
    'R11: restore already-active rel â RELATIONSHIP_NOT_DELETED'
  );

  await assertThrowsCode(
    () => relSvc.softDeleteRelationship('00000000-0000-0000-0000-000000000000'),
    'RELATIONSHIP_NOT_FOUND',
    'R11: softDelete non-existent rel â RELATIONSHIP_NOT_FOUND'
  );

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
  console.error('[S11Verify] Unhandled error:', err.message ?? err);
  await hardDeleteAll();
  await closeDriver();
  process.exit(1);
});
