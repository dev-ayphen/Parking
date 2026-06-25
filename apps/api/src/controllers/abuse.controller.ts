import { Request, Response } from 'express';
import { abuseService } from '../services/abuse.service';
import { auditService } from '../services/audit.service';
import { adminService } from '../services/admin.service';
import { emitToUser, emitToAdmin } from '../app';
import { sendError, assertAuth } from '../utils/errors';

export const abuseController = {
  submitReport: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await abuseService.submitReport(req.user.id, req.body);
      // Live-refresh the admin moderation page.
      emitToAdmin('moderation', 'abuse:new', { id: (result as any)?.report?.id });
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
      const { status, page, search } = req.query;
      const result = await abuseService.listReports({
        status: status as string,
        page: page ? parseInt(page as string) : 1,
        search: search ? (search as string) : undefined,
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

      // If the action suspended/banned the user, force-log them out in real time
      // (same event the suspend/ban admin endpoints use) so a logged-in mobile
      // session doesn't keep working until restart. Without this the DB changed
      // but the user kept going.
      const { reportedUserId, appliedStatus, suspendedUntil } = result as any;
      if (reportedUserId && appliedStatus) {
        emitToUser(reportedUserId, 'user:status-change', {
          status: appliedStatus,
          reason: req.body?.adminAction || undefined,
          suspendedUntil: suspendedUntil || undefined,
        });
        await adminService.notifyUser(reportedUserId, {
          title: appliedStatus === 'BANNED' ? 'Account Banned' : 'Account Suspended',
          message: req.body?.adminAction
            ? String(req.body.adminAction)
            : appliedStatus === 'BANNED'
              ? 'Your account has been banned for policy violations.'
              : 'Your account has been suspended for policy violations.',
          category: 'SYSTEM',
        });
      } else if (reportedUserId && req.body?.action === 'WARNING_ISSUED') {
        // A warning doesn't change the account status, but the user MUST still be
        // told — otherwise "Warning Issued" only updates the admin panel and the
        // user never actually receives the warning.
        const warningMessage = req.body?.adminAction
          ? String(req.body.adminAction)
          : 'You have received a warning for violating our community guidelines. Repeated violations may lead to suspension or a ban.';
        // Real-time alert so an open mobile session is notified immediately
        // (not just on next notifications-screen open).
        emitToUser(reportedUserId, 'user:warning', {
          title: 'Warning from ParkSwift',
          message: warningMessage,
        });
        await adminService.notifyUser(reportedUserId, {
          title: 'Warning from ParkSwift',
          message: warningMessage,
          category: 'SYSTEM',
        });
      }

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
