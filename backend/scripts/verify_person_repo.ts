/**
 * HOPNet â Person Repository Verification Script
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * Safe, read-and-cleanup test that exercises every function in person.repository.ts
 * against the live local Neo4j instance.
 *
 * All test nodes use the prefix "REPO_TEST_" in their publicId and are
 * hard-deleted at the end of the script so no test data remains in Neo4j.
 *
 * Run: ts-node backend/scripts/verify_person_repo.ts
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import 'dotenv/config';
import { verifyConnectivity, getSession, closeDriver } from '../src/config/neo4j';
import {
  createPerson,
  getPersonById,
  getPersonByPublicId,
  listPersons,
  searchPersons,
  updatePerson,
  softDeletePerson,
  restorePerson,
  listLightPersons,
  personExists,
  publicIdExists,
  countPersons,
} from '../src/repositories/person.repository';

// ââ Helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

let passed = 0;
let failed = 0;
const createdIds: string[] = [];

function ok(label: string) {
  console.log(`  â ${label}`);
  passed++;
}

function fail(label: string, err?: unknown) {
  console.error(`  â ${label}`, err ?? '');
  failed++;
}

function assert(condition: boolean, label: string, err?: unknown) {
  if (condition) ok(label);
  else fail(label, err);
}

// ââ Cleanup helper (hard delete) ââââââââââââââââââââââââââââââââââââââââââ

async function hardDeleteTestNodes(ids: string[]) {
  if (ids.length === 0) return;
  const session = getSession();
  try {
    await session.run(
      `MATCH (p:Person) WHERE p.id IN $ids DETACH DELETE p`,
      { ids }
    );
    console.log(`\n  ð§¹ Hard-deleted ${ids.length} test node(s) from Neo4j.`);
  } finally {
    await session.close();
  }
}

// ââ Test suite âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function run() {
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  HOPNet â Person Repository Verification');
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  // 1. Connectivity
  console.log('ââ 1. Neo4j connectivity ââ');
  try {
    await verifyConnectivity();
    ok('Connected to Neo4j');
  } catch (e) {
    fail('Neo4j connection failed â aborting', e);
    process.exit(1);
  }

  // 2. createPerson â REAL
  console.log('\nââ 2. createPerson (REAL) ââ');
  let realNode: Awaited<ReturnType<typeof createPerson>>;
  try {
    realNode = await createPerson('REPO_TEST_HNP-001', {
      nodeType: 'REAL',
      fullName: 'Test Real Person',
      email: 'test.real@hopnet-verify.local',
      company: 'HOPNet Verify',
      cluster: 'Tech',
      tags: ['verify', 'test'],
      createdBy: 'VerifyScript',
    });
    createdIds.push(realNode.id);
    assert(realNode.id.length === 36, 'id is a UUID');
    assert(realNode.publicId === 'REPO_TEST_HNP-001', 'publicId stored correctly');
    assert(realNode.nodeType === 'REAL', 'nodeType is REAL');
    assert(realNode.fullName === 'Test Real Person', 'fullName stored');
    assert(realNode.email === 'test.real@hopnet-verify.local', 'email stored');
    assert(realNode.tags !== undefined, 'tags stored');
    assert(realNode.createdAt !== undefined, 'createdAt present');
    assert(realNode.updatedAt !== undefined, 'updatedAt present');
    assert(realNode.deletedAt === undefined || realNode.deletedAt === null, 'deletedAt absent on new node');
    // Sparse: phone was NOT provided â must not be stored as null
    assert(realNode.phone === undefined, 'phone absent (sparse â not stored as null)');
  } catch (e) {
    fail('createPerson (REAL) threw', e);
    await hardDeleteTestNodes(createdIds);
    await closeDriver();
    process.exit(1);
  }

  // 3. createPerson â DEMO (minimal fields)
  console.log('\nââ 3. createPerson (DEMO, sparse) ââ');
  let demoNode: Awaited<ReturnType<typeof createPerson>>;
  try {
    demoNode = await createPerson('REPO_TEST_DNP-001', {
      nodeType: 'DEMO',
      fullName: 'Test Demo Person',
      createdBy: 'VerifyScript',
    });
    createdIds.push(demoNode.id);
    assert(demoNode.nodeType === 'DEMO', 'nodeType is DEMO');
    assert(demoNode.fullName === 'Test Demo Person', 'fullName stored');
    // Sparse: no email, company, etc.
    assert(demoNode.email === undefined, 'email absent (sparse)');
    assert(demoNode.company === undefined, 'company absent (sparse)');
  } catch (e) {
    fail('createPerson (DEMO) threw', e);
  }

  // 4. getPersonById
  console.log('\nââ 4. getPersonById ââ');
  try {
    const found = await getPersonById(realNode!.id);
    assert(found !== null, 'found by id');
    assert(found?.publicId === 'REPO_TEST_HNP-001', 'correct publicId returned');
  } catch (e) {
    fail('getPersonById threw', e);
  }

  // 5. getPersonByPublicId
  console.log('\nââ 5. getPersonByPublicId ââ');
  try {
    const found = await getPersonByPublicId('REPO_TEST_HNP-001');
    assert(found !== null, 'found by publicId');
    assert(found?.id === realNode!.id, 'correct UUID returned');
  } catch (e) {
    fail('getPersonByPublicId threw', e);
  }

  // 6. personExists / publicIdExists
  console.log('\nââ 6. personExists / publicIdExists ââ');
  try {
    assert(await personExists(realNode!.id), 'personExists returns true for existing id');
    assert(!(await personExists('non-existent-id-abc')), 'personExists returns false for missing id');
    assert(await publicIdExists('REPO_TEST_HNP-001'), 'publicIdExists returns true for existing publicId');
    assert(!(await publicIdExists('REPO_TEST_DOES_NOT_EXIST')), 'publicIdExists returns false for missing publicId');
  } catch (e) {
    fail('personExists/publicIdExists threw', e);
  }

  // 7. listPersons (by nodeType)
  console.log('\nââ 7. listPersons ââ');
  try {
    const allNodes = await listPersons();
    assert(allNodes.some(n => n.id === realNode!.id), 'listPersons includes REAL test node');
    assert(allNodes.some(n => n.id === demoNode!.id), 'listPersons includes DEMO test node');

    const realOnly = await listPersons('REAL');
    assert(realOnly.every(n => n.nodeType === 'REAL'), 'listPersons(REAL) returns only REAL nodes');

    const demoOnly = await listPersons('DEMO');
    assert(demoOnly.every(n => n.nodeType === 'DEMO'), 'listPersons(DEMO) returns only DEMO nodes');
  } catch (e) {
    fail('listPersons threw', e);
  }

  // 8. searchPersons
  console.log('\nââ 8. searchPersons ââ');
  try {
    const results = await searchPersons('Test Real');
    assert(results.some(n => n.id === realNode!.id), 'searchPersons finds by fullName substring');

    const emailSearch = await searchPersons('hopnet-verify.local');
    assert(emailSearch.some(n => n.id === realNode!.id), 'searchPersons finds by email substring');

    const noResults = await searchPersons('zzz_no_match_xyz_123');
    assert(noResults.length === 0, 'searchPersons returns empty for no match');
  } catch (e) {
    fail('searchPersons threw', e);
  }

  // 9. updatePerson
  console.log('\nââ 9. updatePerson ââ');
  try {
    const updated = await updatePerson(realNode!.id, {
      company: 'Updated Company',
      role: 'Tester',
    });
    assert(updated !== null, 'updatePerson returned a node');
    assert(updated?.company === 'Updated Company', 'company updated');
    assert(updated?.role === 'Tester', 'role added (new sparse property)');
    assert(updated?.fullName === 'Test Real Person', 'fullName unchanged');
    // updatedAt should have advanced
    assert(updated?.updatedAt !== realNode!.createdAt, 'updatedAt refreshed');

    // Attempt to mutate immutable field â must be silently stripped
    const mutAttempt = await updatePerson(realNode!.id, {
      nodeType: 'DEMO' as any,  // must NOT change
      publicId: 'HACKED' as any, // must NOT change
    });
    const reread = await getPersonById(realNode!.id);
    assert(reread?.nodeType === 'REAL', 'nodeType cannot be mutated via updatePerson');
    assert(reread?.publicId === 'REPO_TEST_HNP-001', 'publicId cannot be mutated via updatePerson');
    void mutAttempt; // suppress unused warning
  } catch (e) {
    fail('updatePerson threw', e);
  }

  // 10. countPersons
  console.log('\nââ 10. countPersons ââ');
  try {
    const total = await countPersons();
    assert(total >= 2, 'countPersons total >= 2 (includes our test nodes)');
    const realCount = await countPersons('REAL');
    assert(realCount >= 1, 'countPersons(REAL) >= 1');
    const demoCount = await countPersons('DEMO');
    assert(demoCount >= 1, 'countPersons(DEMO) >= 1');
  } catch (e) {
    fail('countPersons threw', e);
  }

  // 11. listLightPersons
  console.log('\nââ 11. listLightPersons ââ');
  try {
    const lights = await listLightPersons();
    assert(lights.some(l => l.id === realNode!.id), 'listLightPersons includes test node');
    assert(lights.every(l => typeof l.id === 'string' && typeof l.nodeType === 'string'),
      'listLightPersons returns only id + nodeType');
  } catch (e) {
    fail('listLightPersons threw', e);
  }

  // 12. softDeletePerson
  console.log('\nââ 12. softDeletePerson ââ');
  try {
    const deleted = await softDeletePerson(realNode!.id);
    assert(deleted === true, 'softDeletePerson returned true');

    const notFound = await getPersonById(realNode!.id);
    assert(notFound === null, 'soft-deleted node not found by getPersonById');

    const notInList = await listPersons();
    assert(!notInList.some(n => n.id === realNode!.id), 'soft-deleted node excluded from listPersons');

    const notInSearch = await searchPersons('Test Real');
    assert(!notInSearch.some(n => n.id === realNode!.id), 'soft-deleted node excluded from searchPersons');

    // But still physically exists
    assert(await personExists(realNode!.id), 'soft-deleted node still physically exists (personExists)');
  } catch (e) {
    fail('softDeletePerson threw', e);
  }

  // 13. restorePerson
  console.log('\nââ 13. restorePerson ââ');
  try {
    const restored = await restorePerson(realNode!.id);
    assert(restored === true, 'restorePerson returned true');

    const found = await getPersonById(realNode!.id);
    assert(found !== null, 'restored node is visible again');
    assert(found?.deletedAt === undefined || found?.deletedAt === null, 'deletedAt cleared after restore');
  } catch (e) {
    fail('restorePerson threw', e);
  }

  // 14. Idempotency guards
  console.log('\nââ 14. Edge cases ââ');
  try {
    const notFound = await getPersonById('00000000-0000-0000-0000-000000000000');
    assert(notFound === null, 'getPersonById returns null for missing id');

    const notDeleted = await softDeletePerson('00000000-0000-0000-0000-000000000000');
    assert(notDeleted === false, 'softDeletePerson returns false for missing id');

    const noResults = await searchPersons('');
    assert(noResults.length === 0, 'searchPersons with empty string returns []');
  } catch (e) {
    fail('Edge cases threw', e);
  }

  // ââ Cleanup ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  await hardDeleteTestNodes(createdIds);

  // ââ Results âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  await closeDriver();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('[VerifyScript] Unhandled error:', err);
  process.exit(1);
});
