import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { sendError } from '../utils/errors';

export const settingsController = {
  getSettings: async (_req: Request, res: Response) => {
    try {
      const result = await settingsService.get();
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  updateSettings: async (req: Request, res: Response) => {
    try {
      const result = await settingsService.update(req.body, req.user?.id);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getPublicSettings: async (_req: Request, res: Response) => {
    try {
      const result = await settingsService.getPublic();
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
