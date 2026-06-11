import { z } from 'zod';
import { db } from '../config/database';

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
