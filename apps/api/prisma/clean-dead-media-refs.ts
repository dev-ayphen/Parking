import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * One-off cleanup: older upload code wrote bare filenames (e.g. "front.jpg") into
 * the DB without ever pushing the bytes to Supabase. Those keys point to nothing,
 * so they render as broken/blank image boxes. A VALID storage key always contains
 * a folder slash (e.g. "spaces/7/123-abc.jpg"). Anything without a slash (and not a
 * full http URL) is a dead reference → null it out so the UI shows the empty state
 * instead of a broken image.
 */
const isDead = (v: string | null) =>
  !!v && !v.includes('/') && !/^https?:/.test(v);

async function main() {
  // Spaces
  const spaces = await prisma.space.findMany({
    select: { id: true, frontPhotoUrl: true, areaPhotoUrl: true, videoUrl: true },
  });
  let spacesFixed = 0;
  for (const s of spaces) {
    const data: Record<string, null> = {};
    if (isDead(s.frontPhotoUrl)) data.frontPhotoUrl = null;
    if (isDead(s.areaPhotoUrl)) data.areaPhotoUrl = null;
    if (isDead(s.videoUrl)) data.videoUrl = null;
    if (Object.keys(data).length) {
      await prisma.space.update({ where: { id: s.id }, data });
      console.log(`  space #${s.id}: cleared ${Object.keys(data).join(', ')}`);
      spacesFixed++;
    }
  }

  // Vehicles
  const vehicles = await prisma.vehicle.findMany({
    select: { id: true, frontPhotoUrl: true, sidePhotoUrl: true, rcBookUrl: true },
  });
  let vehiclesFixed = 0;
  for (const v of vehicles) {
    const data: Record<string, null> = {};
    if (isDead(v.frontPhotoUrl)) data.frontPhotoUrl = null;
    if (isDead(v.sidePhotoUrl)) data.sidePhotoUrl = null;
    if (isDead(v.rcBookUrl)) data.rcBookUrl = null;
    if (Object.keys(data).length) {
      await prisma.vehicle.update({ where: { id: v.id }, data });
      console.log(`  vehicle #${v.id}: cleared ${Object.keys(data).join(', ')}`);
      vehiclesFixed++;
    }
  }

  console.log(`\nDone. Cleaned ${spacesFixed} space(s), ${vehiclesFixed} vehicle(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
