import { z } from 'zod';
import { db } from '../config/database';
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
      const error = new Error('User ID is required');
      (error as any).status = 400;
      throw error;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        parkerProfile: true,
        ownerProfile: true,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      (error as any).status = 404;
      throw error;
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
      const error = new Error('User ID is required');
      (error as any).status = 400;
      throw error;
    }

    try {
      const validatedData = updateProfileSchema.parse(data);

      // Check if email is already used by another user
      if (validatedData.email) {
        const existingUser = await db.user.findUnique({
          where: { email: validatedData.email },
        });

        if (existingUser && existingUser.id !== userId) {
          const error = new Error('This email is already registered');
          (error as any).status = 400;
          throw error;
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
        const err = new Error(error.errors[0]?.message || 'Validation error');
        (err as any).status = 400;
        throw err;
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
      const error = new Error('User ID is required');
      (error as any).status = 400;
      throw error;
    }

    try {
      const validatedData = completeProfileSchema.parse(data);

      // Check if email is already used by another user
      const existingUser = await db.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser && existingUser.id !== userId) {
        const error = new Error('This email is already registered');
        (error as any).status = 400;
        throw error;
      }

      const user = await db.user.update({
        where: { id: userId },
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          isProfileComplete: true,
        },
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
        const err = new Error(error.errors[0]?.message || 'Validation error');
        (err as any).status = 400;
        throw err;
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
        billingName: true, billingEmail: true, billingAddress: true, gstin: true,
      },
    });
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    const fallbackName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '';
    return {
      success: true,
      billing: {
        billingName: user.billingName ?? fallbackName,
        billingEmail: user.billingEmail ?? user.email ?? '',
        billingAddress: user.billingAddress ?? '',
        gstin: user.gstin ?? '',
      },
    };
  },

  /** Save the user's billing profile. Basic validation; GSTIN is optional. */
  updateBillingProfile: async (userId: number, data: {
    billingName?: string; billingEmail?: string; billingAddress?: string; gstin?: string;
  }) => {
    const name = (data.billingName || '').trim();
    const email = (data.billingEmail || '').trim();
    if (!name) throw Object.assign(new Error('Billing name is required'), { statusCode: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw Object.assign(new Error('Enter a valid billing email'), { statusCode: 400 });
    }
    const gstin = (data.gstin || '').trim().toUpperCase();
    // India GSTIN is 15 chars; validate only if provided.
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(gstin)) {
      throw Object.assign(new Error('Enter a valid 15-character GSTIN'), { statusCode: 400 });
    }
    await db.user.update({
      where: { id: userId },
      data: {
        billingName: name,
        billingEmail: email || null,
        billingAddress: (data.billingAddress || '').trim() || null,
        gstin: gstin || null,
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
    const IN_FLIGHT = ['PENDING_APPROVAL', 'APPROVED', 'ACTIVE'];

    const [parkerActive, ownerActive] = await Promise.all([
      db.booking.count({ where: { parkerId: userId, status: { in: IN_FLIGHT } } }),
      db.booking.count({ where: { space: { ownerId: userId }, status: { in: IN_FLIGHT } } }),
    ]);
    if (parkerActive > 0) {
      throw Object.assign(new Error('You have an active or pending booking. Complete or cancel it before deleting your account.'), { statusCode: 400 });
    }
    if (ownerActive > 0) {
      throw Object.assign(new Error('You have active bookings on your spaces. Wait for them to finish before deleting your account.'), { statusCode: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    await db.$transaction([
      db.session.deleteMany({ where: { userId } }),
      // Soft-delete + free the phone (suffix so the @unique constraint releases it
      // for a fresh signup, while the original is still recoverable from the suffix).
      db.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          deletedReason: 'USER_REQUESTED',
          status: 'BANNED',
          expoPushToken: null,
          phone: `deleted_${userId}_${user.phone}`.slice(0, 40),
        },
      }),
      // Soft-delete the user's spaces so they stop appearing in search.
      db.space.updateMany({ where: { ownerId: userId, deletedAt: null }, data: { deletedAt: new Date() } }),
    ]);

    return { success: true, message: 'Your account has been deleted.' };
  },

  getPublicProfile: async (userId: number) => {
    if (!userId || isNaN(userId)) {
      const error = new Error('Invalid user ID');
      (error as any).status = 400;
      throw error;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        parkerProfile: true,
        ownerProfile: true,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      (error as any).status = 404;
      throw error;
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
