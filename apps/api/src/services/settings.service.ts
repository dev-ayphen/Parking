import { db } from '../config/database';

const SETTINGS_ID = 1; // singleton row

async function ensureSingleton() {
  const existing = await db.platformSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return db.platformSettings.create({ data: { id: SETTINGS_ID } });
}

// Whitelist of fields that admins can update
const UPDATABLE_FIELDS = [
  // General
  'platformName', 'supportEmail', 'supportPhone', 'defaultCurrency', 'defaultLocale',
  'maintenanceMode', 'maintenanceMessage',
  // Pricing
  'commissionRate', 'minHourlyRate', 'maxHourlyRate', 'cancellationPolicy', 'refundPolicy',
  'lateFeePolicy', 'discountCodesEnabled', 'seasonalPricingEnabled', 'gstRate',
  // Security
  'twoFactorEnabled', 'sessionTimeoutMinutes', 'maxLoginAttempts',
  'requirePhoneVerification', 'requireEmailVerification', 'passwordMinLength',
  // Notifications
  'emailNotificationsEnabled', 'smsNotificationsEnabled', 'pushNotificationsEnabled',
  'marketingEmailsEnabled', 'bookingNotifications', 'paymentNotifications', 'systemAlerts',
  // API
  'razorpayEnabled', 'razorpayKeyId', 'msg91Enabled', 'fcmEnabled', 'googleMapsApiKey',
  'webhookUrl', 'apiRateLimit',
] as const;

export const settingsService = {
  get: async () => {
    const settings = await ensureSingleton();
    return { success: true, settings };
  },

  update: async (data: any, adminUserId?: number) => {
    await ensureSingleton();

    const sanitized: any = {};
    for (const key of UPDATABLE_FIELDS) {
      if (data[key] !== undefined) sanitized[key] = data[key];
    }

    // Validate critical numeric ranges
    if (sanitized.commissionRate !== undefined) {
      const v = Number(sanitized.commissionRate);
      if (isNaN(v) || v < 0 || v > 100) throw new Error('commissionRate must be 0-100');
      sanitized.commissionRate = v;
    }
    if (sanitized.gstRate !== undefined) {
      const v = Number(sanitized.gstRate);
      if (isNaN(v) || v < 0 || v > 100) throw new Error('gstRate must be 0-100');
      sanitized.gstRate = v;
    }
    if (sanitized.minHourlyRate !== undefined && sanitized.maxHourlyRate !== undefined) {
      if (Number(sanitized.minHourlyRate) > Number(sanitized.maxHourlyRate)) {
        throw new Error('minHourlyRate cannot exceed maxHourlyRate');
      }
    }
    if (sanitized.minHourlyRate !== undefined) sanitized.minHourlyRate = Number(sanitized.minHourlyRate);
    if (sanitized.maxHourlyRate !== undefined) sanitized.maxHourlyRate = Number(sanitized.maxHourlyRate);

    const validPolicies = {
      cancellationPolicy: ['FLEXIBLE', 'MODERATE', 'STRICT'],
      refundPolicy: ['AUTO_REFUND', 'WALLET', 'MANUAL'],
      lateFeePolicy: ['DOUBLE_15M', 'STANDARD', 'NONE'],
    };
    for (const [field, allowed] of Object.entries(validPolicies)) {
      if (sanitized[field] && !allowed.includes(sanitized[field])) {
        throw new Error(`${field} must be one of: ${allowed.join(', ')}`);
      }
    }

    if (adminUserId) sanitized.updatedById = adminUserId;

    const settings = await db.platformSettings.update({
      where: { id: SETTINGS_ID },
      data: sanitized,
    });
    return { success: true, settings };
  },

  // Public-facing read — only safe values, no secrets
  getPublic: async () => {
    const s = await ensureSingleton();
    return {
      success: true,
      settings: {
        platformName: s.platformName,
        supportEmail: s.supportEmail,
        supportPhone: s.supportPhone,
        defaultCurrency: s.defaultCurrency,
        defaultLocale: s.defaultLocale,
        maintenanceMode: s.maintenanceMode,
        maintenanceMessage: s.maintenanceMessage,

        commissionRate: s.commissionRate,
        minHourlyRate: s.minHourlyRate,
        maxHourlyRate: s.maxHourlyRate,
        cancellationPolicy: s.cancellationPolicy,
        refundPolicy: s.refundPolicy,
        lateFeePolicy: s.lateFeePolicy,
        discountCodesEnabled: s.discountCodesEnabled,
        seasonalPricingEnabled: s.seasonalPricingEnabled,
        gstRate: s.gstRate,
      },
    };
  },
};
