import { Request, Response } from 'express';
import { ratingAdminService } from '../services/ratingAdmin.service';
import { auditService } from '../services/audit.service';
import { sendError, assertAuth } from '../utils/errors';

export const ratingAdminController = {
  listReviews: async (req: Request, res: Response) => {
    try {
      const result = await ratingAdminService.listReviews({
        status: req.query.status as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  hideReview: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const reviewId = parseInt(req.params.id);
      const adminLabel = req.user.phone || `admin#${req.user.id}`;
      const result = await ratingAdminService.hideReview(reviewId, adminLabel);
      await auditService.logAdminAction({
        adminId: req.user.id, action: 'REVIEW_HIDDEN', targetType: 'RATING', targetId: reviewId, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  unhideReview: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const reviewId = parseInt(req.params.id);
      const result = await ratingAdminService.unhideReview(reviewId);
      await auditService.logAdminAction({
        adminId: req.user.id, action: 'REVIEW_RESTORED', targetType: 'RATING', targetId: reviewId, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
