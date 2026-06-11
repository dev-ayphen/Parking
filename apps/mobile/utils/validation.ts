import { z } from 'zod';

// Profile Completion Validation Schema
export const profileValidationSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z ]+$/, 'Only letters and spaces allowed in first name'),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z ]+$/, 'Only letters and spaces allowed in last name'),

  email: z
    .string()
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.(com|co|in|org|net|edu|gov|io|uk|us|de|fr|au|ca|es|it|mx|br|jp|cn|ru|nl)$/i,
      'Please use a valid email address (e.g., user@example.com)'
    ),

  photo: z
    .object({
      uri: z.string(),
      size: z.number().max(5242880, 'Photo must be less than 5MB'), // 5MB in bytes
      type: z.enum(['image/jpeg', 'image/png', 'image/jpg']),
    })
    .optional(),
});

// Type for profile data
export type ProfileData = z.infer<typeof profileValidationSchema>;

// Phone Validation Schema
export const phoneValidationSchema = z
  .string()
  .length(10, 'Phone number must be 10 digits')
  .regex(/^\d{10}$/, 'Phone number must contain only digits');

// OTP Validation Schema
export const otpValidationSchema = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only digits');

// Login Validation Schema
export const loginValidationSchema = z.object({
  phone: phoneValidationSchema,
});

// Verify OTP Validation Schema
export const verifyOtpValidationSchema = z.object({
  phone: phoneValidationSchema,
  otp: otpValidationSchema,
});
