import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Supabase client using the service-role (secret) key.
 * SERVER-SIDE ONLY — this key bypasses row-level security and grants
 * full storage/admin access. Never expose it to the mobile or web clients.
 */
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  // Surface a clear error at boot rather than a confusing failure on first upload.
  console.warn(
    '[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set — file uploads will fail.'
  );
}

export const supabase = createClient(
  env.SUPABASE_URL ?? '',
  env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

/** Storage bucket names — keep in one place so they're never mistyped. */
export const BUCKETS = {
  /** Public, permanent URLs: profile photos, space photos/videos. */
  PUBLIC: 'public-media',
  /** Private, signed URLs only: KYC documents, RC book, evidence. */
  PRIVATE: 'private-docs',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];
