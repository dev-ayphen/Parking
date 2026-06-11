const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function testDeleteVehicle() {
  try {
    // Create a test vehicle
    console.log('1. Creating test vehicle...');
    const testVehicle = await db.vehicle.create({
      data: {
        userId: 1,
        brandModel: 'Test Car',
        licensePlate: 'TEST-123',
        vehicleType: 'CAR',
        capacity: 5,
        ownershipType: 'OWNER',
      },
    });
    console.log('✅ Vehicle created:', testVehicle);

    // List vehicles
    console.log('\n2. Listing all vehicles...');
    const allVehicles = await db.vehicle.findMany();
    console.log('✅ Total vehicles:', allVehicles.length);
    allVehicles.forEach(v => console.log(`   - ${v.id}: ${v.brandModel} (${v.licensePlate})`));

    // Delete the test vehicle
    console.log(`\n3. Deleting vehicle ID ${testVehicle.id}...`);
    const deleted = await db.vehicle.delete({
      where: { id: testVehicle.id },
    });
    console.log('✅ Vehicle deleted:', deleted.brandModel);

    // List vehicles again
    console.log('\n4. Listing all vehicles after delete...');
    const finalVehicles = await db.vehicle.findMany();
    console.log('✅ Total vehicles:', finalVehicles.length);
    finalVehicles.forEach(v => console.log(`   - ${v.id}: ${v.brandModel} (${v.licensePlate})`));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.$disconnect();
  }
}

testDeleteVehicle();
