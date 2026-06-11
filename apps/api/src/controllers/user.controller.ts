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

  getPublicProfile: async (req: Request, res: Response) => {
    try {
      const result = await userService.getPublicProfile(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
