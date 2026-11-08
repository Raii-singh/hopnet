/**
 * E2E CRUD Verification on Empty Graph
 * 
 * Simulates the GUI's interaction with the v2 Neo4j API endpoints.
 */

import request from 'supertest';
import app from '../src/app';
import assert from 'assert';

async function run() {
  console.log('ââ Empty Graph CRUD E2E Validation ââ');
  
  // 1. Authenticate as Admin
  const agent = request.agent(app);
  const loginRes = await agent.post('/api/v2/auth/login').send({ password: process.env.ADMIN_PASSPHRASE || 'hopnet-admin-2026' });
  assert(loginRes.status === 200, 'Admin login successful');

  let passed = 0;
  let failed = 0;

  function check(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  â ${msg}`);
      passed++;
    } else {
      console.error(`  â ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Create Node A
    const resA = await agent.post('/api/v2/persons').send({
      fullName: 'Alice Test',
      email: 'alice@test.com',
      nodeType: 'REAL'
    });
    check(resA.status === 201, 'Create Node A returns 201');
    const nodeA = resA.body.data;
    check(nodeA.fullName === 'Alice Test', 'Node A has correct name');

    // 2. Create Node B
    const resB = await agent.post('/api/v2/persons').send({
      fullName: 'Bob Test',
      email: 'bob@test.com',
      nodeType: 'REAL'
    });
    check(resB.status === 201, 'Create Node B returns 201');
    const nodeB = resB.body.data;

    // Create DEMO Node C for REAL/DEMO path constraint testing
    const resC = await agent.post('/api/v2/persons').send({
      fullName: 'Charlie Demo',
      nodeType: 'DEMO'
    });
    const nodeC = resC.body.data;
    
    // 3. Create relationship A-B
    const resEdgeAB = await agent.post('/api/v2/relationships').send({
      sourceId: nodeA.id,
      targetId: nodeB.id,
      relationshipType: 'friend',
      trustScore: 80,
      interactionFrequency: 1
    });
    check(resEdgeAB.status === 201, 'Create Relationship A-B returns 201');
    const edgeAB = resEdgeAB.body.data;
    check(edgeAB.edgeKind === 'REAL_EDGE', 'Relationship A-B is a REAL_EDGE');

    // Create A-C edge and C-B edge
    await agent.post('/api/v2/relationships').send({ sourceId: nodeA.id, targetId: nodeC.id, relationshipType: 'colleague', trustScore: 70 });
    await agent.post('/api/v2/relationships').send({ sourceId: nodeC.id, targetId: nodeB.id, relationshipType: 'colleague', trustScore: 70 });

    // 4. Edit Node A
    const resEditA = await agent.patch(`/api/v2/persons/${nodeA.id}`).send({
      company: 'Test Corp'
    });
    check(resEditA.status === 200, 'Edit Node A returns 200');
    check(resEditA.body.data.company === 'Test Corp', 'Node A company updated');

    // 5. Edit Relationship A-B
    const resEditEdge = await agent.patch(`/api/v2/relationships/${edgeAB.id}`).send({
      trustScore: 99
    });
    check(resEditEdge.status === 200, 'Edit Relationship A-B returns 200');
    check(resEditEdge.body.data.trustScore === 99, 'Relationship A-B trustScore updated');

    // 6. Test 1-hop traversal (Graph context of A)
    const resGraph = await agent.get(`/api/v2/graph/neighborhood/${nodeA.id}?depth=1&includeDemo=true`);
    check(resGraph.status === 200, 'Neighborhood 1-hop returns 200');
    check(resGraph.body.nodes.length === 3, `1-hop graph has 3 nodes (A, B, C) (got ${resGraph.body.nodes.length})`);
    
    // 7. Test semantic filters
    const resGraphFilter = await agent.get(`/api/v2/graph/neighborhood/${nodeA.id}?depth=1&includeDemo=true&minTrustScore=90`);
    check(resGraphFilter.status === 200, 'Neighborhood filtered by minTrustScore=90');
    // Only A-B has trustScore=99. C is 70, so it shouldn't be included.
    check(resGraphFilter.body.nodes.length === 2, `Filtered graph has 2 nodes (A, B) (got ${resGraphFilter.body.nodes.length})`);

    // 8. Test Pathfinder traversal (Shortest path A -> B)
    const resPath = await agent.get(`/api/v2/graph/shortest-path?sourceId=${nodeA.id}&targetId=${nodeB.id}&includeDemo=true`);
    check(resPath.status === 200, 'Shortest path A->B returns 200');
    check(resPath.body.path.length === 2, 'Path A->B length is 2 (A, B)');

    // 9. Delete relationship A-B
    const resDelEdge = await agent.delete(`/api/v2/relationships/${edgeAB.id}`);
    check(resDelEdge.status === 200, 'Delete Relationship A-B returns 200');

    // Test Pathfinder traversal after deletion (A -> B via C) - Wait, A is REAL, C is DEMO, B is REAL.
    // The traversal rules say REAL -> DEMO -> REAL is blocked!
    const resPathBlocked = await agent.get(`/api/v2/graph/shortest-path?sourceId=${nodeA.id}&targetId=${nodeB.id}&includeDemo=true`);
    check(resPathBlocked.status === 404, 'Shortest path A->C->B is blocked (REAL->DEMO->REAL rule)');

    // 10. Delete Node A
    const resDelA = await agent.delete(`/api/v2/persons/${nodeA.id}`);
    check(resDelA.status === 200, 'Delete Node A returns 200');
    
    // Ensure Node A is deleted
    const resGetA = await agent.get(`/api/v2/persons/${nodeA.id}`);
    check(resGetA.status === 404, 'Deleted Node A returns 404');
    
  } catch (err: any) {
    console.error('Unhandled error during test:', err);
    failed++;
  }

  console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');
  
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();