import { Request, Response } from 'express';
import { subscriptionService } from '../services/subscription.service';

export const subscriptionController = {
  getMyTransactions: async (req: Request, res: Response) => {
    try {
      const result = await subscriptionService.getMyTransactions(req.user?.id || 0);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getAvailablePlans: async (_req: Request, res: Response) => {
    try {
      const result = await subscriptionService.getAvailablePlans();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },

  getSubscription: async (req: Request, res: Response) => {
    try {
      const result = await subscriptionService.getSubscription(req.user?.id || 0);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
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
      const status = (error as any)?.statusCode || 500;
      res.status(status).json({ error: (error as Error).message });
    }
  },

  cancelSubscription: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid subscription id' });
      const result = await subscriptionService.cancelSubscription(id, req.user?.id || 0);
      res.json(result);
    } catch (error) {
      const status = (error as any)?.statusCode || 500;
      res.status(status).json({ error: (error as Error).message });
    }
  },
};
