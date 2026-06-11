/**
 * Media upload limits (single source of truth).
 *
 * NOTE: These are NOT enforced yet — the space "video"/"photo" inputs are
 * currently boolean placeholders. Wire these limits into the real flow when
 * Supabase / actual upload is implemented:
 *   - ImagePicker: `videoMaxDuration: VIDEO_LIMITS.maxSeconds`, `mediaTypes: Videos`
 *   - Client pre-check: reject if size > VIDEO_LIMITS.maxBytes or ext not in formats
 *   - Backend (multer/upload): allow VIDEO_LIMITS.mimeTypes, set fileSize: VIDEO_LIMITS.maxBytes
 *
 * The UI hint can use VIDEO_LIMITS.hintLabel.
 */
export const VIDEO_LIMITS = {
  maxSeconds: 30,
  maxMB: 25,
  maxBytes: 25 * 1024 * 1024,
  formats: ['mp4', 'mov'] as const,           // allowed file extensions
  mimeTypes: ['video/mp4', 'video/quicktime'] as const, // matching MIME types
  hintLabel: 'Optional • MP4/MOV • Max 30 sec • Max 25 MB',
};

export type VideoLimits = typeof VIDEO_LIMITS;
