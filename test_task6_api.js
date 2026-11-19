const http = require('http')

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }) }
        catch (e) { resolve({ status: res.statusCode, data: body }) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function login(email, password) {
  const body = JSON.stringify({ email, password })
  const res = await makeRequest({
    hostname: 'localhost', port: 5000,
    path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, body)
  return res.data?.data?.accessToken || null
}

async function runTests() {
  console.log('--- Task 6: Full Live Backend API Authorization Verification ---')

  // 1. Unauthenticated request must return 401
  const unauthRes = await makeRequest({
    hostname: 'localhost', port: 5000,
    path: '/api/patient/treatment-plans', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ condition: 'Test' }))
  console.log('1. Unauthenticated POST /treatment-plans status:', unauthRes.status, unauthRes.status === 401 ? '✅ PASS (401 Unauthorized)' : '❌ FAIL')

  // 2. Patient Token Login
  const patientToken = await login('patient@zhealth.com', 'Password123!')
  console.log('Patient login token:', patientToken ? '✅ Obtained' : '❌ Failed')

  if (patientToken) {
    // 3. Patient direct POST treatment plan -> MUST be 403 Forbidden
    const patientCreateRes = await makeRequest({
      hostname: 'localhost', port: 5000,
      path: '/api/patient/treatment-plans', method: 'POST',
      headers: {
        'Authorization': `Bearer ${patientToken}`,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      condition: 'Patient Self-Assigned Plan',
      goals: [{ id: 'g_hack', title: 'Hacked Goal', percent: 100 }]
    }))
    console.log('2. Patient direct POST /treatment-plans status:', patientCreateRes.status, patientCreateRes.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL')

    // 4. Patient direct PUT treatment plan -> MUST be 403 Forbidden
    const patientUpdateRes = await makeRequest({
      hostname: 'localhost', port: 5000,
      path: '/api/patient/treatment-plans/007af1d5-8f98-4dd4-b8cc-3fd7bc62da6e', method: 'PUT',
      headers: {
        'Authorization': `Bearer ${patientToken}`,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      goals: [{ id: 'g1', title: 'Modified by Patient', percent: 100 }]
    }))
    console.log('3. Patient direct PUT /treatment-plans/:id status:', patientUpdateRes.status, patientUpdateRes.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL')

    // 5. Patient direct DELETE treatment plan -> MUST be 403 Forbidden
    const patientDeleteRes = await makeRequest({
      hostname: 'localhost', port: 5000,
      path: '/api/patient/treatment-plans/007af1d5-8f98-4dd4-b8cc-3fd7bc62da6e', method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${patientToken}`
      }
    })
    console.log('4. Patient direct DELETE /treatment-plans/:id status:', patientDeleteRes.status, patientDeleteRes.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL')

    // 6. Patient GET treatment plans -> MUST succeed (200 OK)
    const patientGetRes = await makeRequest({
      hostname: 'localhost', port: 5000,
      path: '/api/patient/treatment-plans', method: 'GET',
      headers: {
        'Authorization': `Bearer ${patientToken}`
      }
    })
    console.log('5. Patient GET /treatment-plans status:', patientGetRes.status, patientGetRes.status === 200 ? '✅ PASS (200 OK)' : '❌ FAIL')
  }

  // 7. Sales Executive Login (Non-patient, non-clinical role)
  const salesToken = await login('sales@zhealth.com', 'Password123!')
  console.log('Sales Executive login token:', salesToken ? '✅ Obtained' : '❌ Failed')

  if (salesToken) {
    const salesCreateRes = await makeRequest({
      hostname: 'localhost', port: 5000,
      path: '/api/patient/treatment-plans', method: 'POST',
      headers: {
        'Authorization': `Bearer ${salesToken}`,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ condition: 'Sales Plan' }))
    console.log('6. Sales Executive direct POST /treatment-plans status:', salesCreateRes.status, salesCreateRes.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL')
  }

  // 8. Practitioner Login
  const docToken = await login('sarah.jenkins@clinic.com', 'Password123!')
  console.log('Practitioner login token:', docToken ? '✅ Obtained' : '❌ Failed')

  if (docToken) {
    // 9. Practitioner creates treatment plan
    const docCreateRes = await makeRequest({
      hostname: 'localhost', port: 5000,
      path: '/api/patient/treatment-plans', method: 'POST',
      headers: {
        'Authorization': `Bearer ${docToken}`,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      condition: 'Post-Op Knee Rehabilitation',
      patientId: '8ccec08e-04e6-42ad-a165-1770dc089acf',
      goals: [{ id: 'g_demo', title: 'Target 90deg Knee Flexion', percent: 30, status: 'Active' }]
    }))
    console.log('7. Authorized Practitioner POST /treatment-plans status:', docCreateRes.status, (docCreateRes.status === 201 || docCreateRes.status === 200) ? '✅ PASS' : '❌ FAIL')
    const createdPlanId = docCreateRes.data?.data?.id

    // 10. Practitioner updates treatment plan
    const docUpdateRes = await makeRequest({
      hostname: 'localhost', port: 5000,
      path: `/api/patient/treatment-plans/${createdPlanId || '007af1d5-8f98-4dd4-b8cc-3fd7bc62da6e'}`, method: 'PUT',
      headers: {
        'Authorization': `Bearer ${docToken}`,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      stage: 'Phase 2: Progressive Loading'
    }))
    console.log('8. Authorized Practitioner PUT /treatment-plans/:id status:', docUpdateRes.status, docUpdateRes.status === 200 ? '✅ PASS (200 OK)' : '❌ FAIL')

    // 11. Practitioner modifying another patient's plan by spoofing patientId -> Rejected 403
    const tamperRes = await makeRequest({
      hostname: 'localhost', port: 5000,
      path: `/api/patient/treatment-plans/${createdPlanId || '007af1d5-8f98-4dd4-b8cc-3fd7bc62da6e'}`, method: 'PUT',
      headers: {
        'Authorization': `Bearer ${docToken}`,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      patientId: 'different_unauthorized_patient_id',
      goals: [{ id: 'g1', title: 'Tampered Goal', percent: 90 }]
    }))
    console.log('9. Tampered patientId PUT /treatment-plans/:id status:', tamperRes.status, tamperRes.status === 403 ? '✅ PASS (403 Forbidden)' : '❌ FAIL')

    // 12. Practitioner cleans up test created plan
    if (createdPlanId) {
      const deleteRes = await makeRequest({
        hostname: 'localhost', port: 5000,
        path: `/api/patient/treatment-plans/${createdPlanId}`, method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${docToken}`
        }
      })
      console.log('10. Authorized Practitioner DELETE /treatment-plans/:id status:', deleteRes.status, deleteRes.status === 200 ? '✅ PASS (200 OK)' : '❌ FAIL')
    }
  }
}

runTests().catch(console.error)
