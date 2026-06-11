/**
 * OTP Utility Functions
 *
 * In development: Logs OTP to console
 * In production: Would call MSG91 API
 */

/**
 * Generate a random 6-digit OTP
 */
export const generateOTP = (): string => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
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
    // Development: Log to console
    console.log('\n' + '='.repeat(60));
    console.log('📱 OTP SENT (DEVELOPMENT MODE - NOT ACTUAL SMS)');
    console.log('='.repeat(60));
    console.log(`📞 Phone: ${phone}`);
    console.log(`🔐 OTP: ${otp}`);
    console.log(`⏱️  Valid for: 10 minutes`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      message: `OTP logged to console for phone: ${phone}`,
    };
  }

  // Production: Call MSG91 API (implement later)
  console.warn('MSG91 API not implemented yet');
  return {
    success: false,
    message: 'MSG91 API not configured',
  };
};

/**
 * Format phone number for consistency
 * Accepts: 9876543210, +919876543210, +91 9876543210, 91 9876543210
 * Returns: 9876543210
 */
export const formatPhoneNumber = (phone: string): string => {
  // Trim and remove all non-digits
  const cleaned = phone.trim().replace(/\D/g, '');

  console.log(`[FORMAT_PHONE] Input: "${phone}", Cleaned: "${cleaned}", Length: ${cleaned.length}`);

  // If it's 91 followed by 10 digits, remove the country code
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    const result = cleaned.substring(2);
    console.log(`[FORMAT_PHONE] Removing country code: "${result}"`);
    return result;
  }

  // If it's 10 digits, return as-is
  if (cleaned.length === 10) {
    console.log(`[FORMAT_PHONE] Valid 10-digit number: "${cleaned}"`);
    return cleaned;
  }

  const error = `Invalid phone number format. Got "${cleaned}" (length: ${cleaned.length}). Expected 10-digit Indian number.`;
  console.log(`[FORMAT_PHONE] Error:`, error);
  throw new Error(error);
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
