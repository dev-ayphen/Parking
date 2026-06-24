import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfill: existing SpaceDocument rows were stored with the human LABEL
 * ("Maintenance Bill") or a generic fallback ("Address Proof") as documentType,
 * instead of the canonical enum ("MAINTENANCE_BILL"). The compliance check keys
 * off the enum, so those docs showed as "missing" in the admin panel even though
 * they were uploaded and verified.
 *
 * Self-contained (no import of document.service, which would pull in redis/supabase
 * connections and hang the script). The rules below MUST mirror SPACE_TYPE_RULES
 * in src/services/document.service.ts.
 */
const SPACE_TYPE_DOCS: Record<string, { type: string; label: string; required: boolean }[]> = {
  'Independent House': [
    { type: 'EB_BILL', label: 'EB Bill', required: true },
    { type: 'PROPERTY_TAX', label: 'Property Tax', required: false },
    { type: 'WATER_BILL', label: 'Water Bill', required: false },
  ],
  'Rented House': [
    { type: 'RENTAL_AGREEMENT', label: 'Rental Agreement', required: true },
    { type: 'OWNER_PERMISSION', label: 'Owner Permission', required: false },
    { type: 'EB_BILL', label: 'EB Bill', required: false },
  ],
  'Apartment Owner Slot': [
    { type: 'MAINTENANCE_BILL', label: 'Maintenance Bill', required: true },
    { type: 'PARKING_ALLOCATION_PHOTO', label: 'Parking Allocation Photo', required: false },
  ],
  'Apartment Tenant Slot': [
    { type: 'RENTAL_AGREEMENT', label: 'Rental Agreement', required: true },
    { type: 'PARKING_PERMISSION', label: 'Parking Permission', required: true },
  ],
  'Gated Villa': [
    { type: 'PROPERTY_TAX', label: 'Property Tax', required: true },
    { type: 'EB_BILL', label: 'EB Bill', required: false },
  ],
  'Shop Front Parking': [
    { type: 'SHOP_LICENSE', label: 'Shop License', required: true },
    { type: 'GST_CERTIFICATE', label: 'GST Certificate', required: false },
    { type: 'RENTAL_AGREEMENT', label: 'Rental Agreement', required: false },
  ],
  'Office Parking': [
    { type: 'COMPANY_ID', label: 'Company ID', required: true },
    { type: 'PARKING_PERMISSION', label: 'Parking Permission', required: true },
  ],
  'Vacant Private Land': [
    { type: 'LAND_TAX_RECEIPT', label: 'Land Tax Receipt', required: true },
    { type: 'PATTA_COPY', label: 'Patta Copy', required: false },
  ],
  'Inside Compound': [
    { type: 'ADDRESS_PROOF', label: 'Address Proof', required: true },
    { type: 'COMPOUND_PHOTO', label: 'Compound Photo', required: true },
  ],
  'Open Frontage Area': [
    { type: 'AREA_PHOTO', label: 'Area Photo (multiple)', required: true },
  ],
};

const normaliseDocumentType = (spaceType: string, incoming: string): string | null => {
  const docs = SPACE_TYPE_DOCS[spaceType];
  if (!docs) return null;
  const raw = (incoming ?? '').trim();
  if (!raw) return null;

  const types = docs.map((d) => d.type);
  if (types.includes(raw)) return raw; // already canonical

  const byLabel = docs.find((d) => d.label.toLowerCase() === raw.toLowerCase());
  if (byLabel) return byLabel.type;

  const snake = raw.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (types.includes(snake)) return snake;

  const firstRequired = docs.find((d) => d.required);
  return firstRequired?.type ?? null;
};

async function main() {
  const docs = await prisma.spaceDocument.findMany({
    select: { id: true, documentType: true, space: { select: { spaceType: true } } },
  });
  console.log(`Found ${docs.length} document(s) to check.`);

  let fixed = 0;
  const skipped: { id: number; type: string; reason: string }[] = [];

  for (const d of docs) {
    const spaceType = d.space?.spaceType;
    if (!spaceType) { skipped.push({ id: d.id, type: d.documentType, reason: 'no space' }); continue; }

    const canonical = normaliseDocumentType(spaceType, d.documentType);
    if (!canonical) { skipped.push({ id: d.id, type: d.documentType, reason: 'unmappable' }); continue; }
    if (canonical === d.documentType) continue; // already correct

    await prisma.spaceDocument.update({ where: { id: d.id }, data: { documentType: canonical } });
    console.log(`  doc #${d.id} (${spaceType}): "${d.documentType}" → "${canonical}"`);
    fixed++;
  }

  console.log(`\nNormalized ${fixed} document(s).`);
  if (skipped.length) {
    console.log(`\n⚠️  ${skipped.length} document(s) skipped:`);
    skipped.forEach((s) => console.log(`  doc #${s.id}: "${s.type}" (${s.reason})`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
