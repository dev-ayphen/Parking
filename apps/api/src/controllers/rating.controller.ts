import { Request, Response } from 'express';
import { ratingService } from '../services/rating.service';
import { sendError } from '../utils/errors';

export const ratingController = {
  submitRating: async (req: Request, res: Response) => {
    try {
      const result = await ratingService.submitRating(req.user?.id || 0, req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
