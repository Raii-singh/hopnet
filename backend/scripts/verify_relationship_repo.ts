/**
 * HOPNet â Relationship Repository Verification Script
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * Verifies every exported function in relationship.repository.ts against the
 * live local Neo4j database.
 *
 * Test topology (all hard-deleted at the end):
 *
 *   RT_R1 (REAL) ââcolleagueâââº RT_R2 (REAL)     edgeKind = REAL_EDGE
 *   RT_R1 (REAL) ââacquaintanceââº RT_D1 (DEMO)   edgeKind = DEMO_EDGE
 *   RT_R2 (REAL) ââmentorâââââââº RT_D1 (DEMO)    edgeKind = DEMO_EDGE
 *   RT_D1 (DEMO) ââacquaintanceââº RT_R3 (REAL)   edgeKind = DEMO_EDGE
 *
 *   RT_R3 is isolated from R1 directly (only via D1)
 *   RT_R4 is completely isolated (no relationships)
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register --transpile-only scripts/verify_relationship_repo.ts
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { verifyConnectivity, getSession, closeDriver } from '../src/config/neo4j';
import {
  createRelationship,
  getRelationshipById,
  getRelationshipsBetween,
  listRelationshipsByPerson,
  listRelationships,
  updateRelationship,
  softDeleteRelationship,
  restoreRelationship,
  relationshipExists,
  countRelationships,
} from '../src/repositories/relationship.repository';
import { createPerson } from '../src/repositories/person.repository';

// ââ Counters ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

let passed = 0;
let failed = 0;
const createdNodeIds: string[] = [];
const createdRelIds: string[] = [];

function ok(label: string)   { console.log(`  â ${label}`); passed++; }
function fail(label: string, err?: unknown) { console.error(`  â ${label}`, err ?? ''); failed++; }
function assert(cond: boolean, label: string, extra?: unknown) {
  if (cond) ok(label); else fail(label, extra ?? '');
}

// ââ Cleanup âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function hardDeleteAll() {
  const session = getSession();
  try {
    if (createdNodeIds.length > 0) {
      await session.run(
        `MATCH (p:Person) WHERE p.id IN $ids DETACH DELETE p`,
        { ids: createdNodeIds }
      );
    }
    console.log(`\n  ð§¹ Hard-deleted ${createdNodeIds.length} test node(s) + all their relationships.`);
  } finally {
    await session.close();
  }
}

// ââ Setup âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function setup(): Promise<{ r1: string; r2: string; r3: string; r4: string; d1: string }> {
  // Create Person nodes via person.repository (tested in Step 8)
  const r1 = await createPerson('RTEST_HNP-001', { nodeType: 'REAL', fullName: 'Rel Test Real 1', createdBy: 'RelVerify' });
  const r2 = await createPerson('RTEST_HNP-002', { nodeType: 'REAL', fullName: 'Rel Test Real 2', createdBy: 'RelVerify' });
  const r3 = await createPerson('RTEST_HNP-003', { nodeType: 'REAL', fullName: 'Rel Test Real 3', createdBy: 'RelVerify' });
  const r4 = await createPerson('RTEST_HNP-004', { nodeType: 'REAL', fullName: 'Rel Test Real 4 (isolated)', createdBy: 'RelVerify' });
  const d1 = await createPerson('RTEST_DNP-001', { nodeType: 'DEMO', fullName: 'Rel Test Demo 1', createdBy: 'RelVerify' });
  createdNodeIds.push(r1.id, r2.id, r3.id, r4.id, d1.id);
  console.log('  ð 5 test Person nodes created (4 REAL + 1 DEMO)');
  return { r1: r1.id, r2: r2.id, r3: r3.id, r4: r4.id, d1: d1.id };
}

// ââ Test suite âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function run() {
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  HOPNet â Relationship Repository Verification');
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

  // Setup nodes
  console.log('\nââ Setup: Creating test nodes ââ');
  const ids = await setup();

  // ââ 2. createRelationship â REAL_EDGE âââââââââââââââââââââââââââââââââ
  console.log('\nââ 2. createRelationship (REAL_EDGE: R1 â R2) ââ');
  let rel_r1_r2: Awaited<ReturnType<typeof createRelationship>>;
  try {
    rel_r1_r2 = await createRelationship({
      sourceId: ids.r1,
      targetId: ids.r2,
      relationshipType: 'colleague',
      trustScore: 0.8,
      interactionFrequency: 0.7,
      connectorSource: 'RelVerify',
      confidenceScore: 1.0,
      createdBy: 'RelVerify',
    });
    createdRelIds.push(rel_r1_r2.id);
    assert(rel_r1_r2.id.length === 36, 'id is a UUID');
    assert(rel_r1_r2.sourceId === ids.r1, 'sourceId stored correctly');
    assert(rel_r1_r2.targetId === ids.r2, 'targetId stored correctly');
    assert(rel_r1_r2.edgeKind === 'REAL_EDGE', 'edgeKind = REAL_EDGE (REAL + REAL)');
    assert(rel_r1_r2.relationshipType === 'colleague', 'relationshipType stored');
    assert(rel_r1_r2.trustScore === 0.8, 'trustScore stored');
    assert(rel_r1_r2.interactionFrequency === 0.7, 'interactionFrequency stored');
    assert(rel_r1_r2.createdAt !== undefined, 'createdAt present');
    assert(rel_r1_r2.updatedAt !== undefined, 'updatedAt present');
    assert(rel_r1_r2.inferred === false, 'inferred defaults to false');
    assert(rel_r1_r2.deletedAt === undefined || rel_r1_r2.deletedAt === null, 'deletedAt absent on new rel');
    assert(rel_r1_r2.inferredFrom === undefined, 'inferredFrom absent (sparse â not stored as null)');
  } catch (e) {
    fail('createRelationship REAL_EDGE threw', e);
    await hardDeleteAll(); await closeDriver(); process.exit(1);
  }

  // ââ 3. createRelationship â DEMO_EDGE (R1 â D1) âââââââââââââââââââââââ
  console.log('\nââ 3. createRelationship (DEMO_EDGE: R1 â D1) ââ');
  let rel_r1_d1: Awaited<ReturnType<typeof createRelationship>>;
  try {
    rel_r1_d1 = await createRelationship({
      sourceId: ids.r1,
      targetId: ids.d1,
      relationshipType: 'acquaintance',
      createdBy: 'RelVerify',
    });
    createdRelIds.push(rel_r1_d1.id);
    assert(rel_r1_d1.edgeKind === 'DEMO_EDGE', 'edgeKind = DEMO_EDGE (REAL + DEMO)');
    assert(rel_r1_d1.trustScore === 0.5, 'trustScore defaults to 0.5');
    assert(rel_r1_d1.interactionFrequency === 0.5, 'interactionFrequency defaults to 0.5');
    assert(rel_r1_d1.confidenceScore === 1.0, 'confidenceScore defaults to 1.0');
    assert(rel_r1_d1.connectorSource === 'Manual', 'connectorSource defaults to Manual');
  } catch (e) {
    fail('createRelationship DEMO_EDGE R1âD1 threw', e);
  }

  // ââ 4. createRelationship â DEMO_EDGE (R2 â D1) âââââââââââââââââââââââ
  console.log('\nââ 4. createRelationship (DEMO_EDGE: R2 â D1) ââ');
  let rel_r2_d1: Awaited<ReturnType<typeof createRelationship>>;
  try {
    rel_r2_d1 = await createRelationship({
      sourceId: ids.r2,
      targetId: ids.d1,
      relationshipType: 'mentor',
      trustScore: 0.9,
      interactionFrequency: 0.6,
      createdBy: 'RelVerify',
    });
    createdRelIds.push(rel_r2_d1.id);
    assert(rel_r2_d1.edgeKind === 'DEMO_EDGE', 'edgeKind = DEMO_EDGE (REAL + DEMO)');
    assert(rel_r2_d1.relationshipType === 'mentor', 'relationshipType stored');
  } catch (e) {
    fail('createRelationship DEMO_EDGE R2âD1 threw', e);
  }

  // ââ 5. createRelationship â DEMO_EDGE (D1 â R3) âââââââââââââââââââââââ
  console.log('\nââ 5. createRelationship (DEMO_EDGE: D1 â R3) ââ');
  let rel_d1_r3: Awaited<ReturnType<typeof createRelationship>>;
  try {
    rel_d1_r3 = await createRelationship({
      sourceId: ids.d1,
      targetId: ids.r3,
      relationshipType: 'acquaintance',
      inferred: true,
      inferredFrom: 'Hypothetical connection via D1',
      confidenceScore: 0.6,
      createdBy: 'RelVerify',
    });
    createdRelIds.push(rel_d1_r3.id);
    assert(rel_d1_r3.edgeKind === 'DEMO_EDGE', 'edgeKind = DEMO_EDGE (DEMO + REAL)');
    assert(rel_d1_r3.inferred === true, 'inferred = true stored');
    assert(rel_d1_r3.inferredFrom === 'Hypothetical connection via D1', 'inferredFrom stored (optional field)');
    assert(rel_d1_r3.confidenceScore === 0.6, 'confidenceScore stored');
  } catch (e) {
    fail('createRelationship DEMO_EDGE D1âR3 threw', e);
  }

  // ââ 6. createRelationship â error on non-existent node ââââââââââââââââ
  console.log('\nââ 6. createRelationship (non-existent node â throws) ââ');
  try {
    await createRelationship({
      sourceId: '00000000-0000-0000-0000-000000000000',
      targetId: ids.r1,
    });
    fail('should have thrown for non-existent sourceId');
  } catch (e: any) {
    assert(e.message.includes('not found or soft-deleted'), 'throws with correct message');
  }

  // ââ 7. getRelationshipById ââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ 7. getRelationshipById ââ');
  try {
    const found = await getRelationshipById(rel_r1_r2!.id);
    assert(found !== null, 'found by id');
    assert(found?.edgeKind === 'REAL_EDGE', 'edgeKind correct on retrieval');
    assert(found?.relationshipType === 'colleague', 'relationshipType correct on retrieval');

    const notFound = await getRelationshipById('00000000-0000-0000-0000-000000000000');
    assert(notFound === null, 'returns null for non-existent id');
  } catch (e) {
    fail('getRelationshipById threw', e);
  }

  // ââ 8. relationshipExists âââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ 8. relationshipExists ââ');
  try {
    assert(await relationshipExists(rel_r1_r2!.id), 'returns true for existing relationship');
    assert(!(await relationshipExists('00000000-0000-0000-0000-000000000000')), 'returns false for non-existent id');
  } catch (e) {
    fail('relationshipExists threw', e);
  }

  // ââ 9. getRelationshipsBetween ââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ 9. getRelationshipsBetween ââ');
  try {
    const rels = await getRelationshipsBetween(ids.r1, ids.r2);
    assert(rels.length === 1, 'exactly 1 relationship between R1 and R2');
    assert(rels[0].edgeKind === 'REAL_EDGE', 'correct edgeKind');

    // Reversed direction (undirected query)
    const reversed = await getRelationshipsBetween(ids.r2, ids.r1);
    assert(reversed.length === 1, 'undirected: same result when source/target swapped');

    // No relationship between R1 and R3 directly
    const empty = await getRelationshipsBetween(ids.r1, ids.r3);
    assert(empty.length === 0, 'no direct relationship between R1 and R3');

    // Between R2 and D1 â R2 has 2 rels but only 1 is R2âD1
    const r2d1 = await getRelationshipsBetween(ids.r2, ids.d1);
    assert(r2d1.length === 1, 'exactly 1 relationship between R2 and D1');
  } catch (e) {
    fail('getRelationshipsBetween threw', e);
  }

  // ââ 10. listRelationshipsByPerson âââââââââââââââââââââââââââââââââââââ
  console.log('\nââ 10. listRelationshipsByPerson ââ');
  try {
    // R1 has 2 outgoing rels (R1âR2, R1âD1)
    const r1Rels = await listRelationshipsByPerson(ids.r1);
    assert(r1Rels.length === 2, `R1 has 2 rels (got ${r1Rels.length})`);

    // D1 has 3 rels (R1âD1 incoming, R2âD1 incoming, D1âR3 outgoing)
    const d1Rels = await listRelationshipsByPerson(ids.d1);
    assert(d1Rels.length === 3, `D1 has 3 rels (got ${d1Rels.length})`);

    // R4 is isolated
    const r4Rels = await listRelationshipsByPerson(ids.r4);
    assert(r4Rels.length === 0, 'isolated node R4 has 0 rels');

    // Filter by edgeKind on D1
    const d1DemoRels = await listRelationshipsByPerson(ids.d1, 'DEMO_EDGE');
    assert(d1DemoRels.every(r => r.edgeKind === 'DEMO_EDGE'), 'edgeKind filter works');
    assert(d1DemoRels.length === 3, `D1 has 3 DEMO_EDGE rels (got ${d1DemoRels.length})`);

    const d1RealRels = await listRelationshipsByPerson(ids.d1, 'REAL_EDGE');
    assert(d1RealRels.length === 0, 'D1 has 0 REAL_EDGE rels');
  } catch (e) {
    fail('listRelationshipsByPerson threw', e);
  }

  // ââ 11. listRelationships âââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ 11. listRelationships ââ');
  try {
    const all = await listRelationships();
    assert(all.length >= 4, `listRelationships returns >= 4 (got ${all.length})`);
    assert(all.every(r => r.deletedAt === undefined || r.deletedAt === null),
      'all returned rels are active (no deletedAt)');

    const realOnly = await listRelationships('REAL_EDGE');
    assert(realOnly.every(r => r.edgeKind === 'REAL_EDGE'), 'REAL_EDGE filter works');
    assert(realOnly.some(r => r.id === rel_r1_r2!.id), 'R1âR2 in REAL_EDGE list');

    const demoOnly = await listRelationships('DEMO_EDGE');
    assert(demoOnly.every(r => r.edgeKind === 'DEMO_EDGE'), 'DEMO_EDGE filter works');
  } catch (e) {
    fail('listRelationships threw', e);
  }

  // ââ 12. countRelationships ââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ 12. countRelationships ââ');
  try {
    const total = await countRelationships();
    assert(total >= 4, `total count >= 4 (got ${total})`);

    const realCount = await countRelationships('REAL_EDGE');
    assert(realCount >= 1, `REAL_EDGE count >= 1 (got ${realCount})`);

    const demoCount = await countRelationships('DEMO_EDGE');
    assert(demoCount >= 3, `DEMO_EDGE count >= 3 (got ${demoCount})`);

    assert(realCount + demoCount === total, 'REAL_EDGE + DEMO_EDGE = total');
  } catch (e) {
    fail('countRelationships threw', e);
  }

  // ââ 13. updateRelationship ââââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ 13. updateRelationship ââ');
  try {
    const updated = await updateRelationship(rel_r1_r2!.id, {
      trustScore: 0.95,
      relationshipType: 'close_colleague',
    });
    assert(updated !== null, 'updateRelationship returned a relationship');
    assert(updated?.trustScore === 0.95, 'trustScore updated');
    assert(updated?.relationshipType === 'close_colleague', 'relationshipType updated');
    assert(updated?.sourceId === ids.r1, 'sourceId unchanged (immutable)');
    assert(updated?.targetId === ids.r2, 'targetId unchanged (immutable)');
    assert(updated?.updatedAt !== rel_r1_r2!.createdAt, 'updatedAt refreshed');

    // Attempt to mutate immutable fields â must be silently stripped
    await updateRelationship(rel_r1_r2!.id, {
      edgeKind: 'DEMO_EDGE' as any, // must NOT change
      sourceId: ids.r3 as any,      // must NOT change
    });
    const reread = await getRelationshipById(rel_r1_r2!.id);
    assert(reread?.edgeKind === 'REAL_EDGE', 'edgeKind cannot be mutated via updateRelationship');
    assert(reread?.sourceId === ids.r1, 'sourceId cannot be mutated via updateRelationship');

    // Non-existent id
    const noOp = await updateRelationship('00000000-0000-0000-0000-000000000000', { trustScore: 0.1 });
    assert(noOp === null, 'updateRelationship returns null for non-existent id');
  } catch (e) {
    fail('updateRelationship threw', e);
  }

  // ââ 14. softDeleteRelationship ââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ 14. softDeleteRelationship ââ');
  try {
    const deleted = await softDeleteRelationship(rel_r1_r2!.id);
    assert(deleted === true, 'softDeleteRelationship returned true');

    const notFound = await getRelationshipById(rel_r1_r2!.id);
    assert(notFound === null, 'soft-deleted rel not found by getRelationshipById');

    // Still physically exists
    assert(await relationshipExists(rel_r1_r2!.id), 'soft-deleted rel still physically exists');

    // No longer in listRelationships
    const allAfter = await listRelationships();
    assert(!allAfter.some(r => r.id === rel_r1_r2!.id), 'soft-deleted rel excluded from listRelationships');

    // No longer in getRelationshipsBetween
    const between = await getRelationshipsBetween(ids.r1, ids.r2);
    assert(between.length === 0, 'soft-deleted rel excluded from getRelationshipsBetween');

    // No longer in listRelationshipsByPerson
    const r1Rels = await listRelationshipsByPerson(ids.r1);
    assert(!r1Rels.some(r => r.id === rel_r1_r2!.id), 'soft-deleted rel excluded from listRelationshipsByPerson');

    // Deleting again returns false (already deleted)
    const again = await softDeleteRelationship(rel_r1_r2!.id);
    assert(again === false, 'softDeleteRelationship idempotent â returns false if already deleted');

    // Non-existent
    const noNode = await softDeleteRelationship('00000000-0000-0000-0000-000000000000');
    assert(noNode === false, 'softDeleteRelationship returns false for non-existent id');
  } catch (e) {
    fail('softDeleteRelationship threw', e);
  }

  // ââ 15. restoreRelationship âââââââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ 15. restoreRelationship ââ');
  try {
    const restored = await restoreRelationship(rel_r1_r2!.id);
    assert(restored === true, 'restoreRelationship returned true');

    const found = await getRelationshipById(rel_r1_r2!.id);
    assert(found !== null, 'restored rel visible again');
    assert(found?.deletedAt === undefined || found?.deletedAt === null, 'deletedAt cleared after restore');

    // Restoring an active rel returns false
    const noOp = await restoreRelationship(rel_r1_r2!.id);
    assert(noOp === false, 'restoreRelationship returns false when already active');
  } catch (e) {
    fail('restoreRelationship threw', e);
  }

  // ââ 16. Sparse property contract ââââââââââââââââââââââââââââââââââââââ
  console.log('\nââ 16. Sparse property contract ââ');
  try {
    const rel = await getRelationshipById(rel_r1_d1!.id);
    assert(rel !== null, 'rel found');
    // inferredFrom was NOT provided â must be absent (not stored as null)
    assert(rel?.inferredFrom === undefined, 'inferredFrom absent (sparse â not stored as null)');
    // inferred defaults to false
    assert(rel?.inferred === false, 'inferred defaults preserved');
    // inferredFrom was provided on D1âR3
    const rel2 = await getRelationshipById(rel_d1_r3!.id);
    assert(rel2?.inferredFrom === 'Hypothetical connection via D1', 'inferredFrom stored when provided');
  } catch (e) {
    fail('Sparse property contract threw', e);
  }

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
  console.error('[RelVerify] Unhandled error:', err.message ?? err);
  process.exit(1);
});
