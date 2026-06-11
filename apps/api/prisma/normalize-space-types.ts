import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Canonical space types accepted by the current app.
const VALID = [
  'Independent House',
  'Rented House',
  'Apartment Owner Slot',
  'Apartment Tenant Slot',
  'Gated Villa',
  'Shop Front Parking',
  'Office Parking',
  'Vacant Private Land',
  'Inside Compound',
  'Open Frontage Area',
];

// Legacy / short stored values → current canonical value.
const LEGACY_MAP: Record<string, string> = {
  Apartment: 'Apartment Owner Slot',
  House: 'Independent House',
  Villa: 'Gated Villa',
  Shop: 'Shop Front Parking',
  Office: 'Office Parking',
  Land: 'Vacant Private Land',
  Compound: 'Inside Compound',
  Roadside: 'Open Frontage Area',
  'Open Frontage': 'Open Frontage Area',
};

async function main() {
  const spaces = await prisma.space.findMany({ select: { id: true, spaceType: true } });
  let fixed = 0;
  const unmapped: { id: number; spaceType: string }[] = [];

  for (const sp of spaces) {
    if (VALID.includes(sp.spaceType)) continue;
    const next = LEGACY_MAP[sp.spaceType];
    if (next) {
      await prisma.space.update({ where: { id: sp.id }, data: { spaceType: next } });
      console.log(`  space #${sp.id}: "${sp.spaceType}" → "${next}"`);
      fixed++;
    } else {
      unmapped.push({ id: sp.id, spaceType: sp.spaceType });
    }
  }

  console.log(`\nNormalized ${fixed} space(s).`);
  if (unmapped.length) {
    console.log(`\n⚠️  ${unmapped.length} space(s) have an unrecognised type (left untouched):`);
    unmapped.forEach((u) => console.log(`  space #${u.id}: "${u.spaceType}"`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
