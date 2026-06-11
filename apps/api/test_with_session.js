const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const db = new PrismaClient();

async function testWithValidSession() {
  try {
    // 1. Create a session for user 1
    console.log('1. Creating session...');
    const token = jwt.sign(
      { sub: 1, phone: '7401255299', role: 'PARKER' },
      'dev_secret_key_min_32_chars_long_for_testing',
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await db.session.create({
      data: {
        userId: 1,
        token: token,
        refreshToken: 'dummy_refresh',
        expiresAt: expiresAt,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      },
    });
    console.log('✅ Session created:', session.id);

    // 2. Test adding vehicle via API
    console.log('\n2. Testing vehicle creation via API...\n');
    const response = await fetch('http://localhost:3000/api/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        brandModel: 'Maruti Swift',
        licensePlate: 'MH-01-1234',
        vehicleType: 'CAR',
        capacity: 5,
        ownershipType: 'OWNER',
      }),
    });

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    // 3. Check database
    console.log('\n3. Checking database...');
    const vehicles = await db.vehicle.findMany();
    console.log('✅ Total vehicles in DB:', vehicles.length);
    vehicles.forEach(v => {
      console.log(`   - ${v.id}: ${v.brandModel} (${v.licensePlate})`);
    });

    // 4. Test delete via API
    if (vehicles.length > 0) {
      console.log(`\n4. Testing DELETE on vehicle ${vehicles[0].id}...`);
      const deleteResponse = await fetch(`http://localhost:3000/api/vehicles/${vehicles[0].id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const deleteData = await deleteResponse.json();
      console.log('Delete Response:', JSON.stringify(deleteData, null, 2));

      // Check after delete
      const vehiclesAfter = await db.vehicle.findMany();
      console.log('✅ Vehicles after delete:', vehiclesAfter.length);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.$disconnect();
  }
}

testWithValidSession();
