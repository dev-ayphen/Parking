import { Request, Response } from 'express';
import { ratingService } from '../services/rating.service';
import { adminService } from '../services/admin.service';
import { emitToUser } from '../app';
import { sendError } from '../utils/errors';

export const ratingController = {
  submitRating: async (req: Request, res: Response) => {
    try {
      const result = await ratingService.submitRating(req.user?.id || 0, req.body);

      // Notify the space owner that they were rated — live socket event (for an
      // open screen to refetch its average) + a notification (push + inbox).
      // Only on a NEW rating, never on an edit, to avoid re-pinging the owner.
      if (result.ownerId && !result.isUpdate) {
        const stars = result.rating.rating;
        emitToUser(result.ownerId, 'rating:new', {
          spaceId: result.spaceId,
          rating: stars,
        });
        await adminService.notifyUser(result.ownerId, {
          title: 'New Review',
          message: `You received a ${stars}★ review on ${result.spaceName || 'your space'}.`,
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
