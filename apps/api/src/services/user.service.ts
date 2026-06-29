import { z } from 'zod';
import { BookingStatus } from '@prisma/client';
import { db } from '../config/database';
import { AppError } from '../utils/errors';
import { storageService } from './storage.service';
import { BUCKETS } from '../config/supabase';

// Validation schemas
const completeProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z ]+$/, 'First name can only contain letters and spaces'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z ]+$/, 'Last name can only contain letters and spaces'),
  email: z
    .string()
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.(com|co|in|org|net|edu|gov|io|uk|us|de|fr|au|ca|es|it|mx|br|jp|cn|ru|nl)$/i,
      'Please use a valid email address with a recognized domain'
    ),
  upiId: z
    .string()
    .regex(/^[a-z0-9.\-_]{2,256}@[a-z]{2,64}$/, 'Enter a valid UPI ID (e.g. name@okhdfcbank)')
    .optional()
    .nullable()
    .or(z.literal('')),
});

const updateProfileSchema = completeProfileSchema.partial().extend({
  emergencyContactName: z.string().max(100).optional().nullable(),
  emergencyContactPhone: z
    .string()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
    .optional()
    .nullable()
    .or(z.literal('')),
});

export const userService = {
  getProfile: async (userId: number) => {
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        parkerProfile: true,
        ownerProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const photoUrl = user.photoUrl
      ? await storageService.resolveUrl(user.photoUrl, BUCKETS.PUBLIC).catch(() => user.photoUrl)
      : null;

    return {
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        photoUrl,
        isProfileComplete: user.isProfileComplete,
        role: user.role,
        createdAt: user.createdAt,
        emergencyContactName: user.emergencyContactName,
        emergencyContactPhone: user.emergencyContactPhone,
        parkerProfile: user.parkerProfile,
        ownerProfile: user.ownerProfile,
      },
    };
  },

  updateProfile: async (userId: number, data: any) => {
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    try {
      const validatedData = updateProfileSchema.parse(data);

      // Check if email is already used by another user
      if (validatedData.email) {
        const existingUser = await db.user.findUnique({
          where: { email: validatedData.email },
        });

        if (existingUser && existingUser.id !== userId) {
          throw new AppError('This email is already registered', 400);
        }
      }

      const user = await db.user.update({
        where: { id: userId },
        data: validatedData,
        include: {
          parkerProfile: true,
          ownerProfile: true,
        },
      });

      return {
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          photoUrl: user.photoUrl,
          isProfileComplete: user.isProfileComplete,
          role: user.role,
          createdAt: user.createdAt,
          emergencyContactName: user.emergencyContactName,
          emergencyContactPhone: user.emergencyContactPhone,
          parkerProfile: user.parkerProfile,
          ownerProfile: user.ownerProfile,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(error.errors[0]?.message || 'Validation error', 400);
      }
      throw error;
    }
  },

  /**
   * Upload a new profile photo to the public bucket and store its URL on the user.
   * Old photo (if stored in our bucket) is deleted best-effort.
   */
  updateProfilePhoto: async (
    userId: number,
    file: { buffer: Buffer; originalname: string; mimetype: string }
  ) => {
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { photoUrl: true },
    });

    const stored = await storageService.uploadPublic({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: `profiles/${userId}`,
    });

    const user = await db.user.update({
      where: { id: userId },
      data: { photoUrl: stored.url },
      select: { id: true, photoUrl: true },
    });

    // Best-effort cleanup of the previous object (only if it's one of ours).
    const old = existing?.photoUrl;
    if (old && old.includes(`/${BUCKETS.PUBLIC}/`)) {
      const key = old.split(`/${BUCKETS.PUBLIC}/`)[1];
      if (key) await storageService.remove(key, BUCKETS.PUBLIC).catch(() => {});
    }

    return { success: true, photoUrl: user.photoUrl };
  },

  completeProfile: async (userId: number, data: any) => {
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    try {
      const validatedData = completeProfileSchema.parse(data);

      // Check if email is already used by another user
      const existingUser = await db.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new AppError('This email is already registered', 400);
      }

      // Build the update payload — upiId is optional, so only set it if provided and non-empty.
      const updateData: any = {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        isProfileComplete: true,
      };
      if (validatedData.upiId) {
        updateData.upiId = validatedData.upiId.trim().toLowerCase();
      }

      const user = await db.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          parkerProfile: true,
          ownerProfile: true,
        },
      });

      return {
        success: true,
        message: 'Profile completed successfully',
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          photoUrl: user.photoUrl,
          isProfileComplete: user.isProfileComplete,
          role: user.role,
          parkerProfile: user.parkerProfile,
          ownerProfile: user.ownerProfile,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(error.errors[0]?.message || 'Validation error', 400);
      }
      throw error;
    }
  },

  /** Fetch the user's billing profile; missing fields fall back to their name/email. */
  getBillingProfile: async (userId: number) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true, lastName: true, email: true,
        billingName: true, billingEmail: true, billingAddress: true, gstin: true, upiId: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);
    const fallbackName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '';
    return {
      success: true,
      billing: {
        billingName: user.billingName ?? fallbackName,
        billingEmail: user.billingEmail ?? user.email ?? '',
        billingAddress: user.billingAddress ?? '',
        gstin: user.gstin ?? '',
        // UPI ID — owners receive payments from parkers; parkers use for refunds/personal receipts.
        upiId: user.upiId ?? '',
      },
    };
  },

  /** Save the user's billing profile. Basic validation; GSTIN + UPI ID optional. */
  updateBillingProfile: async (userId: number, data: {
    billingName?: string; billingEmail?: string; billingAddress?: string; gstin?: string; upiId?: string;
  }) => {
    const name = (data.billingName || '').trim();
    const email = (data.billingEmail || '').trim();
    // Only require billingName if it's being updated alongside other billing details.
    // If ONLY upiId is being updated (e.g., from the active-session modal), skip this check.
    const isFullBillingUpdate = data.billingName || data.billingEmail || data.billingAddress || data.gstin;
    if (isFullBillingUpdate && !name) throw new AppError('Billing name is required', 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Enter a valid billing email', 400);
    }
    const gstin = (data.gstin || '').trim().toUpperCase();
    // India GSTIN is 15 chars; validate only if provided.
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(gstin)) {
      throw new AppError('Enter a valid 15-character GSTIN', 400);
    }
    // UPI ID format: handle@bank (e.g. name@okhdfcbank, user-123@okaxis). Optional.
    const upiId = (data.upiId || '').trim().toLowerCase();
    if (upiId && !/^[a-z0-9.\-_]{2,256}@[a-z]{2,64}$/.test(upiId)) {
      throw new AppError('Enter a valid UPI ID (e.g. name@okhdfcbank)', 400);
    }
    await db.user.update({
      where: { id: userId },
      data: {
        billingName: name,
        billingEmail: email || null,
        billingAddress: (data.billingAddress || '').trim() || null,
        gstin: gstin || null,
        upiId: upiId || null,
      },
    });
    return { success: true, message: 'Billing details saved.' };
  },

  updatePushToken: async (userId: number, token: string | null) => {
    // Clearing the token (logout) — just null it for this user.
    if (!token) {
      await db.user.update({ where: { id: userId }, data: { expoPushToken: null } });
      return;
    }

    // Device-swap dedupe: a physical device has ONE Expo token. If another user
    // previously registered this same token (shared/handed-down phone), clear it
    // from them first — otherwise a push meant for this user would also reach the
    // previous owner. The token belongs to whoever logged in last.
    await db.user.updateMany({
      where: { expoPushToken: token, id: { not: userId } },
      data: { expoPushToken: null },
    });
    await db.user.update({ where: { id: userId }, data: { expoPushToken: token } });
  },

  /**
   * Self-service account deletion (Play Store / GDPR "right to be forgotten").
   * Soft-deletes: keeps the row for legal/audit (ratings, incidents survive) but
   * marks the account deleted, clears the push token, and frees the phone number
   * for re-registration by suffixing it. Blocked if the user has anything in
   * flight (active bookings as a parker, or live bookings on their spaces).
   */
  deleteOwnAccount: async (userId: number) => {
    const IN_FLIGHT = [BookingStatus.PENDING_APPROVAL, BookingStatus.APPROVED, BookingStatus.ACTIVE];

    const [parkerActive, ownerActive] = await Promise.all([
      db.booking.count({ where: { parkerId: userId, status: { in: IN_FLIGHT } } }),
      db.booking.count({ where: { space: { ownerId: userId }, status: { in: IN_FLIGHT } } }),
    ]);
    if (parkerActive > 0) {
      throw new AppError('You have an active or pending booking. Complete or cancel it before deleting your account.', 400);
    }
    if (ownerActive > 0) {
      throw new AppError('You have active bookings on your spaces. Wait for them to finish before deleting your account.', 400);
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!user) throw new AppError('User not found', 404);

    const now = new Date();
    await db.$transaction([
      db.session.deleteMany({ where: { userId } }),
      // Soft-delete + free the phone (suffix so the @unique constraint releases it
      // for a fresh signup, while the original is still recoverable from the suffix).
      db.user.update({
        where: { id: userId },
        data: {
          deletedAt: now,
          deletedReason: 'USER_REQUESTED',
          status: 'BANNED',
          expoPushToken: null,
          phone: `deleted_${userId}_${user.phone}`.slice(0, 40),
        },
      }),
      // Soft-delete the user's spaces so they stop appearing in search.
      db.space.updateMany({ where: { ownerId: userId, deletedAt: null }, data: { deletedAt: now } }),
      // Hard-cancel any live subscription: flip status off ACTIVE and kill auto-renewal
      // so the daily expiry job can never roll it forward (no refund — paid period is forfeit).
      db.subscription.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'CANCELLED', autoRenewal: false, scheduledDowngradePlanId: null },
      }),
    ]);

    return { success: true, message: 'Your account has been deleted.' };
  },

  getPublicProfile: async (userId: number) => {
    if (!userId || isNaN(userId)) {
      throw new AppError('Invalid user ID', 400);
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        parkerProfile: true,
        ownerProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Return only public information
    return {
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        role: user.role,
        parkerProfile: user.parkerProfile ? {
          totalBookings: user.parkerProfile.totalBookings,
          averageRating: user.parkerProfile.averageRating,
        } : null,
        ownerProfile: user.ownerProfile ? {
          totalSpaces: user.ownerProfile.totalSpaces,
          averageRating: user.ownerProfile.averageRating,
        } : null,
      },
    };
  },
};
