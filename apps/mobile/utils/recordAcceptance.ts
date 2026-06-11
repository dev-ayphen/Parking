import { Platform } from 'react-native';
import { getAuthToken } from './secureStorage';
import { API_ENDPOINTS } from '../config/api.config';

const APP_VERSION = '1.0.0';

/**
 * Records a legal document acceptance to the backend.
 * Fire-and-forget — never blocks the user flow on failure.
 */
export async function recordAcceptance(params: {
  type: string;
  slug?: string;
  version?: string;
}): Promise<void> {
  try {
    const token = await getAuthToken();
    if (!token) return;

    await fetch(API_ENDPOINTS.LEGAL.ACCEPT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: params.type,
        slug: params.slug,
        version: params.version,
        platform: Platform.OS,
        appVersion: APP_VERSION,
      }),
    });
  } catch {
    // Silently fail — legal logging should never break user flow
  }
}
