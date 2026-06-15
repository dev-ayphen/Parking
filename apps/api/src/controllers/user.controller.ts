import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { sendError, assertAuth, BadRequest } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

export const userController = {
  getProfile: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await userService.getProfile(req.user.id);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  updateProfile: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await userService.updateProfile(req.user.id, req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  /** POST /users/me/photo — multipart/form-data with `file` (image) */
  uploadPhoto: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      if (!req.file) throw BadRequest('No image uploaded', ErrorCode.VALIDATION_ERROR);
      const result = await userService.updateProfilePhoto(req.user.id, req.file);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  completeProfile: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await userService.completeProfile(req.user.id, req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  /** POST /users/me/push-token — register, refresh, or clear (on logout) the Expo push token */
  registerPushToken: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const { token } = req.body;

      // A null/empty token is a valid "clear my token" request (logout).
      if (token === null || token === undefined || token === '') {
        await userService.updatePushToken(req.user.id, null);
        return res.json({ success: true });
      }

      if (typeof token !== 'string') {
        throw BadRequest('token must be a string', ErrorCode.VALIDATION_ERROR);
      }
      // Only accept real Expo tokens — keeps garbage out of the DB.
      if (!/^Expo(nent)?PushToken\[.+\]$/.test(token)) {
        throw BadRequest('Invalid Expo push token format', ErrorCode.VALIDATION_ERROR);
      }
      await userService.updatePushToken(req.user.id, token);
      res.json({ success: true });
    } catch (error) {
      sendError(res, error);
    }
  },

  getPublicProfile: async (req: Request, res: Response) => {
    try {
      const result = await userService.getPublicProfile(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  /** DELETE /users/me — self-service account deletion (Play Store / GDPR). */
  deleteAccount: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await userService.deleteOwnAccount(req.user.id);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
