/**
 * HOPNet â Step 10 Decision Verification Script
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * Focused tests for the four architectural decisions approved after Step 10
 * architecture review:
 *
 *   Decision 1 â nodeType permanently immutable (throws explicit error)
 *   Decision 2 â createRelationship is atomic (single Cypher statement)
 *   Decision 3 â directed duplicate semantics + service-layer boundary
 *   Decision 4 â both endpoints must be active (soft-deleted endpoint exclusion)
 *
 * All test data is hard-deleted at the end.
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register --transpile-only scripts/verify_step10_decisions.ts
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { verifyConnectivity, getSession, closeDriver } from '../src/config/neo4j';
import { createPerson, updatePerson, softDeletePerson, restorePerson } from '../src/repositories/person.repository';
import {
  createRelationship,
  getRelationshipById,
  getRelationshipsBetween,
  listRelationshipsByPerson,
  listRelationships,
  countRelationships,
  softDeleteRelationship,
} from '../src/repositories/relationship.repository';

// ââ Counters ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

let passed = 0;
let failed = 0;
const nodeIds: string[] = [];

function ok(label: string)   { console.log(`  â ${label}`); passed++; }
function fail(label: string, err?: unknown) { console.error(`  â ${label}`, err ?? ''); failed++; }
function assert(cond: boolean, label: string, extra?: unknown) {
  if (cond) ok(label); else fail(label, extra);
}

async function hardDeleteAll() {
  if (nodeIds.length === 0) return;
  const session = getSession();
  try {
    await session.run(
      `MATCH (p:Person) WHERE p.id IN $ids DETACH DELETE p`,
      { ids: nodeIds }
    );
    console.log(`\n  ð§¹ Hard-deleted ${nodeIds.length} test node(s) + all their relationships.`);
  } finally { await session.close(); }
}

// ââ Main ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function run() {
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  HOPNet â Step 10 Decision Verification');
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  await verifyConnectivity();
  console.log('  [Neo4j] Connected\n');

  // ââ Create test nodes ââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('ââ Setup ââ');
  const pA = await createPerson('D10_HNP-A01', { nodeType: 'REAL', fullName: 'D10 Real A', createdBy: 'D10Test' });
  const pB = await createPerson('D10_HNP-A02', { nodeType: 'REAL', fullName: 'D10 Real B', createdBy: 'D10Test' });
  const pC = await createPerson('D10_HNP-A03', { nodeType: 'REAL', fullName: 'D10 Real C', createdBy: 'D10Test' });
  const pD = await createPerson('D10_DNP-A01', { nodeType: 'DEMO', fullName: 'D10 Demo D', createdBy: 'D10Test' });
  nodeIds.push(pA.id, pB.id, pC.id, pD.id);
  console.log('  Created 3 REAL + 1 DEMO test nodes\n');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // DECISION 1 â nodeType is permanently immutable â throws explicit error
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('ââ Decision 1: nodeType immutability (explicit throw) ââ');

  // 1a. Attempting to set nodeType to same value â must still throw
  try {
    await updatePerson(pA.id, { nodeType: 'REAL' } as any);
    fail('D1-a: should have thrown when nodeType provided (even same value)');
  } catch (e: any) {
    assert(
      e.message.includes('nodeType is permanently immutable'),
      'D1-a: throws with correct message when nodeType included'
    );
    assert(
      e.message.includes('soft-delete the existing node and create a new one'),
      'D1-a: error message includes migration guidance'
    );
  }

  // 1b. Attempting to change REAL â DEMO â must throw
  try {
    await updatePerson(pA.id, { nodeType: 'DEMO' } as any);
    fail('D1-b: should have thrown for REALâDEMO mutation');
  } catch (e: any) {
    assert(
      e.message.includes('nodeType is permanently immutable'),
      'D1-b: REALâDEMO mutation throws correctly'
    );
  }

  // 1c. Updating other fields while nodeType absent â must NOT throw
  try {
    const updated = await updatePerson(pA.id, { company: 'D10Corp' });
    assert(updated?.company === 'D10Corp', 'D1-c: normal update works when nodeType is absent');
    assert(updated?.nodeType === 'REAL', 'D1-c: nodeType unchanged after normal update');
  } catch (e) {
    fail('D1-c: normal update (without nodeType) threw unexpectedly', e);
  }

  // 1d. nodeType undefined in updates â NOT treated as mutation â no throw
  try {
    const updated = await updatePerson(pA.id, { company: 'D10Corp2', nodeType: undefined } as any);
    assert(updated !== null, 'D1-d: update with nodeType=undefined does not throw');
  } catch (e) {
    fail('D1-d: update with nodeType=undefined threw unexpectedly', e);
  }

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // DECISION 2 â createRelationship is atomic
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ Decision 2: atomic createRelationship ââ');

  // 2a. Non-existent source â throws (atomicity: no partial relationship)
  try {
    await createRelationship({ sourceId: '00000000-dead-beef-0000-000000000000', targetId: pA.id });
    fail('D2-a: should have thrown for non-existent source');
  } catch (e: any) {
    assert(
      e.message.includes('not found or soft-deleted'),
      'D2-a: throws with correct message for non-existent source'
    );
  }

  // 2b. Non-existent target â throws
  try {
    await createRelationship({ sourceId: pA.id, targetId: '00000000-dead-beef-0000-000000000001' });
    fail('D2-b: should have thrown for non-existent target');
  } catch (e: any) {
    assert(
      e.message.includes('not found or soft-deleted'),
      'D2-b: throws with correct message for non-existent target'
    );
  }

  // 2c. Soft-deleted source â throws (endpoint must be active)
  await softDeletePerson(pC.id);
  try {
    await createRelationship({ sourceId: pC.id, targetId: pA.id });
    fail('D2-c: should have thrown for soft-deleted source');
  } catch (e: any) {
    assert(
      e.message.includes('not found or soft-deleted'),
      'D2-c: throws for soft-deleted source (atomicity guard works)'
    );
  }
  await restorePerson(pC.id); // restore for later tests

  // 2d. edgeKind derived correctly in single Cypher (REAL+REAL â REAL_EDGE)
  const relAB = await createRelationship({
    sourceId: pA.id, targetId: pB.id,
    relationshipType: 'colleague', createdBy: 'D10Test',
  });
  assert(relAB.edgeKind === 'REAL_EDGE', 'D2-d: REAL+REAL â REAL_EDGE (derived atomically)');
  assert(relAB.sourceId === pA.id, 'D2-d: sourceId correct');
  assert(relAB.targetId === pB.id, 'D2-d: targetId correct');

  // 2e. edgeKind derived correctly (REAL+DEMO â DEMO_EDGE)
  const relAD = await createRelationship({
    sourceId: pA.id, targetId: pD.id,
    relationshipType: 'acquaintance', createdBy: 'D10Test',
  });
  assert(relAD.edgeKind === 'DEMO_EDGE', 'D2-e: REAL+DEMO â DEMO_EDGE (derived atomically)');

  // 2f. edgeKind derived correctly (DEMO+REAL â DEMO_EDGE)
  const relDA = await createRelationship({
    sourceId: pD.id, targetId: pA.id,
    relationshipType: 'acquaintance', createdBy: 'D10Test',
  });
  assert(relDA.edgeKind === 'DEMO_EDGE', 'D2-f: DEMO+REAL â DEMO_EDGE (derived atomically)');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // DECISION 3 â directed duplicate semantics
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ Decision 3: directed duplicate semantics ââ');

  // 3a. AâB KNOWS and BâA KNOWS are distinct (opposite direction = different)
  const relAB_knows = await createRelationship({
    sourceId: pA.id, targetId: pB.id,
    relationshipType: 'KNOWS', createdBy: 'D10Test',
  });
  const relBA_knows = await createRelationship({
    sourceId: pB.id, targetId: pA.id,
    relationshipType: 'KNOWS', createdBy: 'D10Test',
  });
  assert(relAB_knows.id !== relBA_knows.id, 'D3-a: AâB KNOWS and BâA KNOWS have distinct IDs');
  assert(relAB_knows.sourceId === pA.id, 'D3-a: AâB sourceId is A');
  assert(relBA_knows.sourceId === pB.id, 'D3-a: BâA sourceId is B');

  const betweenAB = await getRelationshipsBetween(pA.id, pB.id);
  // undirected fetch should return AâB colleague (from 2d) + AâB KNOWS + BâA KNOWS = 3
  assert(betweenAB.length >= 3, `D3-a: undirected getRelationshipsBetween returns all (got ${betweenAB.length})`);

  // 3b. Same (sourceId, targetId, relationshipType) triplet â repo is permissive
  // The service layer (Step 11+) will enforce uniqueness. We test the boundary here:
  // two AâB colleague relationships can be created at the repository level.
  const relAB_c2 = await createRelationship({
    sourceId: pA.id, targetId: pB.id,
    relationshipType: 'colleague', createdBy: 'D10Test',
  });
  assert(relAB_c2.id !== relAB.id, 'D3-b: repository permits duplicate (sourceId,targetId,type) â service layer must enforce uniqueness');

  const dupCount = betweenAB.filter(r => r.relationshipType === 'colleague').length;
  // We now have 2 colleague rels in AâB direction; both exist at repo level
  const betweenAB2 = await getRelationshipsBetween(pA.id, pB.id);
  const colleagueCount = betweenAB2.filter(r => r.relationshipType === 'colleague').length;
  assert(colleagueCount === 2, `D3-b: repository shows 2 colleague rels between A and B (service layer TODO to prevent this) â got ${colleagueCount}`);

  // 3c. edgeKind and relationshipType are distinct concepts
  assert(relAB.edgeKind === 'REAL_EDGE', 'D3-c: edgeKind (REAL_EDGE) is semantic category derived from nodeTypes');
  assert(relAB.relationshipType === 'colleague', 'D3-c: relationshipType (colleague) is semantic meaning of connection');
  assert(relAB.edgeKind !== relAB.relationshipType, 'D3-c: edgeKind and relationshipType are distinct concepts');

  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // DECISION 4 â both endpoints must be active
  // âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ Decision 4: soft-deleted endpoint exclusion ââ');

  // Create a clean CâA relationship for endpoint tests
  const relCA = await createRelationship({
    sourceId: pC.id, targetId: pA.id,
    relationshipType: 'mentor', createdBy: 'D10Test',
  });
  assert(relCA.edgeKind === 'REAL_EDGE', 'D4-setup: CâA created (REAL_EDGE)');

  // 4a. SOURCE endpoint soft-deleted â relationship disappears from normal reads
  await softDeletePerson(pC.id);

  const byId_afterC_delete = await getRelationshipById(relCA.id);
  assert(byId_afterC_delete === null, 'D4-a: getRelationshipById returns null when source is soft-deleted');

  const listByA_afterC_delete = await listRelationshipsByPerson(pA.id);
  assert(
    !listByA_afterC_delete.some(r => r.id === relCA.id),
    'D4-a: listRelationshipsByPerson excludes rels with soft-deleted source'
  );

  const listAll_afterC_delete = await listRelationships();
  assert(
    !listAll_afterC_delete.some(r => r.id === relCA.id),
    'D4-a: listRelationships excludes rels with soft-deleted source'
  );

  const countAfterC = await countRelationships();
  // Restore C and check count went up by at least 1
  await restorePerson(pC.id);
  const countAfterRestore = await countRelationships();
  assert(countAfterRestore > countAfterC, 'D4-a: countRelationships increases after restoring soft-deleted source');

  // 4b. TARGET endpoint soft-deleted â relationship disappears from normal reads
  await softDeletePerson(pA.id); // pA is the target of relCA

  const byId_afterA_delete = await getRelationshipById(relCA.id);
  assert(byId_afterA_delete === null, 'D4-b: getRelationshipById returns null when target is soft-deleted');

  const listByC_afterA_delete = await listRelationshipsByPerson(pC.id);
  assert(
    !listByC_afterA_delete.some(r => r.id === relCA.id),
    'D4-b: listRelationshipsByPerson excludes rels with soft-deleted target'
  );

  const getBetween_afterA = await getRelationshipsBetween(pC.id, pA.id);
  assert(
    !getBetween_afterA.some(r => r.id === relCA.id),
    'D4-b: getRelationshipsBetween excludes rels with soft-deleted target'
  );

  // 4c. Restoring target makes relationship visible again
  await restorePerson(pA.id);

  const byId_afterRestore = await getRelationshipById(relCA.id);
  assert(byId_afterRestore !== null, 'D4-c: relationship visible again after endpoint restored');
  assert(byId_afterRestore?.id === relCA.id, 'D4-c: correct relationship returned after restore');

  const listByC_afterRestore = await listRelationshipsByPerson(pC.id);
  assert(
    listByC_afterRestore.some(r => r.id === relCA.id),
    'D4-c: listRelationshipsByPerson includes relationship after endpoint restored'
  );

  // 4d. Physical relationship preserved throughout (relationshipExists ignores endpoint state)
  await softDeletePerson(pC.id);
  const physicalRel = await getRelationshipById(relCA.id); // this checks endpoints
  assert(physicalRel === null, 'D4-d: getRelationshipById returns null with soft-deleted endpoint (expected)');
  // Restore again so cleanup DETACH DELETE works cleanly
  await restorePerson(pC.id);

  // ââ Cleanup ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  await hardDeleteAll();

  // ââ Results âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  await closeDriver();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  hardDeleteAll().finally(async () => {
    await closeDriver();
    process.exit(1);
  });
  console.error('[D10Verify] Unhandled error:', err.message ?? err);
});
