import { Request, Response } from 'express';
import { userPreferencesService } from '../services/userPreferences.service';
import { sendError } from '../utils/errors';

export const userPreferencesController = {
  getPreferences: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await userPreferencesService.get(userId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  updatePreferences: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await userPreferencesService.update(userId, req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
