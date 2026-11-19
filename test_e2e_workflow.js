const http = require('http');
const app = require('./src/app');

async function runE2ETests() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`🚀 In-memory test server running on ${baseUrl}`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // TEST 1: Clinic Admin Login & Workflow
    // ---------------------------------------------------------
    console.log('\n--- 1. Testing Clinic Admin Workflow (clinicadmin@zhealth.com) ---');
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'clinicadmin@zhealth.com', password: 'Password123!' })
    }).then(r => r.json());

    assert(adminLoginRes.success === true, 'Clinic Admin login successful');
    assert(adminLoginRes.data?.user?.role === 'CLINIC_ADMIN', 'Role is CLINIC_ADMIN');
    const adminToken = adminLoginRes.data?.accessToken;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

    // Fetch Patients
    const adminPatients = await fetch(`${baseUrl}/clinic-admin/patients`, { headers: adminHeaders }).then(r => r.json());
    assert(adminPatients.success === true, 'Admin getPatients succeeded');
    assert(Array.isArray(adminPatients.data) && adminPatients.data.length >= 2, `Admin sees ${adminPatients.data?.length} clients (>= 2 required)`);

    // Fetch Practitioners
    const adminPractitioners = await fetch(`${baseUrl}/clinic-admin/practitioners`, { headers: adminHeaders }).then(r => r.json());
    assert(adminPractitioners.success === true, 'Admin getPractitioners succeeded');
    assert(Array.isArray(adminPractitioners.data) && adminPractitioners.data.length >= 2, `Admin sees ${adminPractitioners.data?.length} practitioners (>= 2 required)`);

    // Fetch Appointments
    const adminAppts = await fetch(`${baseUrl}/clinic-admin/appointments`, { headers: adminHeaders }).then(r => r.json());
    assert(adminAppts.success === true, 'Admin getAppointments succeeded');
    assert(Array.isArray(adminAppts.data) && adminAppts.data.length >= 2, `Admin sees ${adminAppts.data?.length} appointments`);

    // ---------------------------------------------------------
    // TEST 2: Admin Creates a New Client Record
    // ---------------------------------------------------------
    console.log('\n--- 2. Testing Client Creation by Admin ---');
    const newClientEmail = `trial.client.${Date.now()}@example.com`;
    const createPatientRes = await fetch(`${baseUrl}/clinic-admin/patients`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        fullName: 'Trial Test Client',
        email: newClientEmail,
        phone: '+61 400 999 888',
        dob: '1995-05-15',
        gender: 'Female',
        address: '12 King Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        medicareCard: '1234567890',
        notes: 'Integration test record'
      })
    }).then(r => r.json());

    assert(createPatientRes.success === true, 'Patient created successfully by Admin');
    const createdPatientId = createPatientRes.data?.id;
    assert(Boolean(createdPatientId), `Created patient has valid ID: ${createdPatientId}`);

    // Verify Patient Persists in List
    const verifyPatientList = await fetch(`${baseUrl}/clinic-admin/patients?search=Trial Test Client`, { headers: adminHeaders }).then(r => r.json());
    assert(verifyPatientList.data?.some(p => p.email === newClientEmail), 'Newly created patient appears in getPatients list');

    // ---------------------------------------------------------
    // TEST 3: Admin Creates a New Practitioner Record
    // ---------------------------------------------------------
    console.log('\n--- 3. Testing Practitioner Creation by Admin ---');
    const newPracEmail = `trial.doc.${Date.now()}@clinic.com`;
    const createPracRes = await fetch(`${baseUrl}/clinic-admin/practitioners`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Dr. Evelyn Reed',
        email: newPracEmail,
        specialty: 'Podiatrist',
        phone: '+61 400 111 222',
        consultationFee: 175.0,
        availability: {
          Monday: { available: true, startTime: '09:00', endTime: '17:00' },
          Wednesday: { available: true, startTime: '09:00', endTime: '17:00' }
        }
      })
    }).then(r => r.json());

    assert(createPracRes.success === true, 'Practitioner created successfully by Admin');
    const createdPracId = createPracRes.data?.id;
    assert(Boolean(createdPracId), `Created practitioner has valid ID: ${createdPracId}`);

    // Verify Practitioner Persists in List
    const verifyPracList = await fetch(`${baseUrl}/clinic-admin/practitioners?search=Evelyn`, { headers: adminHeaders }).then(r => r.json());
    assert(verifyPracList.data?.some(p => p.email === newPracEmail), 'Newly created practitioner appears in getPractitioners list');

    // ---------------------------------------------------------
    // TEST 4: Practitioner Login & Workflow (Dr. Sarah Jenkins)
    // ---------------------------------------------------------
    console.log('\n--- 4. Testing Practitioner Workflow (sarah.jenkins@clinic.com) ---');
    const pracLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah.jenkins@clinic.com', password: 'Password123!' })
    }).then(r => r.json());

    assert(pracLoginRes.success === true, 'Practitioner login successful');
    assert(pracLoginRes.data?.user?.role === 'PRACTITIONER', 'Role is PRACTITIONER');
    const pracToken = pracLoginRes.data?.accessToken;
    const pracHeaders = { 'Authorization': `Bearer ${pracToken}`, 'Content-Type': 'application/json' };

    // Practitioner Patients
    const pracPatients = await fetch(`${baseUrl}/practitioner/patients`, { headers: pracHeaders }).then(r => r.json());
    assert(pracPatients.success === true, 'Practitioner getPatients succeeded');
    assert(Array.isArray(pracPatients.data) && pracPatients.data.length >= 1, `Practitioner sees ${pracPatients.data?.length} patients`);

    // Practitioner Appointments
    const pracAppts = await fetch(`${baseUrl}/practitioner/appointments`, { headers: pracHeaders }).then(r => r.json());
    assert(pracAppts.success === true, 'Practitioner getAppointments succeeded');
    assert(Array.isArray(pracAppts.data) && pracAppts.data.length >= 1, `Practitioner sees ${pracAppts.data?.length} scheduled appointments`);

    // ---------------------------------------------------------
    // TEST 5: Patient Login & Workflow (Oliver Vance / patient@zhealth.com)
    // ---------------------------------------------------------
    console.log('\n--- 5. Testing Patient Portal Workflow (patient@zhealth.com) ---');
    const patientLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@zhealth.com', password: 'Password123!' })
    }).then(r => r.json());

    assert(patientLoginRes.success === true, 'Patient login successful');
    assert(patientLoginRes.data?.user?.role === 'PATIENT', 'Role is PATIENT');
    const patientToken = patientLoginRes.data?.accessToken;
    const patientHeaders = { 'Authorization': `Bearer ${patientToken}`, 'Content-Type': 'application/json' };

    // Patient Profile
    const patientProfile = await fetch(`${baseUrl}/patient/profile`, { headers: patientHeaders }).then(r => r.json());
    assert(patientProfile.success === true, 'Patient profile loaded successfully');
    assert(patientProfile.data?.email === 'patient@zhealth.com', 'Profile email matches patient@zhealth.com');

    // Patient Practitioners Available for Booking
    const patientPractitioners = await fetch(`${baseUrl}/patient/practitioners`, { headers: patientHeaders }).then(r => r.json());
    assert(patientPractitioners.success === true, 'Patient getPractitioners succeeded');
    assert(Array.isArray(patientPractitioners.data) && patientPractitioners.data.length >= 2, `Patient sees ${patientPractitioners.data?.length} active doctors for booking`);

    // Patient Appointments List
    const patientAppts = await fetch(`${baseUrl}/patient/appointments`, { headers: patientHeaders }).then(r => r.json());
    assert(patientAppts.success === true, 'Patient getAppointments succeeded');
    assert(Array.isArray(patientAppts.data), `Patient appointments list retrieved (${patientAppts.data?.length} found)`);

    // ---------------------------------------------------------
    // TEST 6: Patient Books an Appointment (Client-Side Booking)
    // ---------------------------------------------------------
    console.log('\n--- 6. Testing Patient Booking Flow ---');
    const bookingDate = '2026-11-02'; // Monday
    const bookingTime = '11:00 AM';
    const bookRes = await fetch(`${baseUrl}/patient/appointments`, {
      method: 'POST',
      headers: patientHeaders,
      body: JSON.stringify({
        practitionerId: adminPractitioners.data[0]?.id,
        practitionerName: adminPractitioners.data[0]?.name,
        branchName: 'Melbourne Central Clinic',
        serviceName: 'Physiotherapy Consultation',
        date: bookingDate,
        startTime: bookingTime,
        notes: 'Automated booking verification test'
      })
    }).then(r => r.json());

    assert(bookRes.success === true, `Patient successfully booked appointment: ${bookRes.data?.displayId}`);
    const bookedApptId = bookRes.data?.id;

    // Test Duplicate Booking Safeguard
    const duplicateRes = await fetch(`${baseUrl}/patient/appointments`, {
      method: 'POST',
      headers: patientHeaders,
      body: JSON.stringify({
        practitionerId: adminPractitioners.data[0]?.id,
        practitionerName: adminPractitioners.data[0]?.name,
        branchName: 'Melbourne Central Clinic',
        serviceName: 'Physiotherapy Consultation',
        date: bookingDate,
        startTime: bookingTime,
        notes: 'Duplicate attempt'
      })
    });
    assert(duplicateRes.status === 409, `Duplicate booking properly rejected with HTTP 409 (received ${duplicateRes.status})`);

    // Test Reschedule
    if (bookedApptId) {
      const rescheduleRes = await fetch(`${baseUrl}/patient/appointments/${bookedApptId}/reschedule`, {
        method: 'PUT',
        headers: patientHeaders,
        body: JSON.stringify({ date: '2026-11-09', startTime: '14:00 PM' })
      }).then(r => r.json());
      assert(rescheduleRes.success === true, 'Patient can reschedule their appointment');

      // Test Cancel
      const cancelRes = await fetch(`${baseUrl}/patient/appointments/${bookedApptId}/cancel`, {
        method: 'PUT',
        headers: patientHeaders
      }).then(r => r.json());
      assert(cancelRes.success === true, 'Patient can cancel their appointment');
    }

    // ---------------------------------------------------------
    // TEST 7: Role-Based Access Control (Security)
    // ---------------------------------------------------------
    console.log('\n--- 7. Testing RBAC Restrictions ---');
    const forbiddenPatientMutation = await fetch(`${baseUrl}/clinic-admin/admins`, {
      method: 'POST',
      headers: patientHeaders,
      body: JSON.stringify({ name: 'Hacker', email: 'hacker@test.com' })
    });
    assert(forbiddenPatientMutation.status === 403, `Patient blocked from creating Admin with 403 (received ${forbiddenPatientMutation.status})`);

    const forbiddenAdminAccessToClinicalGoals = await fetch(`${baseUrl}/patient/treatment-plans`, {
      method: 'POST',
      headers: patientHeaders,
      body: JSON.stringify({ condition: 'Test' })
    });
    assert(forbiddenAdminAccessToClinicalGoals.status === 403, `Patient blocked from creating clinical treatment plans (received ${forbiddenAdminAccessToClinicalGoals.status})`);

  } catch (err) {
    console.error('Unhandled test exception:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n======================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error(err);
  process.exit(1);
});
