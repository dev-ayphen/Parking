/**
 * API Configuration
 * Centralized API endpoints and base URL management
 */
import Constants from 'expo-constants';

const API_PORT = 3000;

/**
 * In development, the phone reaches Metro at the Mac's LAN IP. We reuse that
 * exact IP for the API so it ALWAYS matches — even when WiFi/DHCP changes the
 * Mac's IP. No more editing .env every time the IP changes.
 */
function detectDevHost(): string | null {
  // e.g. "192.168.1.3:8081" — the host the phone used to load the JS bundle
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any)?.expoGoConfig?.debuggerHost ||
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any)?.manifest?.debuggerHost ||
    '';
  const host = String(hostUri).split(':')[0]?.trim();
  // Ignore tunnel/localhost hosts — only use a real LAN IP
  if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.includes('exp.direct')) {
    return host;
  }
  return null;
}

/**
 * Single source of truth for the API base URL.
 * Screens should import this — never redeclare process.env.EXPO_PUBLIC_API_BASE_URL.
 *
 * Priority:
 *  1. In dev → auto-detected Metro host IP (self-healing across IP changes)
 *  2. EXPO_PUBLIC_API_BASE_URL  (production / deployed server)
 *  3. localhost fallback
 */
function resolveApiBase(): string {
  if (__DEV__) {
    const host = detectDevHost();
    if (host) return `http://${host}:${API_PORT}/api`;
  }
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    'http://localhost:3000/api'
  );
}

export const API_BASE = resolveApiBase();

const API_BASE_URL = API_BASE;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    REQUEST_OTP: `${API_BASE_URL}/auth/request-otp`,
    VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
  USERS: {
    GET_PROFILE: `${API_BASE_URL}/users/me`,
    UPDATE_PROFILE: `${API_BASE_URL}/users/me`,
    COMPLETE_PROFILE: `${API_BASE_URL}/users/me/complete-profile`,
  },
  HOME: {
    DASHBOARD: `${API_BASE_URL}/home/dashboard`,
  },
  SPACES: {
    SEARCH: `${API_BASE_URL}/spaces/search`,
    GET_DETAILS: `${API_BASE_URL}/spaces`,
    NEARBY: `${API_BASE_URL}/spaces/nearby`,
  },
  VEHICLES: {
    LIST: `${API_BASE_URL}/vehicles`,
    CREATE: `${API_BASE_URL}/vehicles`,
    UPDATE: `${API_BASE_URL}/vehicles`,
  },
  BOOKINGS: {
    MY: `${API_BASE_URL}/bookings/my`,
  },
  LEGAL: {
    ACCEPT: `${API_BASE_URL}/legal/accept`,
    GET_DOC: (slug: string) => `${API_BASE_URL}/legal/documents/${slug}`,
  },
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Log API configuration (development only)
if (__DEV__) {
  console.log('🔗 API Configuration:', {
    BASE_URL: API_BASE_URL,
    TIMEOUT: API_CONFIG.TIMEOUT,
  });
}

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  API_CONFIG,
};
