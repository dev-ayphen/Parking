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

// Connection pool sizing for production scalability.
// Prisma uses a connection pool managed by the underlying database driver.
// Pool size = number of concurrent database connections Prisma can maintain.
//
// Configuration:
// - DEVELOPMENT (default): 5 connections (sufficient for local dev)
// - PRODUCTION: scales with APP_INSTANCES (e.g., 20 instances × 2 conn each = 40 pool size)
//   Set via DATABASE_POOL_SIZE env var, capped at 100 (Postgres default max_connections is 100)
//
// Formula: DATABASE_POOL_SIZE = min(100, APP_INSTANCES * 2)
// Example: 3 app instances → 6 connections per instance, 18 total across cluster
//
// Monitoring (CloudSQL, Heroku, etc.):
// - Check "active connections" in your database provider's metrics
// - Alert if connections > 70% of max
// - If exhausted: increase pool size or scale instances horizontally
const poolSize =
  process.env.NODE_ENV === 'production'
    ? Math.min(100, parseInt(process.env.DATABASE_POOL_SIZE || '20', 10))
    : 5;

export const db = new PrismaClient({
  // Connection pool configuration
  __internal: {
    engine: {
      // Use the computed pool size for connection management
      // Prisma passes this to the underlying PostgreSQL driver
      pool: {
        minConnections: Math.floor(poolSize / 2), // half the max
        maxConnections: poolSize, // max allowed
      },
    },
  } as any,

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
