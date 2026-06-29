import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  // A weak/short secret makes admin JWTs forgeable. Require at least 32 chars;
  // the app refuses to boot otherwise (fail fast).
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),
  // 'true' | 'false' — force TLS on/off. If unset, TLS auto-enables when a
  // REDIS_PASSWORD is present (managed cloud Redis), off for local dev.
  REDIS_TLS: z.string().optional(),
  MSG91_API_KEY: z.string().min(1, 'MSG91_API_KEY is required — OTP login will not work without it'),
  MSG91_SENDER_ID: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required — file uploads will fail without it'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  // Admin credentials — required, no defaults, must be set explicitly
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email'),
  ADMIN_PASSWORD: z.string().min(16, 'ADMIN_PASSWORD must be at least 16 characters'),
  // CORS — no wildcard default; must be explicitly set in production
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN must be set (comma-separated allowed origins)'),
});

export const env = envSchema.parse(process.env);
