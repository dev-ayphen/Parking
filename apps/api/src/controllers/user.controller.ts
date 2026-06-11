import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { sendError, assertAuth } from '../utils/errors';

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
