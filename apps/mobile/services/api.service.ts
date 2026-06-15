/**
 * Centralized API Service Layer
 * Handles all HTTP requests with timeout, error handling, and retries
 */

import { DeviceEventEmitter } from 'react-native';
import { API_CONFIG } from '../config/api.config';
import {
  getAuthToken,
  getRefreshToken,
  saveAuthToken,
  isTokenExpiringSoon,
  clearAuthData,
} from '../utils/secureStorage';

/**
 * Fired when the session can no longer be recovered (refresh failed, or a request
 * came back 401). A global listener (useRealtime) clears auth and bounces the
 * user to login with a clear message — instead of silently failing mid-task.
 * Guarded so a burst of failing requests only triggers ONE logout.
 */
let authLostFired = false;
function emitAuthLost() {
  if (authLostFired) return;
  authLostFired = true;
  DeviceEventEmitter.emit('auth:lost');
}
export function resetAuthLostGuard() {
  authLostFired = false;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public isTimeout: boolean = false,
    public isNetworkError: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Refresh access token using refresh token
 * Called automatically when token is about to expire
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      console.log('[TOKEN_REFRESH] No refresh token available');
      return null;
    }

    console.log('[TOKEN_REFRESH] Attempting to refresh access token...');

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.error('[TOKEN_REFRESH] Failed to refresh token:', response.status);
      if (response.status === 401) {
        // Refresh token is invalid or expired
        await clearAuthData();
      }
      return null;
    }

    const data = await response.json();
    if (data.token && data.expiresIn) {
      // Save new access token
      await saveAuthToken(data.token, data.expiresIn);
      console.log('[TOKEN_REFRESH] ✅ Access token refreshed successfully');
      return data.token;
    }

    return null;
  } catch (error) {
    console.error('[TOKEN_REFRESH] Error refreshing token:', error);
    return null;
  }
}

/**
 * Generic API call with automatic timeout, abort, and error handling
 * @param url - API endpoint URL
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Parsed JSON response
 * @throws ApiError with detailed error information
 */
export async function apiCall<T = any>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const controller = new AbortController();
  // File uploads (FormData) are large/slow — give them a generous timeout.
  const isUpload =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  const timeoutMs = options.timeoutMs ?? (isUpload ? 120000 : API_CONFIG.TIMEOUT);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Get token from secure storage if not already provided in headers.
    // For FormData bodies, do NOT set Content-Type — fetch must add the
    // multipart boundary itself, or the server can't parse the upload.
    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;

    let headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    if (isFormData) {
      // Strip any caller-supplied JSON content-type so the boundary is generated.
      delete headers['Content-Type'];
      delete (headers as any)['content-type'];
    }

    // Add token to Authorization header if available and not already set
    if (!headers.Authorization && !headers.authorization) {
      // Check if token is expiring soon and refresh if needed
      const shouldRefresh = await isTokenExpiringSoon();
      let token = await getAuthToken();

      if (shouldRefresh && token) {
        console.log('[API] Token expiring soon, attempting refresh...');
        const newToken = await refreshAccessToken();
        if (newToken) {
          token = newToken;
        } else {
          // Refresh failed — session is unrecoverable. Clear auth and bounce to
          // login instead of firing a tokenless request that fails confusingly.
          await clearAuthData();
          emitAuthLost();
          throw new ApiError('Your session has expired. Please log in again.', 401, false, false);
        }
      }

      if (token) {
        headers = {
          ...headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeoutId);

    // Parse response defensively — some error paths (413 too-large, proxy errors,
    // multer rejections) return non-JSON or empty bodies, which would otherwise
    // throw a confusing "Failed to connect" instead of the real HTTP status.
    const raw = await response.text();
    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { error: raw.slice(0, 300) };
      }
    }

    // Check response status
    if (!response.ok) {
      // A 401 on a normal request means the token is invalid/expired and refresh
      // didn't save us → session lost. Bounce to login rather than surfacing a
      // raw "Unauthorized" on whatever screen the user was on.
      if (response.status === 401) {
        await clearAuthData();
        emitAuthLost();
        throw new ApiError('Your session has expired. Please log in again.', 401, false, false);
      }
      throw new ApiError(
        data?.error || `HTTP ${response.status}`,
        response.status,
        false,
        false
      );
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        `Connection timeout (${Math.round(timeoutMs / 1000)}s). The upload may be too large or the connection is slow.`,
        408,
        true,
        false
      );
    }

    // Handle API errors
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors — include the underlying message so we can tell
    // a real connectivity drop from an iOS multipart/ATS failure.
    if (error instanceof Error) {
      const detail = error.message ? ` (${error.message})` : '';
      throw new ApiError(
        `Failed to connect to server.${detail}`,
        0,
        false,
        true
      );
    }

    // Unknown error
    throw new ApiError('An unexpected error occurred', 0, false, false);
  }
}

/**
 * API call with automatic retry on failure
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Parsed JSON response
 */
export async function apiCallWithRetry<T = any>(
  url: string,
  options: RequestInit = {},
  maxRetries: number = API_CONFIG.RETRY_ATTEMPTS || 3
): Promise<T> {
  let lastError: ApiError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall<T>(url, options);
    } catch (error) {
      lastError = error as ApiError;

      // Don't retry on client errors (4xx) or timeout
      if (lastError.status >= 400 && lastError.status < 500) {
        throw error;
      }

      // Don't retry on timeout
      if (lastError.isTimeout) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
