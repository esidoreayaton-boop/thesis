// API Flow & Mock Integration Test Suite for Smart Barangay System
// Tests live and mock HTTP API responses across all endpoints and workflows

const BASE_URL = 'http://localhost:5000/api';

async function runApiFlowMockTests() {
  console.log('\n   \x1b[45;37m API FLOW & MOCK INTEGRATION TEST SUITE \x1b[0m\n');
  const start = Date.now();
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  \x1b[32m✓\x1b[0m \x1b[90m${name}\x1b[0m`);
    } catch (err) {
      failed++;
      console.log(`  \x1b[31m✗\x1b[0m \x1b[31m${name}: ${err.message}\x1b[0m`);
    }
  }

  // 1. Health / Server Check
  await test('GET /api/stats/admin returns valid administrative metrics', async () => {
    const res = await fetch(`${BASE_URL}/stats/admin`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (typeof data.totalResidents !== 'number' && typeof data.pendingDocs !== 'number') {
      throw new Error('Invalid stats payload structure');
    }
  });

  // 2. Documents Fetch
  await test('GET /api/documents returns array of civil document records', async () => {
    const res = await fetch(`${BASE_URL}/documents`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array of documents');
  });

  // 3. Multi-Barangay Documents Scoping
  await test('GET /api/documents?barangay=Pianing returns scoped documents', async () => {
    const res = await fetch(`${BASE_URL}/documents?barangay=Pianing`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array of documents');
  });

  // 4. Residents List
  await test('GET /api/residents returns array of registered residents', async () => {
    const res = await fetch(`${BASE_URL}/residents`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array of residents');
  });

  // 5. Pending Residents for Verification
  await test('GET /api/residents/pending returns applicant verification queue', async () => {
    const res = await fetch(`${BASE_URL}/residents/pending`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array of pending applicants');
  });

  // 6. Users & Roles
  await test('GET /api/users returns system administrative & staff accounts', async () => {
    const res = await fetch(`${BASE_URL}/users`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array of system users');
  });

  // 7. Clinic Schedules
  await test('GET /api/clinic-schedules returns community health schedules', async () => {
    const res = await fetch(`${BASE_URL}/clinic-schedules`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array of schedules');
  });

  // 8. Appointments List
  await test('GET /api/appointments returns patient booking records', async () => {
    const res = await fetch(`${BASE_URL}/appointments`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array of appointments');
  });

  // 9. Activity Audit Logs
  await test('GET /api/activity-logs returns administrative audit trail', async () => {
    const res = await fetch(`${BASE_URL}/activity-logs`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array of activity logs');
  });

  // 10. Document Request Lifecycle Mock Submission
  await test('POST /api/documents creates a new document request with tracking code', async () => {
    const testDoc = {
      resident_name: 'Test API Resident',
      resident_id: 1,
      email: 'test.api.resident@gmail.com',
      document_type: 'Barangay Clearance',
      purpose: 'API Test Verification',
      barangay: 'Pianing'
    };
    const res = await fetch(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testDoc)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const created = await res.json();
    if (!created.request_code || !created.request_code.startsWith('DOC-')) {
      throw new Error(`Invalid request code: ${created.request_code}`);
    }
  });

  // 11. Optional ID Registration Flow
  await test('POST /api/auth/register strictly requires valid ID photo', async () => {
    const testTimestamp = Date.now();
    const uniqueEmail = `test.resident.${testTimestamp}@gmail.com`;
    const uniqueFirstName = `AutoTest${testTimestamp % 10000}`;
    // 1. Attempt registration WITHOUT ID photo (Must be rejected)
    const rejectRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: uniqueFirstName,
        last_name: 'Resident',
        email: uniqueEmail,
        password: 'Password123!',
        phone: '09179998877',
        date_of_birth: '1995-05-15',
        gender: 'Male',
        civil_status: 'Single',
        address: 'Purok 1, Barangay Pianing, Butuan City',
        barangay: 'Pianing',
        role: 'resident',
        submitted_id: null
      })
    });
    if (rejectRes.status !== 400) {
      throw new Error(`Expected HTTP 400 for registration without ID, got ${rejectRes.status}`);
    }

    // 2. Registration WITH valid ID photo (Must succeed)
    const acceptRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: uniqueFirstName,
        last_name: 'Resident',
        email: uniqueEmail,
        password: 'Password123!',
        phone: '09179998877',
        date_of_birth: '1995-05-15',
        gender: 'Male',
        civil_status: 'Single',
        address: 'Purok 1, Barangay Pianing, Butuan City',
        barangay: 'Pianing',
        role: 'resident',
        submitted_id: 'data:image/png;base64,SAMPLE_VALID_ID_PHOTO'
      })
    });
    if (acceptRes.status !== 201 && acceptRes.status !== 200) {
      throw new Error(`HTTP ${acceptRes.status}`);
    }
    const result = await acceptRes.json();
    if (!result.success && !result.user) {
      throw new Error('Registration response did not indicate success');
    }
  });

  // 12. Check Status Live Endpoint
  await test('GET /api/auth/check-status returns current verification status', async () => {
    const res = await fetch(`${BASE_URL}/auth/check-status?email=yes@gmail.com`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.verification_status && !data.user) {
      throw new Error('Missing verification_status field');
    }
  });

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n  \x1b[1mAPI Tests:\x1b[0m  \x1b[32m${passed} passed\x1b[0m (${passed + failed} assertions)`);
  console.log(`  \x1b[1mDuration:\x1b[0m   ${duration}s\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runApiFlowMockTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
