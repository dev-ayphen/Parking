const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function test() {
  try {
    console.log('✅ Latest session for user 1:\n');
    
    const session = await db.session.findFirst({
      where: { userId: 1 },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      console.log('No session found');
      return;
    }

    console.log(`Token: ${session.token.substring(0, 50)}...`);
    console.log(`Valid: ${session.expiresAt > new Date()}\n`);

    // Test API
    const response = await fetch('http://localhost:3000/api/vehicles', {
      headers: {
        'Authorization': `Bearer ${session.token}`,
      },
    });

    const data = await response.json();
    console.log('📱 API Response:\n', JSON.stringify(data, null, 2));

    // Database check
    const vehicles = await db.vehicle.findMany({ where: { userId: 1 } });
    console.log('\n💾 Database vehicles for user 1:', vehicles.length);
    vehicles.forEach(v => console.log(`   - ${v.brandModel} (${v.licensePlate})`));

  } finally {
    await db.$disconnect();
  }
}

test();
