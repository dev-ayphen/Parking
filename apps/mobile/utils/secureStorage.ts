import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'parkswift_auth_token';
const REFRESH_TOKEN_KEY = 'parkswift_refresh_token';
const TOKEN_EXPIRY_KEY = 'parkswift_token_expiry';
const USER_ID_KEY = 'parkswift_user_id';
const USER_PHONE_KEY = 'parkswift_user_phone';

/**
 * Save authentication token securely
 */
export async function saveAuthToken(token: string, expiresIn?: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);

    // Save token expiry time (in milliseconds from now)
    if (expiresIn) {
      const expiryTime = Date.now() + expiresIn * 1000;
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(expiryTime));
    }
  } catch (error) {
    console.error('[SecureStorage] Failed to save token:', error);
    throw error;
  }
}

/**
 * Save refresh token securely
 */
export async function saveRefreshToken(refreshToken: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('[SecureStorage] Failed to save refresh token:', error);
    throw error;
  }
}

/**
 * Retrieve refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    return refreshToken || null;
  } catch (error) {
    console.error('[SecureStorage] Failed to retrieve refresh token:', error);
    return null;
  }
}

/**
 * Check if token is about to expire (within 1 minute)
 */
export async function isTokenExpiringSoon(): Promise<boolean> {
  try {
    const expiryTimeStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    if (!expiryTimeStr) return true; // No expiry time, consider expired

    const expiryTime = parseInt(expiryTimeStr, 10);
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    // Return true if expires within 1 minute
    return timeUntilExpiry < 60 * 1000;
  } catch (error) {
    console.error('[SecureStorage] Failed to check token expiry:', error);
    return true; // On error, consider expired
  }
}

/**
 * Retrieve authentication token
 * Automatically clears expired tokens to prevent stale token issues
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return null;

    // Check if token is expired
    const isExpired = await isTokenExpiringSoon();
    if (isExpired) {
      if (__DEV__) console.log('[SecureStorage] Token expired, clearing auth data');
      await clearAuthData();
      return null;
    }

    return token;
  } catch (error) {
    console.error('[SecureStorage] Failed to retrieve token:', error);
    return null;
  }
}

/**
 * Save user ID
 */
export async function saveUserId(userId: string | number): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_ID_KEY, String(userId));
  } catch (error) {
    console.error('[SecureStorage] Failed to save user ID:', error);
    throw error;
  }
}

/**
 * Retrieve user ID
 */
export async function getUserId(): Promise<string | null> {
  try {
    const userId = await SecureStore.getItemAsync(USER_ID_KEY);
    return userId || null;
  } catch (error) {
    console.error('[SecureStorage] Failed to retrieve user ID:', error);
    return null;
  }
}

/**
 * Save user phone number
 */
export async function saveUserPhone(phone: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_PHONE_KEY, phone);
  } catch (error) {
    console.error('[SecureStorage] Failed to save phone:', error);
    throw error;
  }
}

/**
 * Retrieve user phone number
 */
export async function getUserPhone(): Promise<string | null> {
  try {
    const phone = await SecureStore.getItemAsync(USER_PHONE_KEY);
    return phone || null;
  } catch (error) {
    console.error('[SecureStorage] Failed to retrieve phone:', error);
    return null;
  }
}

/**
 * Clear all authentication data (logout)
 */
export async function clearAuthData(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
      SecureStore.deleteItemAsync(USER_ID_KEY),
      SecureStore.deleteItemAsync(USER_PHONE_KEY),
    ]);
  } catch (error) {
    console.error('[SecureStorage] Failed to clear auth data:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}
