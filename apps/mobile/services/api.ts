/**
 * Thin API client — drop-in replacement for raw `fetch()` calls in screens.
 *
 * Built on top of the centralized `apiCall` (services/api.service.ts) which
 * already handles auth headers, token refresh, timeout, and error mapping.
 *
 * Usage:
 *   import { api } from '../../services/api';
 *   const profile = await api.get<UserResponse>('/users/me');
 *   const booking = await api.post<BookingResponse>('/bookings', { spaceId: 1, ... });
 */
import * as FileSystem from 'expo-file-system/legacy';
import { apiCall, ApiError } from './api.service';
import { API_BASE } from '../config/api.config';
import { getAuthToken } from '../utils/secureStorage';

type JsonBody = Record<string, any> | unknown[];

const buildUrl = (path: string): string => {
  // Already absolute?
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Strip leading slash, prepend API_BASE
  return `${API_BASE}/${path.replace(/^\/+/, '')}`;
};

const json = (body: JsonBody | undefined): string | undefined =>
  body === undefined ? undefined : JSON.stringify(body);

export const api = {
  get: <T = any>(path: string, init?: Omit<RequestInit, 'method'>) =>
    apiCall<T>(buildUrl(path), { ...init, method: 'GET' }),

  post: <T = any>(path: string, body?: JsonBody, init?: Omit<RequestInit, 'method' | 'body'>) =>
    apiCall<T>(buildUrl(path), {
      ...init,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      body: json(body),
    }),

  put: <T = any>(path: string, body?: JsonBody, init?: Omit<RequestInit, 'method' | 'body'>) =>
    apiCall<T>(buildUrl(path), {
      ...init,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      body: json(body),
    }),

  patch: <T = any>(path: string, body?: JsonBody, init?: Omit<RequestInit, 'method' | 'body'>) =>
    apiCall<T>(buildUrl(path), {
      ...init,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      body: json(body),
    }),

  delete: <T = any>(path: string, init?: Omit<RequestInit, 'method'>) =>
    apiCall<T>(buildUrl(path), { ...init, method: 'DELETE' }),

  /**
   * Upload one or more files as multipart/form-data.
   * Auth header is added automatically; Content-Type is left to fetch.
   *
   * @param files   files to attach, e.g. [{ field:'file', uri, name, type }]
   * @param fields  optional extra text fields appended to the form
   */
  upload: async <T = any>(
    path: string,
    files: Array<{ field: string; uri: string; name: string; type: string }>,
    fields?: Record<string, string>,
    method: 'POST' | 'PUT' = 'POST'
  ): Promise<T> => {
    // React Native 0.85's FormData throws "Unsupported FormDataPart implementation"
    // for file parts, so we use expo-file-system's native multipart uploader instead.
    // uploadAsync handles ONE file field per request, so when several files are sent
    // together we upload them in sequence and return the last response.
    const url = buildUrl(path);
    const token = await getAuthToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const doUpload = async (file: { field: string; uri: string; name: string; type: string }) => {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await FileSystem.uploadAsync(url, file.uri, {
            httpMethod: method,
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: file.field,
            mimeType: file.type,
            parameters: fields,
            headers,
          });
          // uploadAsync resolves on ANY HTTP status — treat non-2xx as an error.
          if (res.status < 200 || res.status >= 300) {
            let serverMsg = `HTTP ${res.status}`;
            try {
              const parsed = JSON.parse(res.body);
              serverMsg = parsed?.error || serverMsg;
            } catch {
              if (res.body) serverMsg = res.body.slice(0, 200);
            }
            throw new ApiError(serverMsg, res.status, false, false);
          }
          try {
            return JSON.parse(res.body) as T;
          } catch {
            return res.body as unknown as T;
          }
        } catch (e) {
          lastErr = e;
          const status = (e as any)?.status;
          // Retry only transient failures (network/timeout/5xx), not real 4xx rejections.
          const isRetryable = status === 0 || status === 408 || status === undefined || status >= 500;
          if (!isRetryable || attempt === 3) break;
          await new Promise((r) => setTimeout(r, attempt * 800));
        }
      }
      throw lastErr;
    };

    if (files.length === 1) {
      return doUpload(files[0]);
    }

    // Multiple files: upload sequentially. If responses carry a `urls` array
    // (e.g. /uploads/evidence), merge them so the caller sees every uploaded URL.
    let last: any;
    const mergedUrls: string[] = [];
    for (const file of files) {
      const res: any = await doUpload(file);
      last = res;
      if (Array.isArray(res?.urls)) mergedUrls.push(...res.urls);
    }
    if (mergedUrls.length > 0 && last && typeof last === 'object') {
      last = { ...last, urls: mergedUrls };
    }
    return last as T;
  },
};

export { ApiError };
