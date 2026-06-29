import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PLANS = [
  {
    name: 'Starter',
    description: 'For owners listing their first space.',
    price: 199,
    yearlyPrice: 1990,
    billingCycle: 'MONTHLY',
    features: ['Up to 2 Parking Spaces', 'Basic Listing', 'Booking History', 'Basic Notifications'],
    iconKey: 'shield',
    colorKey: 'blue',
    sortOrder: 1,
    maxSpaces: 2,
    hasAnalytics: false,
    hasFeaturedListing: false,
    hasCsvExport: false,
    hasPrioritySupport: false,
  },
  {
    name: 'Pro',
    description: 'For growing owners with multiple spaces.',
    price: 499,
    yearlyPrice: 4990,
    billingCycle: 'MONTHLY',
    features: ['Up to 10 Spaces', 'Analytics Dashboard', 'Revenue Reports', 'Priority Support'],
    iconKey: 'zap',
    colorKey: 'indigo',
    sortOrder: 2,
    maxSpaces: 10,
    hasAnalytics: true,
    hasFeaturedListing: false,
    hasCsvExport: true,
    hasPrioritySupport: true,
  },
  {
    name: 'Business',
    description: 'For professional operators at scale.',
    price: 999,
    yearlyPrice: 9990,
    billingCycle: 'MONTHLY',
    features: ['Unlimited Spaces', 'Advanced Analytics', 'Priority Support'],
    iconKey: 'crown',
    colorKey: 'amber',
    sortOrder: 3,
    maxSpaces: -1,
    hasAnalytics: true,
    hasFeaturedListing: true,
    hasCsvExport: true,
    hasPrioritySupport: true,
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
