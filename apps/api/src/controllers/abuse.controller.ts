import { Request, Response } from 'express';
import { abuseService } from '../services/abuse.service';
import { auditService } from '../services/audit.service';
import { sendError, assertAuth } from '../utils/errors';

export const abuseController = {
  submitReport: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await abuseService.submitReport(req.user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getMyReports: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await abuseService.getMyReports(req.user.id);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // Admin handlers (called from admin.routes.ts)
  listAbuseReports: async (req: Request, res: Response) => {
    try {
      const { status, page } = req.query;
      const result = await abuseService.listReports({
        status: status as string,
        page: page ? parseInt(page as string) : 1,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getAbuseReport: async (req: Request, res: Response) => {
    try {
      const result = await abuseService.getReport(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  actionAbuseReport: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const reportId = parseInt(req.params.id);
      const result = await abuseService.actionReport(reportId, req.user.id, req.body);
      await auditService.logAdminAction({
        adminId: req.user.id, action: 'ABUSE_ACTIONED', targetType: 'ABUSE_REPORT', targetId: reportId,
        reason: req.body?.adminAction, payload: { action: req.body?.action, suspendedUntil: req.body?.suspendedUntil }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
