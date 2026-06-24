/**
 * Centralized runtime configuration for API/socket endpoints.
 *
 * Computed ONCE from env at module load. In production, a missing
 * NEXT_PUBLIC_API_BASE_URL is a deployment landmine (the app would silently
 * point at localhost), so we fail loud. In dev we allow the localhost fallback.
 */

const envApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

if (process.env.NODE_ENV === 'production' && !envApiBase) {
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL is not set. Refusing to start in production ' +
      'with the localhost fallback.'
  );
}

/** Base URL for REST API calls, e.g. https://api.example.com/api */
export const API_BASE = envApiBase || 'http://localhost:3000/api';

/** Socket.IO server origin — the API base with the trailing /api stripped. */
export const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');
