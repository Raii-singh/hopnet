import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { verifyConnectivity, closeDriver } from '../src/config/neo4j';

let passed = 0;
let failed = 0;

function ok(label: string) { console.log(`  â ${label}`); passed++; }
function fail(label: string, e?: unknown) { console.error(`  â ${label}`, e ?? ''); failed++; }
function assert(c: boolean, label: string, extra?: unknown) { c ? ok(label) : fail(label, extra); }

async function run() {
  console.log('ââ Step 16: Authentication Validation ââ');
  
  await verifyConnectivity();
  console.log('  [Neo4j] Connected');

  try {
    const agent = request.agent(app);

    // 1. Unauthorized protected request
    const unauthRes = await request(app).post('/api/v2/persons').send({ nodeType: 'REAL', fullName: 'Test' });
    assert(unauthRes.status === 401, `unauthorized protected request â 401 (got ${unauthRes.status})`);
    assert(unauthRes.body.error?.code === 'UNAUTHORIZED', 'error.code = UNAUTHORIZED');

    // 2. Auth status (unauthenticated)
    const status1 = await agent.get('/api/v2/auth/status');
    assert(status1.status === 200, 'auth status unauthenticated â 200');
    assert(status1.body.isAdmin === false, 'isAdmin = false');

    // 3. Missing credentials
    const missingRes = await agent.post('/api/v2/auth/login').send({});
    assert(missingRes.status === 400, `missing credentials â 400 (got ${missingRes.status})`);
    assert(missingRes.body.error?.code === 'VALIDATION_ERROR', 'error.code = VALIDATION_ERROR');

    // 4. Wrong password
    const wrongRes = await agent.post('/api/v2/auth/login').send({ password: 'wrongpassword123' });
    assert(wrongRes.status === 401, `wrong password â 401 (got ${wrongRes.status})`);
    assert(wrongRes.body.error?.code === 'UNAUTHORIZED', 'error.code = UNAUTHORIZED');

    // 5. Successful login
    const loginRes = await agent.post('/api/v2/auth/login').send({ password: process.env.ADMIN_PASSPHRASE || 'hopnet-admin-2026' });
    assert(loginRes.status === 200, `successful login â 200`);
    assert(loginRes.body.success === true, 'login success = true');

    // 6. Auth status (authenticated)
    const status2 = await agent.get('/api/v2/auth/status');
    assert(status2.status === 200, 'auth status authenticated â 200');
    assert(status2.body.isAdmin === true, 'isAdmin = true');

    // 7. Authenticated protected request
    const authRes = await agent.post('/api/v2/persons').send({ nodeType: 'REAL', fullName: 'Auth Test S16' });
    assert(authRes.status === 201, `authenticated mutation â 201 (got ${authRes.status})`);
    
    // cleanup
    if (authRes.status === 201) {
        await agent.delete(`/api/v2/persons/${authRes.body.id}`);
    }

    // 8. Logout
    const logoutRes = await agent.post('/api/v2/auth/logout');
    assert(logoutRes.status === 200, `logout â 200`);

    // 9. Auth status (logged out)
    const status3 = await agent.get('/api/v2/auth/status');
    assert(status3.status === 200, 'auth status logged out â 200');
    assert(status3.body.isAdmin === false, 'isAdmin = false after logout');
    
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
