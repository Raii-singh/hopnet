import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { verifyConnectivity, closeDriver } from '../src/config/neo4j';
import { createPerson, getPersonByPublicId } from '../src/repositories/person.repository';

let passed = 0;
let failed = 0;

function ok(label: string) { console.log(`  â ${label}`); passed++; }
function fail(label: string, e?: unknown) { console.error(`  â ${label}`, e ?? ''); failed++; }
function assert(c: boolean, label: string, extra?: unknown) { c ? ok(label) : fail(label, extra); }

async function run() {
  console.log('ââ Step 19: Ingestion Validation ââ');
  
  await verifyConnectivity();
  console.log('  [Neo4j] Connected');

  try {
    const agent = request.agent(app);
    await agent.post('/api/v2/auth/login').send({ password: process.env.ADMIN_PASSPHRASE || 'hopnet-admin-2026' });

    const adminNode = await createPerson('HNP-ADMIN-INGEST', { fullName: 'Admin Ingest', nodeType: 'REAL' });

    // 1. Ingest new contact
    const ingestRes1 = await agent.post('/api/connectors/ingest').send({
      connectorType: 'linkedin',
      filename: 'connections.csv',
      sourceNodeId: adminNode.id,
      previewData: {
        detectedNodes: [
          { fullName: 'New Contact 1', email: 'new1@example.com' }
        ],
        duplicateMatches: [],
        inferredEdges: []
      }
    });
    
    assert(ingestRes1.status === 200, 'Ingest 1 request returns 200 OK');
    assert(ingestRes1.body.nodesCreated === 1, '1 node created');

    // 2. Ingest duplicate contact (should not create new node if mapped as duplicate)
    // First, let's simulate the preview logic to see what it would do.
    const previewRes = await agent.post('/api/connectors/preview').send({
      connectorType: 'linkedin',
      rawText: 'First Name,Last Name,Email Address\nNew,Contact 1,new1@example.com\nMissing,Email,'
    });
    assert(previewRes.status === 200, 'Preview returns 200 OK');
    
    // It should detect 'new1@example.com' as a duplicate match of the one we just created
    // But since the preview logic in connector.service.ts uses getDuplicates which we just fixed...
    // Let's test exact identity matching.
    const duplicateMatches = previewRes.body.duplicateMatches;
    assert(duplicateMatches.some((m: any) => m.contact.email === 'new1@example.com'), 'Duplicate detected by email');

    const detectedNodes = previewRes.body.detectedNodes;
    assert(detectedNodes.some((n: any) => n.fullName === 'Missing Email'), 'Node with missing email is treated as new node safely');

    // 3. Ingesting again with duplicate mapping should create 0 nodes for the duplicate
    const ingestRes2 = await agent.post('/api/connectors/ingest').send({
      connectorType: 'linkedin',
      filename: 'connections.csv',
      sourceNodeId: adminNode.id,
      previewData: previewRes.body // feed it back
    });
    
    assert(ingestRes2.status === 200, 'Ingest 2 request returns 200 OK');
    // Only 1 node created: the one with missing email
    assert(ingestRes2.body.nodesCreated === 1, 'Only 1 new node created (the missing email one)');
    
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
