import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { sendError, BadRequest, assertAuth } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

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
};
