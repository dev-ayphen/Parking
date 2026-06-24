import Redis from 'ioredis';
import { env } from './env';

// Redis configuration.
// Managed cloud Redis (Upstash, Redis Cloud, etc.) requires a TLS connection and
// is always password-protected. Local dev Redis has no password and no TLS. We
// therefore enable TLS automatically whenever a password is configured, so the
// same code works locally (no password → plain) and in production (password → TLS)
// with zero env-specific branching. Override with REDIS_TLS=false if a managed
// host ever doesn't use TLS.
const useTls =
  env.REDIS_TLS != null
    ? env.REDIS_TLS === 'true'
    : !!env.REDIS_PASSWORD;

const redisConfig = {
  host: env.REDIS_HOST || 'localhost',
  port: parseInt(env.REDIS_PORT || '6379', 10),
  password: env.REDIS_PASSWORD || undefined,
  db: parseInt(env.REDIS_DB || '0', 10),
  ...(useTls ? { tls: {} } : {}),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Event listeners
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error.message);
});

redis.on('reconnecting', () => {
  console.log('⚠️  Reconnecting to Redis...');
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('[REDIS] Health check failed:', error);
    return false;
  }
}

export default redis;
