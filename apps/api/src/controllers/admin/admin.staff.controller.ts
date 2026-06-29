import { Request, Response } from 'express';
import { z } from 'zod';
import { adminStaffService } from '../../services/adminStaff.service';
import { sendError } from '../../utils/errors';

const createSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  name: z.string().min(1, 'Name is required'),
  adminRole: z.enum(['SUPER_ADMIN', 'SUPPORT_AGENT']),
});

const resetPasswordSchema = z.object({
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

export const adminStaffController = {
  list: async (req: Request, res: Response) => {
    try {
      const staff = await adminStaffService.list();
      res.json({ success: true, staff });
    } catch (e) {
      sendError(res, e);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const data = createSchema.parse(req.body);
      // staffId from JWT (set by adminLogin for staff accounts) or fall back to userId
      const creatorId = (req as any).adminStaffId ?? req.user!.id;
      const staff = await adminStaffService.create(data, creatorId);
      res.status(201).json({ success: true, staff });
    } catch (e) {
      sendError(res, e);
    }
  },

  deactivate: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      await adminStaffService.setActive(id, false);
      res.json({ success: true });
    } catch (e) {
      sendError(res, e);
    }
  },

  reactivate: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      await adminStaffService.setActive(id, true);
      res.json({ success: true });
    } catch (e) {
      sendError(res, e);
    }
  },

  resetPassword: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { password } = resetPasswordSchema.parse(req.body);
      await adminStaffService.resetPassword(id, password);
      res.json({ success: true });
    } catch (e) {
      sendError(res, e);
    }
  },
};
