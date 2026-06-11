const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const db = new PrismaClient();

async function testAddVehicleViaAPI() {
  try {
    // Create a test token for user 1
    const token = jwt.sign(
      { sub: 1, phone: '7401255299', role: 'PARKER' },
      'dev_secret_key_min_32_chars_long_for_testing',
      { expiresIn: '7d' }
    );
    
    console.log('Token:', token);
    console.log('\n1. Testing API vehicle creation...\n');

    // Make API request
    const response = await fetch('http://localhost:3000/api/vehicles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        brandModel: 'Test Vehicle from API',
        licensePlate: 'API-TEST-001',
        vehicleType: 'CAR',
        capacity: 5,
        ownershipType: 'OWNER',
      }),
    });

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    // Check database
    console.log('\n2. Checking database...');
    const vehicles = await db.vehicle.findMany();
    console.log('Total vehicles in DB:', vehicles.length);
    vehicles.forEach(v => {
      console.log(`  - ${v.id}: ${v.brandModel} (${v.licensePlate}) for user ${v.userId}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.$disconnect();
  }
}

testAddVehicleViaAPI();
