import jwt, { SignOptions } from 'jsonwebtoken';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { env } from '../config/env';
import {
  generateOTP,
  sendOTPViaSMS,
  isValidIndianPhone,
  formatPhoneNumber,
} from '../utils/otp.utils';

const OTP_VALIDITY_MINUTES = 10;
const RATE_LIMIT_WINDOW_MINUTES = 15;
// Cap OTP *requests* per window. Each request mints a fresh OTP and resets the
// wrong-guess counter, so a high cap effectively multiplies the brute-force
// space (5 guesses × N requests). Keep this low. Allow more in dev for testing.
const MAX_OTP_REQUESTS = process.env.NODE_ENV === 'production' ? 5 : 20;
const MAX_OTP_ATTEMPTS = 5;

// Redis key prefixes
const OTP_KEY_PREFIX = 'otp:';
const RATE_LIMIT_KEY_PREFIX = 'rate_limit:otp_request:';

/**
 * Get OTP data from Redis
 */
const getOTPFromRedis = async (phone: string): Promise<{ otp: string; attempts: number; createdAt: number } | null> => {
  try {
    const data = await redis.get(`${OTP_KEY_PREFIX}${phone}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('[REDIS] Error getting OTP');
    return null;
  }
};

/**
 * Set OTP in Redis with TTL
 */
const setOTPInRedis = async (
  phone: string,
  otp: string,
  attempts: number = 0
) => {
  try {
    const otpData = {
      otp,
      attempts,
      createdAt: Date.now(),
    };
    // Set with 10 minute TTL
    await redis.setex(
      `${OTP_KEY_PREFIX}${phone}`,
      OTP_VALIDITY_MINUTES * 60,
      JSON.stringify(otpData)
    );
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('[REDIS] Error setting OTP');
    throw error;
  }
};

/**
 * Delete OTP from Redis
 */
const deleteOTPFromRedis = async (phone: string) => {
  try {
    await redis.del(`${OTP_KEY_PREFIX}${phone}`);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('[REDIS] Error deleting OTP');
  }
};

/**
 * Get rate limit count from Redis
 */
const getRateLimitFromRedis = async (phone: string) => {
  // Fail CLOSED: if we can't read the counter we must not silently disable the
  // rate limit. Let the error propagate so the OTP request is refused.
  const data = await redis.get(`${RATE_LIMIT_KEY_PREFIX}${phone}`);
  return data ? JSON.parse(data) : null;
};

/**
 * Set rate limit in Redis
 */
const setRateLimitInRedis = async (phone: string, count: number) => {
  try {
    const rateLimitData = {
      count,
      windowStart: Date.now(),
    };
    // Set with 15 minute TTL
    await redis.setex(
      `${RATE_LIMIT_KEY_PREFIX}${phone}`,
      RATE_LIMIT_WINDOW_MINUTES * 60,
      JSON.stringify(rateLimitData)
    );
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('[REDIS] Error setting rate limit');
  }
};

export const authService = {
  requestOtp: async (data: any) => {
    const { phone } = data;

    // Validate phone format
    if (!phone || typeof phone !== 'string') {
      const error = new Error('Phone number is required');
      (error as any).status = 400;
      throw error;
    }

    const formattedPhone = formatPhoneNumber(phone);

    if (!isValidIndianPhone(formattedPhone)) {
      const error = new Error('Invalid Indian phone number format');
      (error as any).status = 400;
      throw error;
    }

    try {
      // Rate limiting check
      const now = Date.now();
      const requestData = await getRateLimitFromRedis(formattedPhone);

      if (requestData) {
        // Check if window is still active
        if (now - requestData.windowStart <= RATE_LIMIT_WINDOW_MINUTES * 60 * 1000) {
          if (requestData.count >= MAX_OTP_REQUESTS) {
            const error = new Error('Too many OTP requests. Please try again later.');
            (error as any).status = 429;
            throw error;
          }
          // Increment count
          await setRateLimitInRedis(formattedPhone, requestData.count + 1);
        } else {
          // Window expired, reset
          await setRateLimitInRedis(formattedPhone, 1);
        }
      } else {
        // First request
        await setRateLimitInRedis(formattedPhone, 1);
      }

      // Generate and store OTP
      const otp = generateOTP();
      await setOTPInRedis(formattedPhone, otp, 0);

      // OTP delivery. Stays in 'development' (console) until MSG91 is wired up;
      // switch to NODE_ENV-based once SMS is configured. sendOTPViaSMS THROWS on
      // a real delivery failure, so we never report success without sending.
      await sendOTPViaSMS(formattedPhone, otp, 'development');

      return {
        success: true,
        message: 'OTP sent successfully',
        ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('[AUTH_OTP] Error requesting OTP');
      throw error;
    }
  },

  verifyOtp: async (data: any) => {
    const { phone, otp } = data;

    // Validate inputs
    if (!phone || typeof phone !== 'string') {
      const error = new Error('Phone number is required');
      (error as any).status = 400;
      throw error;
    }

    if (!otp || typeof otp !== 'string') {
      const error = new Error('OTP is required');
      (error as any).status = 400;
      throw error;
    }

    const formattedPhone = formatPhoneNumber(phone);

    try {
      // Check if OTP exists
      const otpData = await getOTPFromRedis(formattedPhone);
      if (!otpData) {
        const error = new Error('OTP not found or expired');
        (error as any).status = 400;
        throw error;
      }

      // Check attempt limit
      if (otpData.attempts >= MAX_OTP_ATTEMPTS) {
        await deleteOTPFromRedis(formattedPhone);
        const error = new Error('Too many wrong attempts. Please request a new OTP.');
        (error as any).status = 429;
        throw error;
      }

      // Verify OTP
      if (otpData.otp !== otp) {
        // Increment attempts
        otpData.attempts++;
        await setOTPInRedis(formattedPhone, otpData.otp, otpData.attempts);
        const error = new Error(
          `Invalid OTP. ${MAX_OTP_ATTEMPTS - otpData.attempts} attempts remaining.`
        );
        (error as any).status = 400;
        throw error;
      }

      // OTP verified, remove from store and clear rate limit
      await deleteOTPFromRedis(formattedPhone);
      await redis.del(`${RATE_LIMIT_KEY_PREFIX}${formattedPhone}`); // Clear rate limit for this phone

      // User lookup/creation
      let user = await db.user.findUnique({
        where: { phone: formattedPhone },
      });

      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        // Create user and profiles
        user = await db.user.create({
          data: {
            phone: formattedPhone,
            role: 'PARKER',
            isProfileComplete: false,
            parkerProfile: {
              create: {
                totalBookings: 0,
                totalSpent: 0,
                averageRating: 0,
              },
            },
            ownerProfile: {
              create: {
                totalSpaces: 0,
                totalEarnings: 0,
                averageRating: 0,
                verificationStatus: 'PENDING',
              },
            },
          },
        });
      }

      // Block banned users
      if (user.status === 'BANNED') {
        const error = new Error(
          user.banReason
            ? `This account has been banned: ${user.banReason}`
            : 'This account has been banned. Contact support for assistance.'
        );
        (error as any).status = 403;
        throw error;
      }

      // Block currently suspended users (auto-expire temporary suspensions on the fly)
      if (user.status === 'SUSPENDED') {
        const stillSuspended = !user.suspendedUntil || new Date(user.suspendedUntil) > new Date();
        if (stillSuspended) {
          const untilStr = user.suspendedUntil
            ? ` until ${new Date(user.suspendedUntil).toLocaleDateString('en-IN')}`
            : ' indefinitely';
          const error = new Error(
            `Your account is suspended${untilStr}. Reason: ${user.suspendReason || 'No reason provided'}`
          );
          (error as any).status = 403;
          throw error;
        }
        // Suspension expired — auto-reinstate
        await db.user.update({
          where: { id: user.id },
          data: { status: 'ACTIVE', suspendedAt: null, suspendedUntil: null, suspendReason: null },
        });
      }

      // Record successful login time
      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      // Generate JWT access token (short-lived: 7 days)
      const accessPayload = {
        sub: user.id,
        phone: user.phone,
        role: user.role,
        type: 'access',
      };
      const secret: string = env.JWT_SECRET;
      const accessOptions: SignOptions = {
        expiresIn: env.JWT_EXPIRES_IN as any,
      };
      const accessToken = jwt.sign(accessPayload, secret, accessOptions);

      // Generate refresh token (long-lived: 30 days)
      const refreshPayload = {
        sub: user.id,
        type: 'refresh',
      };
      const refreshOptions: SignOptions = {
        expiresIn: '30d',
      };
      const refreshToken = jwt.sign(refreshPayload, secret, refreshOptions);

      // Calculate expiry dates
      const accessTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Create session record
      await db.session.create({
        data: {
          userId: user.id,
          token: accessToken,
          refreshToken,
          expiresAt: accessTokenExpiresAt,
          refreshTokenExpiresAt,
          ipAddress: '', // Will be set by controller from req.ip
          userAgent: '', // Will be set by controller from req.get('user-agent')
        },
      });

      console.log(`[AUTH] Session created for user ${user.id} with access token (7d) and refresh token (30d)`);

      return {
        success: true,
        token: accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
        user: {
          id: user.id,
          phone: user.phone,
          isProfileComplete: user.isProfileComplete,
          isNewUser,
          role: user.role,
          acceptedTermsVersion: user.acceptedTermsVersion ?? null,
        },
      };
    } catch (error) {
      console.error('[AUTH_VERIFY_OTP] Error verifying OTP:', error);
      throw error;
    }
  },

  logout: async (userId: number) => {
    if (!userId) {
      const error = new Error('User ID is required');
      (error as any).status = 401;
      throw error;
    }

    try {
      // Delete all sessions for this user
      await db.session.deleteMany({
        where: { userId },
      });

      console.log(`[AUTH] All sessions deleted for user ${userId}`);

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      console.error('[AUTH_LOGOUT] Error during logout:', error);
      throw error;
    }
  },

  refreshToken: async (refreshToken: string) => {
    if (!refreshToken) {
      const error = new Error('Refresh token is required');
      (error as any).status = 400;
      throw error;
    }

    try {
      // Verify refresh token signature
      const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as any;

      if (decoded.type !== 'refresh') {
        const error = new Error('Invalid token type');
        (error as any).status = 401;
        throw error;
      }

      const userId = parseInt(String(decoded.sub), 10);

      // Check if session exists and refresh token is valid
      const session = await db.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session) {
        const error = new Error('Session not found');
        (error as any).status = 401;
        throw error;
      }

      // Check if refresh token has expired
      if (new Date(session.refreshTokenExpiresAt) < new Date()) {
        const error = new Error('Refresh token expired');
        (error as any).status = 401;
        throw error;
      }

      // Generate new access token
      const newAccessPayload = {
        sub: userId,
        phone: session.user.phone,
        role: session.user.role,
        type: 'access',
      };
      const secret: string = env.JWT_SECRET;
      const accessOptions: SignOptions = {
        expiresIn: env.JWT_EXPIRES_IN as any,
      };
      const newAccessToken = jwt.sign(newAccessPayload, secret, accessOptions);

      // Update session with new access token
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.session.update({
        where: { id: session.id },
        data: {
          token: newAccessToken,
          expiresAt: newExpiresAt,
        },
      });

      console.log(`[AUTH] ✅ Access token refreshed for user ${userId}`);

      return {
        success: true,
        token: newAccessToken,
        refreshToken, // Return same refresh token
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        const err = new Error('Refresh token expired');
        (err as any).status = 401;
        throw err;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        const err = new Error('Invalid refresh token');
        (err as any).status = 401;
        throw err;
      }
      throw error;
    }
  },
};

// Export helper for testing OTPs in development
export const otpStore = {
  async get(phone: string): Promise<{ otp: string; attempts: number; createdAt: number } | null> {
    return getOTPFromRedis(phone);
  },
  async keys() {
    try {
      const keys = await redis.keys(`${OTP_KEY_PREFIX}*`);
      return keys.map(k => k.replace(OTP_KEY_PREFIX, ''));
    } catch (error) {
      console.error('[REDIS] Error getting keys:', error);
      return [];
    }
  },
};
