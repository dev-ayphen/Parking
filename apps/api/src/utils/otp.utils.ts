/**
 * OTP Utility Functions
 *
 * In development: Logs OTP to console
 * In production: Calls MSG91 API (fails loudly if not configured)
 */
import crypto from 'crypto';

/**
 * Generate a cryptographically-secure random 6-digit OTP.
 * (Math.random is not a CSPRNG and is predictable — never use it for OTPs.)
 */
export const generateOTP = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Send OTP via SMS
 *
 * Development: Logs to console
 * Production: Calls MSG91 API
 */
export const sendOTPViaSMS = async (
  phone: string,
  otp: string,
  env: 'development' | 'production' = 'development'
): Promise<{ success: boolean; message: string }> => {
  if (env === 'development') {
    // Development only: print the OTP so a developer can log in without SMS.
    // (Never reaches production — gated on env.)
    console.log(`[OTP][dev] ${phone.slice(-4).padStart(phone.length, '*')} -> ${otp}`);
    return { success: true, message: 'OTP logged to console (development)' };
  }

  // Production: send via MSG91. Fails LOUDLY if not configured or the call
  // fails, so we never tell the user "OTP sent" when no SMS went out.
  const authKey = process.env.MSG91_API_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID;
  if (!authKey || !templateId) {
    throw new Error('SMS service is not configured (MSG91 credentials missing).');
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: authKey },
      body: JSON.stringify({
        template_id: templateId,
        mobile: `91${phone}`,
        otp,
        ...(senderId ? { sender: senderId } : {}),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data?.type === 'error') {
      throw new Error(data?.message || `MSG91 responded ${res.status}`);
    }
    return { success: true, message: 'OTP sent' };
  } catch (err) {
    // Surface the failure to the caller — do NOT report success.
    throw new Error('Failed to send OTP. Please try again in a moment.');
  }
};

/**
 * Format phone number for consistency
 * Accepts: 9876543210, +919876543210, +91 9876543210, 91 9876543210
 * Returns: 9876543210
 */
export const formatPhoneNumber = (phone: string): string => {
  // Trim and remove all non-digits
  const cleaned = phone.trim().replace(/\D/g, '');

  // If it's 91 followed by 10 digits, remove the country code
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.substring(2);
  }

  // If it's 10 digits, return as-is
  if (cleaned.length === 10) {
    return cleaned;
  }

  throw new Error('Invalid phone number format. Expected a 10-digit Indian number.');
};

/**
 * Validate Indian phone number
 */
export const isValidIndianPhone = (phone: string): boolean => {
  try {
    const cleaned = formatPhoneNumber(phone);
    // Indian mobile numbers start with 6-9
    const firstDigit = parseInt(cleaned[0]);
    return firstDigit >= 6 && firstDigit <= 9 && cleaned.length === 10;
  } catch {
    return false;
  }
};
