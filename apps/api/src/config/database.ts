/**
 * Prisma Database Client
 * CRITICAL: Prisma MUST be properly generated. No mocks or fallbacks allowed.
 * If this fails, the application will not start. This is intentional.
 */

import { PrismaClient } from '@prisma/client';

// Validate Prisma client is properly generated
if (!PrismaClient) {
  console.error('❌ FATAL: Prisma client not found!');
  console.error('Run: npx prisma generate');
  process.exit(1);
}

export const db = new PrismaClient({
  // Log Prisma queries in development
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await db.$disconnect();
  process.exit(0);
});
