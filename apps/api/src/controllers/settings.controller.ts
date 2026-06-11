import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';

export const settingsController = {
  getSettings: async (_req: Request, res: Response) => {
    try {
      const result = await settingsService.get();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  updateSettings: async (req: Request, res: Response) => {
    try {
      const result = await settingsService.update(req.body, req.user?.id);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  },

  getPublicSettings: async (_req: Request, res: Response) => {
    try {
      const result = await settingsService.getPublic();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
};
