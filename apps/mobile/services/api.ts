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
import { apiCall, ApiError } from './api.service';
import { API_BASE } from '../config/api.config';

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
};

export { ApiError };
