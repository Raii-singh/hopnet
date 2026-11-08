/**
 * HOPNet â Restore Edge Case: RESTORE â  ACTIVATE
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * Focused tests for the RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED scenario.
 *
 * The relationship lifecycle this covers:
 *
 *   1. Create A â B  (both REAL, active)
 *   2. Soft-delete the relationship A â B
 *   3. Soft-delete endpoint B (node)
 *   4. Restore the relationship A â B
 *      â The restore physically clears deletedAt on the relationship.
 *      â But B is still soft-deleted, so the relationship is NOT visible
 *        in normal reads (Decision 4: both endpoints must be active).
 *      â Service throws RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED.
 *   5. Restore endpoint B (node)
 *      â Relationship becomes visible automatically in normal reads.
 *      â No further action on the relationship itself is needed.
 *
 * Also tests:
 *   - Normal restore (both endpoints active) returns the relationship correctly.
 *   - The error message clearly signals RESTORE â  ACTIVATE.
 *   - After restoring the endpoint, the relationship is visible again.
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register --transpile-only scripts/verify_restore_edge_case.ts
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

async function hardDeleteAll() {
  if (createdNodeIds.length === 0) return;
  const session = getSession();
  try {
    await session.run(`MATCH (p:Person) WHERE p.id IN $ids DETACH DELETE p`, { ids: createdNodeIds });
    console.log(`\n  ð§¹ Hard-deleted ${createdNodeIds.length} test node(s) + relationships.`);
  } finally { await session.close(); }
}

async function run() {
  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log('  HOPNet â Restore Edge Case: RESTORE â  ACTIVATE');
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

  await verifyConnectivity();
  console.log('  [Neo4j] Connected\n');

  // ââ Setup ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  console.log('ââ Setup: 2 REAL nodes, 1 relationship ââ');
  const nodeA = await personSvc.createPerson({ nodeType: 'REAL', fullName: 'Restore Test A', createdBy: 'RestoreTest' });
  const nodeB = await personSvc.createPerson({ nodeType: 'REAL', fullName: 'Restore Test B', createdBy: 'RestoreTest' });
  createdNodeIds.push(nodeA.id, nodeB.id);

  const rel = await relSvc.createRelationship({
    sourceId: nodeA.id,
    targetId: nodeB.id,
    relationshipType: 'colleague',
    createdBy: 'RestoreTest',
  });
  assert(rel.edgeKind === 'REAL_EDGE', 'Setup: AâB colleague created (REAL_EDGE)');

  // ââ Test 1: Normal restore (both endpoints active) âââââââââââââââââââââ
  console.log('\nââ T1: Normal restore (both endpoints active) ââ');

  await relSvc.softDeleteRelationship(rel.id);

  // Verify it is not visible
  try {
    await relSvc.getRelationshipById(rel.id);
    fail('T1: soft-deleted rel should not be visible via getRelationshipById');
  } catch (e: unknown) {
    if (e instanceof HOPNetError && e.code === 'RELATIONSHIP_NOT_FOUND') {
      ok('T1: soft-deleted rel returns RELATIONSHIP_NOT_FOUND');
    } else {
      fail('T1: unexpected error while checking soft-deleted rel', e);
    }
  }

  // Restore with both endpoints active â should return the full relationship
  const restoredNormal = await relSvc.restoreRelationship(rel.id);
  assert(restoredNormal.id === rel.id, 'T1: restoreRelationship returns the relationship object');
  assert(restoredNormal.edgeKind === 'REAL_EDGE', 'T1: edgeKind preserved after restore');
  assert(restoredNormal.relationshipType === 'colleague', 'T1: relationshipType preserved after restore');
  assert(typeof restoredNormal.weight === 'number', 'T1: weight computed and attached on restored rel');

  // Relationship is visible again via normal read
  const visibleAfterRestore = await relSvc.getRelationshipById(rel.id);
  assert(visibleAfterRestore.id === rel.id, 'T1: relationship visible via getRelationshipById after normal restore');

  // ââ Test 2: RESTORE â  ACTIVATE â endpoint soft-deleted âââââââââââââââââ
  console.log('\nââ T2: Restore with soft-deleted endpoint â RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED ââ');

  // Step 1: soft-delete the relationship
  await relSvc.softDeleteRelationship(rel.id);
  ok('T2-step1: relationship soft-deleted');

  // Step 2: soft-delete endpoint B
  await personSvc.softDeletePerson(nodeB.id);
  ok('T2-step2: endpoint B soft-deleted');

  // Step 3: Restore the relationship (B is still soft-deleted)
  let caughtEdgeCase = false;
  try {
    await relSvc.restoreRelationship(rel.id);
    fail('T2: expected RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED but got normal return');
  } catch (e: unknown) {
    if (e instanceof HOPNetError && e.code === 'RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED') {
      caughtEdgeCase = true;
      ok('T2-step3: throws RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED');
      assert(
        e.message.includes('deletedAt cleared') || e.message.includes('restored'),
        'T2: error message confirms restore succeeded'
      );
      assert(
        e.message.includes('endpoint') || e.message.includes('inactive'),
        'T2: error message explains endpoint is the issue'
      );
      assert(
        e.message.toLowerCase().includes('restore') && e.message.includes('visible'),
        'T2: error message gives actionable guidance'
      );
    } else {
      fail('T2: wrong error type/code', e);
    }
  }

  if (caughtEdgeCase) {
    // Step 4: Verify the relationship is NOT visible in normal reads
    // (Decision 4: both endpoints must be active)
    try {
      await relSvc.getRelationshipById(rel.id);
      fail('T2: soft-deleted endpoint should still hide the relationship from normal reads');
    } catch (e: unknown) {
      if (e instanceof HOPNetError && e.code === 'RELATIONSHIP_NOT_FOUND') {
        ok('T2-step4: relationship still not visible while B endpoint is soft-deleted (Decision 4 intact)');
      } else {
        fail('T2-step4: unexpected error', e);
      }
    }

    // Step 5: Restore endpoint B â relationship becomes visible automatically
    await personSvc.restorePerson(nodeB.id);
    ok('T2-step5: endpoint B restored');

    const visibleAfterEndpointRestore = await relSvc.getRelationshipById(rel.id);
    assert(
      visibleAfterEndpointRestore.id === rel.id,
      'T2-step5: relationship automatically visible after endpoint is restored (no action on relationship needed)'
    );
    assert(
      visibleAfterEndpointRestore.edgeKind === 'REAL_EDGE',
      'T2-step5: edgeKind correct after endpoint restore'
    );
  }

  // ââ Test 3: Target endpoint soft-deleted (vs source) âââââââââââââââââââ
  console.log('\nââ T3: Source endpoint soft-deleted version ââ');

  // Create a fresh rel for this test
  const relT3 = await relSvc.createRelationship({
    sourceId: nodeA.id,
    targetId: nodeB.id,
    relationshipType: 'mentor',
    createdBy: 'RestoreTest',
  });
  assert(relT3.edgeKind === 'REAL_EDGE', 'T3-setup: AâB mentor created');

  // Soft-delete the relationship
  await relSvc.softDeleteRelationship(relT3.id);

  // Soft-delete SOURCE endpoint (A) this time
  await personSvc.softDeletePerson(nodeA.id);

  let caughtT3 = false;
  try {
    await relSvc.restoreRelationship(relT3.id);
    fail('T3: expected RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED (source deleted)');
  } catch (e: unknown) {
    if (e instanceof HOPNetError && e.code === 'RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED') {
      caughtT3 = true;
      ok('T3: throws RELATIONSHIP_RESTORED_BUT_ENDPOINT_DELETED when SOURCE endpoint is soft-deleted');
    } else {
      fail('T3: wrong error', e);
    }
  }

  if (caughtT3) {
    // Restore the source endpoint â rel becomes visible
    await personSvc.restorePerson(nodeA.id);
    const t3Visible = await relSvc.getRelationshipById(relT3.id);
    assert(t3Visible.id === relT3.id, 'T3: relationship visible after source endpoint restored');
  }

  // ââ Test 4: Restoring already-active relationship still throws correctly â
  console.log('\nââ T4: Unrelated: restoring active relationship â RELATIONSHIP_NOT_DELETED ââ');
  try {
    await relSvc.restoreRelationship(rel.id);
    fail('T4: expected RELATIONSHIP_NOT_DELETED');
  } catch (e: unknown) {
    if (e instanceof HOPNetError && e.code === 'RELATIONSHIP_NOT_DELETED') {
      ok('T4: restoring active relationship throws RELATIONSHIP_NOT_DELETED (unaffected by edge case change)');
    } else {
      fail('T4: wrong error', e);
    }
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

run().catch(async err => {
  console.error('[RestoreEdgeCase] Unhandled error:', err.message ?? err);
  await hardDeleteAll();
  await closeDriver();
  process.exit(1);
});
