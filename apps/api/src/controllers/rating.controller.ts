import { Request, Response } from 'express';
import { ratingService } from '../services/rating.service';
import { adminService } from '../services/admin.service';
import { emitToUser } from '../app';
import { sendError } from '../utils/errors';

export const ratingController = {
  submitRating: async (req: Request, res: Response) => {
    try {
      const result = await ratingService.submitRating(req.user?.id || 0, req.body);

      // Notify the RATED party (the other person) — live socket + inbox/push.
      // Only on a NEW rating, never an edit, to avoid re-pinging them.
      if (result.rateeId && !result.isUpdate) {
        const stars = result.rating.rating;
        const ratedOwner = result.direction === 'PARKER_RATED_OWNER';
        emitToUser(result.rateeId, 'rating:new', { spaceId: result.spaceId, rating: stars });
        await adminService.notifyUser(result.rateeId, {
          title: 'New Review',
          message: ratedOwner
            ? `You received a ${stars}★ review on ${result.spaceName || 'your space'}.`
            : `A space owner rated you ${stars}★ after your recent parking session.`,
          category: 'GENERAL',
          metadata: { spaceId: result.spaceId },
        });
      }

      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
