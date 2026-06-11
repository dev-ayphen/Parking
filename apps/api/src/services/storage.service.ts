import crypto from 'crypto';
import path from 'path';
import { supabase, BUCKETS, BucketName } from '../config/supabase';

/**
 * Central file-storage service. Every upload flow (profile, space photos/videos,
 * documents, vehicle, evidence) routes through here so bucket logic lives in one place.
 *
 * Two buckets:
 *  - public-media  → permanent public URLs (display media)
 *  - private-docs  → private; access via short-lived signed URLs
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

interface UploadInput {
  /** Raw file bytes (e.g. multer memoryStorage `file.buffer`). */
  buffer: Buffer;
  /** Original filename — used only to derive the extension. */
  originalName: string;
  /** MIME type, e.g. "image/jpeg". */
  mimeType: string;
  /** Logical folder inside the bucket, e.g. "profiles", "spaces/123", "space-docs". */
  folder: string;
}

export interface StoredFile {
  /** Bucket the object lives in. */
  bucket: BucketName;
  /** Object path within the bucket (store THIS in the DB). */
  key: string;
  /**
   * For public files: the permanent public URL.
   * For private files: null (generate a signed URL on read via getSignedUrl).
   */
  url: string | null;
}

const randomName = (originalName: string) => {
  const ext = path.extname(originalName || '').toLowerCase();
  const id = crypto.randomBytes(16).toString('hex');
  return `${Date.now()}-${id}${ext}`;
};

export const storageService = {
  /** Upload to the PUBLIC bucket and return a permanent public URL. */
  uploadPublic: async (input: UploadInput): Promise<StoredFile> =>
    upload(BUCKETS.PUBLIC, input),

  /** Upload to the PRIVATE bucket. URL is null — call getSignedUrl to read. */
  uploadPrivate: async (input: UploadInput): Promise<StoredFile> =>
    upload(BUCKETS.PRIVATE, input),

  /**
   * Generate a short-lived signed URL for a private object.
   * Pass the `key` returned at upload time (and stored in the DB).
   */
  getSignedUrl: async (
    key: string,
    bucket: BucketName = BUCKETS.PRIVATE,
    expiresIn: number = SIGNED_URL_TTL_SECONDS
  ): Promise<string> => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, expiresIn);
    if (error || !data) {
      throw new Error(`Failed to sign URL: ${error?.message ?? 'unknown error'}`);
    }
    return data.signedUrl;
  },

  /** Delete an object. No-op-safe: missing files don't throw. */
  remove: async (key: string, bucket: BucketName): Promise<void> => {
    const { error } = await supabase.storage.from(bucket).remove([key]);
    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  },

  /**
   * Resolve a stored value to a viewable URL.
   * - public bucket → returns the permanent public URL
   * - private bucket → returns a fresh signed URL
   * Accepts a bare key or a full URL (full URLs are returned as-is for back-compat).
   */
  resolveUrl: async (key: string, bucket: BucketName): Promise<string> => {
    if (!key) return '';
    if (/^https?:\/\//.test(key)) return key; // already a full URL (legacy data)
    if (bucket === BUCKETS.PUBLIC) {
      return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
    }
    return storageService.getSignedUrl(key, bucket);
  },

  BUCKETS,
};

async function upload(bucket: BucketName, input: UploadInput): Promise<StoredFile> {
  const key = `${input.folder.replace(/\/+$/, '')}/${randomName(input.originalName)}`;

  const { error } = await supabase.storage.from(bucket).upload(key, input.buffer, {
    contentType: input.mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const url =
    bucket === BUCKETS.PUBLIC
      ? supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl
      : null;

  return { bucket, key, url };
}
