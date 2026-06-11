import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PLANS = [
  {
    name: 'Basic',
    description: 'Complete management for space owners.',
    price: 500,
    yearlyPrice: 5000,
    billingCycle: 'MONTHLY',
    features: ['1 parking space', 'Basic analytics', 'Email support', 'Up to 50 bookings/mo'],
    iconKey: 'shield',
    colorKey: 'blue',
    sortOrder: 1,
  },
  {
    name: 'Pro',
    description: 'Complete management for space owners.',
    price: 1499,
    yearlyPrice: 14990,
    billingCycle: 'MONTHLY',
    features: ['Up to 5 spaces', 'Advanced analytics', 'Priority support', 'Unlimited bookings', 'Custom pricing'],
    iconKey: 'zap',
    colorKey: 'indigo',
    sortOrder: 2,
  },
  {
    name: 'Premium',
    description: 'Complete management for space owners.',
    price: 2999,
    yearlyPrice: 29990,
    billingCycle: 'MONTHLY',
    features: ['Unlimited spaces', 'Full analytics suite', 'Dedicated manager', 'API access', 'White-label options'],
    iconKey: 'crown',
    colorKey: 'amber',
    sortOrder: 3,
  },
];

async function main() {
  console.log('🌱 Seeding subscription plans...');
  for (const plan of DEFAULT_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: {}, // Don't overwrite admin-edited values
      create: plan,
    });
    console.log(`  ✓ ${plan.name} — ₹${plan.price}/mo`);
  }
  console.log('✅ Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
