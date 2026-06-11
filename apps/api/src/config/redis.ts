import Redis from 'ioredis';
import { env } from './env';

// Redis configuration
const redisConfig = {
  host: env.REDIS_HOST || 'localhost',
  port: parseInt(env.REDIS_PORT || '6379', 10),
  password: env.REDIS_PASSWORD || undefined,
  db: parseInt(env.REDIS_DB || '0', 10),
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
