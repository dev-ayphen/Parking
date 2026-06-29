import { Request, Response } from 'express';
import { subscriptionService } from '../services/subscription.service';
import { sendError } from '../utils/errors';

export const subscriptionController = {
  getMyTransactions: async (req: Request, res: Response) => {
    try {
      const result = await subscriptionService.getMyTransactions(req.user?.id || 0);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getAvailablePlans: async (_req: Request, res: Response) => {
    try {
      const result = await subscriptionService.getAvailablePlans();
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getSubscription: async (req: Request, res: Response) => {
    try {
      const result = await subscriptionService.getSubscription(req.user?.id || 0);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  subscribe: async (req: Request, res: Response) => {
    try {
      const result = await subscriptionService.subscribe(req.user?.id || 0, {
        planId: req.body?.planId,
        billingCycle: req.body?.billingCycle,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  cancelSubscription: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid subscription id' });
      const result = await subscriptionService.cancelSubscription(id, req.user?.id || 0);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
