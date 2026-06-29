import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { sendError, BadRequest, assertAuth } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';
import { db } from '../config/database';
import { getRequestIdentity } from '../utils/requestIdentity';

// Validation schemas
const requestOtpSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  otp: z.string().min(1, 'OTP is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const adminLoginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const authController = {
  requestOtp: async (req: Request, res: Response) => {
    try {
      const validatedData = requestOtpSchema.parse(req.body);
      const result = await authService.requestOtp(validatedData);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  verifyOtp: async (req: Request, res: Response) => {
    try {
      const validatedData = verifyOtpSchema.parse(req.body);
      const result = await authService.verifyOtp(validatedData);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  logout: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await authService.logout(req.user.id);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  refreshToken: async (req: Request, res: Response) => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const result = await authService.refreshToken(refreshToken);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  adminLogin: async (req: Request, res: Response) => {
    try {
      const { email, password } = adminLoginSchema.parse(req.body);
      const result = await authService.adminLogin(email, password, {
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-web',
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  /**
   * POST /auth/accept-terms
   * Records T&C acceptance in ComplianceLog. Called only when:
   *   1. User accepts for the first time (acceptedTermsVersion is null)
   *   2. User accepts a new version of T&C (version changed)
   * Body: { termsVersion: "1.0.0", platform: "ios"|"android" }
   */
  acceptTerms: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const { termsVersion, platform } = req.body;
      if (!termsVersion) return res.status(400).json({ error: 'termsVersion is required' });

      const identity = getRequestIdentity(req);
      const userId = req.user.id;

      // Check if user already accepted this exact version — idempotent
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { acceptedTermsVersion: true },
      });

      if (user?.acceptedTermsVersion === termsVersion) {
        return res.json({ success: true, alreadyRecorded: true });
      }

      // Write ComplianceLog entry
      await db.complianceLog.create({
        data: {
          type: 'T_AND_C_ACCEPTED',
          userId,
          documentVersion: termsVersion,
          platform: platform ?? null,
          ipAddress: identity.ipAddress,
          status: 'COMPLETED',
          notes: `User accepted T&C version ${termsVersion}`,
        },
      });

      // Update user's accepted version + timestamp
      await db.user.update({
        where: { id: userId },
        data: {
          acceptedTermsVersion: termsVersion,
          termsAcceptedAt: new Date(),
        },
      });

      res.json({ success: true, recorded: true, termsVersion });
    } catch (error) {
      sendError(res, error);
    }
  },
};
