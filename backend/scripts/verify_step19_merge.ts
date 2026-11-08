import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { verifyConnectivity, closeDriver } from '../src/config/neo4j';
import { createPerson } from '../src/repositories/person.repository';
import { createRelationship } from '../src/repositories/relationship.repository';
import { getNeighbourhood } from '../src/repositories/graph.repository';

let passed = 0;
let failed = 0;

function ok(label: string) { console.log(`  â ${label}`); passed++; }
function fail(label: string, e?: unknown) { console.error(`  â ${label}`, e ?? ''); failed++; }
function assert(c: boolean, label: string, extra?: unknown) { c ? ok(label) : fail(label, extra); }

async function run() {
  console.log('ââ Step 19: Merge & Connectors Validation ââ');
  
  await verifyConnectivity();
  console.log('  [Neo4j] Connected');

  try {
    const agent = request.agent(app);
    await agent.post('/api/v2/auth/login').send({ password: process.env.ADMIN_PASSPHRASE || 'hopnet-admin-2026' });

    // 1. Setup Data
    const targetNode = await createPerson('HNP-TEST1', { fullName: 'Target Person', nodeType: 'REAL' });
    const sourceNode = await createPerson('HNP-TEST2', { fullName: 'Source Person', nodeType: 'REAL' });
    const thirdNode = await createPerson('HNP-TEST3', { fullName: 'Third Person', nodeType: 'REAL' });
    const demoNode = await createPerson('DNP-TEST4', { fullName: 'Demo Person', nodeType: 'DEMO' });

    // Create target -> third (REAL_EDGE)
    await createRelationship({ sourceId: targetNode.id, targetId: thirdNode.id, relationshipType: 'friend' });
    // Create source -> demo (DEMO_EDGE)
    await createRelationship({ sourceId: sourceNode.id, targetId: demoNode.id, relationshipType: 'acquaintance' });
    // Create third -> source (REAL_EDGE)
    await createRelationship({ sourceId: thirdNode.id, targetId: sourceNode.id, relationshipType: 'colleague' });

    // 2. Perform Merge
    const mergeRes = await agent.post('/api/v2/persons/merge').send({
      sourceId: sourceNode.id,
      targetId: targetNode.id
    });
    
    assert(mergeRes.status === 200, 'Merge request returns 200 OK', mergeRes.body);

    // 3. Verify Neighborhood of Target
    const n = await getNeighbourhood(targetNode.id, 2);
    
    const nodeIds = n.nodes.map(n => n.id);
    assert(nodeIds.includes(targetNode.id), 'Target node is in neighborhood');
    assert(nodeIds.includes(thirdNode.id), 'Third node is in neighborhood');
    assert(nodeIds.includes(demoNode.id), 'Demo node is in neighborhood (via rewired edge)');
    assert(!nodeIds.includes(sourceNode.id), 'Source node is excluded from neighborhood (soft deleted)');

    const targetToThird = n.relationships.find(r => r.sourceId === targetNode.id && r.targetId === thirdNode.id);
    assert(!!targetToThird, 'Target to Third original edge exists');
    assert(targetToThird?.edgeKind === 'REAL_EDGE', 'Target to Third edge is REAL_EDGE');

    const targetToDemo = n.relationships.find(r => r.sourceId === targetNode.id && r.targetId === demoNode.id);
    assert(!!targetToDemo, 'Source to Demo edge was rewired to Target');
    assert(targetToDemo?.edgeKind === 'DEMO_EDGE', 'Target to Demo edge has correct edgeKind');
    assert(targetToDemo?.relationshipType === 'acquaintance', 'Target to Demo edge preserved relationshipType');

    const thirdToTarget = n.relationships.find(r => r.sourceId === thirdNode.id && r.targetId === targetNode.id);
    assert(!!thirdToTarget, 'Third to Source edge was rewired to Target');
    assert(thirdToTarget?.edgeKind === 'REAL_EDGE', 'Third to Target edge has correct edgeKind');

    // 5. Duplicate test
    const dupTarget = await createPerson('HNP-DUP', { fullName: 'Duplicate Target', email: 'dup@example.com', company: 'HOPNet', nodeType: 'REAL' });
    const dupSource = await createPerson('HNP-DUP2', { fullName: 'Duplicate Target (copy)', email: 'dup@example.com', company: 'HOPNet', nodeType: 'REAL' });
    
    const dupRes = await agent.get('/api/v2/persons/duplicates/all');
    assert(dupRes.status === 200, 'Duplicates request returns 200 OK');
    const suggestions = dupRes.body.suggestions;
    const hasSuggestion = suggestions.some((s: any) => 
      (s.userA.id === dupTarget.id && s.userB.id === dupSource.id) ||
      (s.userB.id === dupTarget.id && s.userA.id === dupSource.id)
    );
    assert(hasSuggestion, 'Duplicate detection found exact email match');

    // 6. Ingestion test
    const ingestRes = await agent.post('/api/connectors/ingest').send({
      connectorType: 'linkedin',
      filename: 'connections.csv',
      sourceNodeId: targetNode.id,
      previewData: {
        detectedNodes: [
          { fullName: 'New Contact', email: 'new@example.com' }
        ],
        duplicateMatches: [],
        inferredEdges: []
      }
    });
    assert(ingestRes.status === 200, 'Ingest request returns 200 OK');

    console.log('\nââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ\n');

    if (failed > 0) throw new Error('Some tests failed');
  } finally {
    await closeDriver();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
