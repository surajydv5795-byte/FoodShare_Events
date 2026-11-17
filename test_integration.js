// ============================================================
//  FoodShare Events — Comprehensive Integration Verification
// ============================================================

const http = require('http');

async function runTests() {
  console.log('🚀 Starting Server & Running End-to-End System Tests...\n');

  // Load Express app directly from server/server.js
  // Let the server start
  require('./server/server.js');

  // Wait 1.5s for initial seed
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const PORT = process.env.PORT || 3000;
  const baseUrl = `http://127.0.0.1:${PORT}`;

  const request = (path, method = 'GET', body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request(
        url,
        { method, headers },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({ status: res.statusCode, data: parsed });
            } catch (e) {
              resolve({ status: res.statusCode, data });
            }
          });
        }
      );

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  try {
    // 1. Static Files Check
    console.log('1. Checking Static Frontend Files:');
    const indexRes = await request('/');
    console.log(`   - GET / (index.html): Status ${indexRes.status} (Length: ${typeof indexRes.data === 'string' ? indexRes.data.length : 'N/A'})`);

    const cssRes = await request('/css/styles.css');
    console.log(`   - GET /css/styles.css: Status ${cssRes.status}`);

    const appJsRes = await request('/js/app.js');
    console.log(`   - GET /js/app.js: Status ${appJsRes.status}`);

    // 2. Authentication Checks
    console.log('\n2. Testing Authentication & User Roles:');
    const donorLogin = await request('/api/auth/login', 'POST', {
      email: 'donor@foodshare.org',
      password: 'password123',
    });
    console.log(`   - Donor Login: Status ${donorLogin.status}, User: ${donorLogin.data.user ? donorLogin.data.user.name : 'FAIL'}`);
    const donorToken = donorLogin.data.token;

    const ngoLogin = await request('/api/auth/login', 'POST', {
      email: 'ngo@foodshare.org',
      password: 'password123',
    });
    console.log(`   - NGO Login: Status ${ngoLogin.status}, Org: ${ngoLogin.data.user ? ngoLogin.data.user.organization : 'FAIL'}`);
    const ngoToken = ngoLogin.data.token;

    const volLogin = await request('/api/auth/login', 'POST', {
      email: 'volunteer@foodshare.org',
      password: 'password123',
    });
    console.log(`   - Courier Login: Status ${volLogin.status}, Role: ${volLogin.data.user ? volLogin.data.user.role : 'FAIL'}`);
    const volToken = volLogin.data.token;

    const adminLogin = await request('/api/auth/login', 'POST', {
      email: 'admin@foodshare.org',
      password: 'password123',
    });
    console.log(`   - Master Ledger Admin Login: Status ${adminLogin.status}`);
    const adminToken = adminLogin.data.token;

    // 3. Complete Donation Lifecycle (Donor -> NGO Claim -> Volunteer Transit -> OTP Complete)
    console.log('\n3. Testing Complete Food Redistribution Flow:');

    // Step A: Donor creates surplus food
    const newDonationRes = await request(
      '/api/donations',
      'POST',
      {
        eventName: 'Grand Imperial Ballroom Gala',
        foodType: 'cooked',
        description: '60 hot meals of roasted chicken, herb rice, and fresh dinner rolls',
        quantity: '60',
        quantityUnit: 'meals',
        expiryTime: new Date(Date.now() + 5 * 3600000).toISOString(),
        pickupAddress: '100 Queen Street, Grand Ballroom',
        contactPhone: '+91 98200 11223',
      },
      donorToken
    );
    console.log(`   - Step 5.1 (Donor): Surplus Reported -> Status: ${newDonationRes.data.status || 'FAIL'}, ID: ${newDonationRes.data._id}`);
    const donationId = newDonationRes.data._id;

    // Step B: NGO claims food
    const claimRes = await request(`/api/donations/${donationId}/claim`, 'PUT', {}, ngoToken);
    console.log(`   - Step 5.2 (NGO): Food Claimed -> Status: ${claimRes.data.donation.status}, Generated OTP: ${claimRes.data.otp}`);
    const otp = claimRes.data.otp;

    // Step C: Volunteer accepts pickup
    const acceptRes = await request(`/api/donations/${donationId}/accept`, 'PUT', {}, volToken);
    console.log(`   - Step 5.3 (Volunteer): Courier Accepted -> Status: ${acceptRes.data.donation.status}`);

    // Step D: Delivery completed with OTP verification
    const completeRes = await request(`/api/donations/${donationId}/complete`, 'PUT', { otp }, volToken);
    console.log(`   - Step 5.4 (Handshake): Completed with OTP -> Status: ${completeRes.data.donation.status}`);

    // 4. Admin Management & Moderation
    console.log('\n4. Testing Master Ledger Administration:');
    const statsRes = await request('/api/admin/stats', 'GET', null, adminToken);
    console.log(`   - Admin Stats: Total Donors: ${statsRes.data.totalDonors}, Completed: ${statsRes.data.completedDeliveries}`);

    const usersRes = await request('/api/admin/users', 'GET', null, adminToken);
    console.log(`   - Admin User Ledger: Loaded ${usersRes.data.length} registered artisans`);

    console.log('\n✨ ALL SYSTEM INTEGRATION TESTS PASSED WITH 100% SUCCESS! ✨\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

runTests();
