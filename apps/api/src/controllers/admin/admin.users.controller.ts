import { Request, Response } from 'express';
import { adminService } from '../../services/admin.service';
import { emitToUser, emitToAdmin } from '../../app';
import { logEvent } from '../../services/log.service';
import { auditService } from '../../services/audit.service';
import { db } from '../../config/database';
import { sendError, NotFound } from '../../utils/errors';
import { ErrorCode } from '../../utils/errorCodes';

export const adminUsersController = {
  listUsers: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listUsers(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getUserDetails: async (req: Request, res: Response) => {
    try {
      const result = await adminService.getUserDetails(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'User not found') return sendError(res, NotFound(msg, ErrorCode.USER_NOT_FOUND));
      sendError(res, error);
    }
  },

  suspendUser: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const result = await adminService.suspendUser(userId, {
        reason: req.body?.reason,
        durationDays: req.body?.durationDays,
      });
      emitToUser(userId, 'user:status-change', { status: 'SUSPENDED', reason: req.body?.reason, suspendedUntil: result.suspendedUntil });
      emitToAdmin('users', 'user:updated', { userId, status: 'SUSPENDED' });
      await logEvent('WARN', 'admin', `User ${userId} suspended`, { reason: req.body?.reason, durationDays: req.body?.durationDays }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'USER_SUSPENDED', targetType: 'USER', targetId: userId,
        reason: req.body?.reason, payload: { durationDays: req.body?.durationDays }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  unsuspendUser: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const result = await adminService.unsuspendUser(userId);
      emitToUser(userId, 'user:status-change', { status: 'ACTIVE' });
      emitToAdmin('users', 'user:updated', { userId, status: 'ACTIVE' });
      await logEvent('INFO', 'admin', `User ${userId} reinstated`, {}, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'USER_UNSUSPENDED', targetType: 'USER', targetId: userId, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  banUser: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const result = await adminService.banUser(userId, { reason: req.body?.reason });
      emitToUser(userId, 'user:status-change', { status: 'BANNED', reason: req.body?.reason });
      emitToAdmin('users', 'user:updated', { userId, status: 'BANNED' });
      await logEvent('WARN', 'admin', `User ${userId} banned`, { reason: req.body?.reason }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'USER_BANNED', targetType: 'USER', targetId: userId, reason: req.body?.reason, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const result = await adminService.deleteUser(userId);
      emitToUser(userId, 'user:status-change', { status: 'DELETED' });
      emitToAdmin('users', 'user:deleted', { userId });
      await logEvent('WARN', 'admin', `User ${userId} deleted`, {}, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'USER_DELETED', targetType: 'USER', targetId: userId, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // Direct message to a single user. Reuses notifyUser (DB row + push) and
  // emits a socket event so an open app refreshes its inbox immediately.
  notifyUser: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const title = String(req.body?.title || '').trim();
      const body = String(req.body?.body || '').trim();
      const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) return sendError(res, NotFound('User not found', ErrorCode.USER_NOT_FOUND));
      const notification = await adminService.notifyUser(userId, {
        title, message: body, category: 'GENERAL', metadata: { source: 'admin_direct_message' },
      });
      emitToUser(userId, 'notification:new', { title, message: body });
      await logEvent('INFO', 'admin', `Direct message sent to user ${userId}`, { title }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'USER_MESSAGED', targetType: 'USER', targetId: userId, payload: { title }, req,
      });
      res.json({ success: true, notificationId: (notification as any)?.id ?? null });
    } catch (error) {
      sendError(res, error);
    }
  },
};
