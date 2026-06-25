import { Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { adminExportService } from '../services/adminExport.service';
import { getIO, emitToUser, emitToAdmin } from '../app';
import { logEvent } from '../services/log.service';
import { auditService } from '../services/audit.service';
import { caseEvidenceService } from '../services/caseEvidence.service';
import { db } from '../config/database';
import { sendError, NotFound } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

const emitTicketEvent = (event: string, ticketId: number, payload: any) => {
  const io = getIO();
  if (!io) return;
  io.to(`support_ticket_${ticketId}`).emit(event, payload);
};

export const adminController = {
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
      // Real-time push: force the user offline + tell the admin list to refresh
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
        adminId: req.user.id, action: 'USER_BANNED', targetType: 'USER', targetId: userId,
        reason: req.body?.reason, req,
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
        title,
        message: body,
        category: 'GENERAL',
        metadata: { source: 'admin_direct_message' },
      });
      // Live-refresh the user's inbox if their app is open.
      emitToUser(userId, 'notification:new', { title, message: body });

      await logEvent('INFO', 'admin', `Direct message sent to user ${userId}`, { title }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'USER_MESSAGED', targetType: 'USER', targetId: userId,
        payload: { title }, req,
      });
      res.json({ success: true, notificationId: (notification as any)?.id ?? null });
    } catch (error) {
      sendError(res, error);
    }
  },

  listSpaces: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listSpaces(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  updateSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const { name, address, hourlyRate, description, capacity } = req.body ?? {};
      const result = await adminService.updateSpace(spaceId, { name, address, hourlyRate, description, capacity });
      emitToAdmin('spaces', 'space:updated', { spaceId });
      await logEvent('INFO', 'spaces', `Space ${spaceId} edited by admin`, { name, address, hourlyRate, capacity }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_UPDATED', targetType: 'SPACE', targetId: spaceId,
        payload: { name, address, hourlyRate, capacity }, req,
      });
      res.json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Space not found') return sendError(res, NotFound(msg, ErrorCode.SPACE_NOT_FOUND));
      sendError(res, error);
    }
  },

  approveSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const result = await adminService.approveSpace(spaceId);
      const ownerId = (result as any)?.space?.ownerId ?? (result as any)?.ownerId;
      if (ownerId) emitToUser(ownerId, 'space:status', { spaceId, status: 'VERIFIED' });
      emitToAdmin('spaces', 'space:updated', { spaceId, status: 'VERIFIED' });
      await logEvent('SUCCESS', 'spaces', `Space ${spaceId} approved`, { ownerId }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_APPROVED', targetType: 'SPACE', targetId: spaceId,
        payload: { ownerId }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  rejectSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const reason = req.body?.reason;
      const result = await adminService.rejectSpace(spaceId, reason);
      const ownerId = (result as any)?.space?.ownerId ?? (result as any)?.ownerId;
      if (ownerId) emitToUser(ownerId, 'space:rejected', { spaceId, status: 'REJECTED', reason: (result as any)?.space?.rejectionReason });
      emitToAdmin('spaces', 'space:updated', { spaceId, status: 'REJECTED' });
      await logEvent('WARN', 'spaces', `Space ${spaceId} rejected`, { ownerId, reason }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_REJECTED', targetType: 'SPACE', targetId: spaceId,
        reason: req.body?.reason, payload: { ownerId }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // Soft "please upload this document" request — notifies the owner, no status change.
  requestSpaceDocument: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const { documentLabel, message } = req.body ?? {};
      const result = await adminService.requestSpaceDocument(spaceId, documentLabel, message);
      const ownerId = (result as any)?.ownerId;
      // Reuse the realtime notification channel so the owner sees it live.
      emitToAdmin('spaces', 'space:updated', { spaceId });
      await logEvent('INFO', 'spaces', `Document requested for space ${spaceId}`, { documentLabel, message }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_DOC_REQUESTED', targetType: 'SPACE', targetId: spaceId,
        reason: message, payload: { documentLabel }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  blockSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const result = await adminService.blockSpace(spaceId);
      const ownerId = (result as any)?.space?.ownerId ?? (result as any)?.ownerId;
      if (ownerId) emitToUser(ownerId, 'space:status', { spaceId, status: 'BLOCKED' });
      emitToAdmin('spaces', 'space:updated', { spaceId, status: 'BLOCKED' });
      await logEvent('WARN', 'spaces', `Space ${spaceId} blocked`, { ownerId }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_BLOCKED', targetType: 'SPACE', targetId: spaceId,
        reason: req.body?.reason, payload: { ownerId }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getSpaceForAdmin: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      if (Number.isNaN(spaceId)) return res.status(400).json({ error: 'Invalid space id' });
      const result = await adminService.getSpaceForAdmin(spaceId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  unblockSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const result = await adminService.unblockSpace(spaceId);
      const ownerId = (result as any)?.space?.ownerId ?? (result as any)?.ownerId;
      if (ownerId) emitToUser(ownerId, 'space:status', { spaceId, status: 'VERIFIED' });
      emitToAdmin('spaces', 'space:updated', { spaceId, status: 'VERIFIED' });
      await logEvent('INFO', 'spaces', `Space ${spaceId} unblocked`, { ownerId }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_UNBLOCKED', targetType: 'SPACE', targetId: spaceId,
        payload: { ownerId }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listBookings: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listBookings(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getBookingDetails: async (req: Request, res: Response) => {
    try {
      const result = await adminService.getBookingDetails(req.params.id);
      res.json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Booking not found') return sendError(res, NotFound(msg, ErrorCode.BOOKING_NOT_FOUND));
      sendError(res, error);
    }
  },

  createBookingDispute: async (req: Request, res: Response) => {
    try {
      const { issueType, adminNotes, action } = req.body;
      const bookingId = req.params.id;

      if (!issueType || !adminNotes || !action) {
        return res.status(400).json({ success: false, error: 'issueType, adminNotes, and action are required' });
      }

      const validActions = ['warn_parker', 'warn_owner', 'refund', 'escalate'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ success: false, error: `action must be one of: ${validActions.join(', ')}` });
      }

      // Verify booking exists
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          parkerId: true,
        },
      });
      if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      // Map dispute action to AbuseReport status
      const statusMap: Record<string, string> = {
        warn_parker: 'WARNING_ISSUED',
        warn_owner: 'WARNING_ISSUED',
        refund: 'RESOLVED',
        escalate: 'INVESTIGATING',
      };

      // Create an abuse report record tied to the booking's parker
      const report = await db.abuseReport.create({
        data: {
          reportedUserId: booking.parkerId,
          reportedByUserId: (req as any).user?.id ?? null,
          abuseType: issueType,
          description: `[Admin Dispute — Booking ${bookingId}] ${adminNotes}`,
          evidenceUrls: [],
          status: statusMap[action] ?? 'INVESTIGATING',
          adminAction: `${action.toUpperCase()} — ${adminNotes}`,
        },
      });

      await auditService.logAdminAction({
        adminId: (req as any).user?.id,
        action: 'BOOKING_DISPUTE',
        targetType: 'BOOKING',
        targetId: booking.id,
        reason: `${action}: ${adminNotes}`,
        payload: { issueType, action },
        req,
      });

      res.json({ success: true, report });
    } catch (error) {
      sendError(res, error);
    }
  },

  listTransactions: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listTransactions(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listSubscriptions: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listSubscriptions(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listSupportTickets: async (req: Request, res: Response) => {
    try {
      // Pass the current admin id so the "My Tickets" filter resolves to them.
      const result = await adminService.listSupportTickets({ ...req.query, adminId: req.user?.id });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getAnalyticsOverview: async (req: Request, res: Response) => {
    try {
      const range = typeof req.query.range === 'string' ? req.query.range : undefined;
      const result = await adminService.getAnalyticsOverview(range);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getSidebarCounts: async (_req: Request, res: Response) => {
    try {
      const result = await adminService.getSidebarCounts();
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  broadcastNotification: async (req: Request, res: Response) => {
    try {
      const result = await adminService.broadcastNotification(req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listSubscriptionPlans: async (_req: Request, res: Response) => {
    try {
      const result = await adminService.listSubscriptionPlans();
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  updateSubscriptionPlan: async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const result = await adminService.updateSubscriptionPlan(planId, req.body);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SUBSCRIPTION_PLAN_UPDATED', targetType: 'SUBSCRIPTION_PLAN',
        // Audit the old→new diff (e.g. price ₹499 → ₹599), not just the raw body.
        targetId: planId, payload: { changes: (result as any)?.changes ?? {} }, req,
      });
      // Real-time ping to active subscribers of this plan when price changed
      const notifiedUserIds = (result as any)?.notifiedUserIds as number[] | undefined;
      if ((result as any)?.priceChanged && Array.isArray(notifiedUserIds)) {
        notifiedUserIds.forEach((uid) => emitToUser(uid, 'notification:new', { category: 'PAYMENT' }));
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  createSubscriptionPlan: async (req: Request, res: Response) => {
    try {
      const result = await adminService.createSubscriptionPlan(req.body);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SUBSCRIPTION_PLAN_CREATED', targetType: 'SUBSCRIPTION_PLAN',
        targetId: (result as any)?.plan?.id ?? 0, payload: req.body, req,
      });
      // Real-time heads-up to the owners who were notified about the new plan,
      // so their notifications screen / bell badge update live.
      const notifiedUserIds = (result as any)?.notifiedUserIds as number[] | undefined;
      if (Array.isArray(notifiedUserIds)) {
        notifiedUserIds.forEach((uid) => emitToUser(uid, 'notification:new', { category: 'PAYMENT' }));
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getSubscriptionAnalytics: async (_req: Request, res: Response) => {
    try {
      const result = await adminService.getSubscriptionAnalytics();
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // ── Admin actions on an individual subscription ──────────────────────────
  getSubscriptionDetail: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid subscription id' });
      const result = await adminService.getSubscriptionDetail(id);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  suspendSubscription: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid subscription id' });
      const reason = req.body?.reason ? String(req.body.reason) : undefined;
      const result = await adminService.suspendSubscription(id, reason);
      const userId = (result as any)?.subscription?.userId;
      if (userId) emitToUser(userId, 'subscription:updated', { status: 'SUSPENDED' });
      emitToAdmin('payments', 'subscription:updated', { id });
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SUBSCRIPTION_SUSPENDED', targetType: 'SUBSCRIPTION', targetId: id, reason, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  reactivateSubscription: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid subscription id' });
      const result = await adminService.reactivateSubscription(id);
      const userId = (result as any)?.subscription?.userId;
      if (userId) emitToUser(userId, 'subscription:updated', { status: 'ACTIVE' });
      emitToAdmin('payments', 'subscription:updated', { id });
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SUBSCRIPTION_REACTIVATED', targetType: 'SUBSCRIPTION', targetId: id, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  extendSubscription: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid subscription id' });
      const days = parseInt(req.body?.days);
      const result = await adminService.extendSubscription(id, days);
      const userId = (result as any)?.subscription?.userId;
      if (userId) emitToUser(userId, 'subscription:updated', { extended: days });
      emitToAdmin('payments', 'subscription:updated', { id });
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SUBSCRIPTION_EXTENDED', targetType: 'SUBSCRIPTION', targetId: id, payload: { days }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  forceCancelSubscription: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid subscription id' });
      const reason = req.body?.reason ? String(req.body.reason) : undefined;
      const result = await adminService.forceCancelSubscription(id, reason);
      const userId = (result as any)?.subscription?.userId;
      if (userId) emitToUser(userId, 'subscription:updated', { status: 'CANCELLED' });
      emitToAdmin('payments', 'subscription:updated', { id });
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SUBSCRIPTION_FORCE_CANCELLED', targetType: 'SUBSCRIPTION', targetId: id, reason, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getPaymentsOverview: async (_req: Request, res: Response) => {
    try {
      const result = await adminService.getPaymentsOverview();
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  processPayouts: async (req: Request, res: Response) => {
    try {
      const result = await adminService.processPayouts();
      const userIds: number[] = (result as any).userIds || [];
      userIds.forEach((uid) => emitToUser(uid, 'transaction:update', { event: 'payout_processed' }));
      emitToAdmin('payments', 'payments:updated', { event: 'payouts_processed', count: (result as any).processed });
      await logEvent('SUCCESS', 'payments', `Processed ${(result as any).processed} payouts`, {}, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'PAYOUTS_PROCESSED', targetType: 'PAYOUT', targetId: 'batch',
        payload: { processed: (result as any).processed, userIds }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  createPayout: async (req: Request, res: Response) => {
    try {
      const result = await adminService.createPayout(req.body);
      if (req.body?.userId) emitToUser(req.body.userId, 'transaction:update', { event: 'payout_created', transaction: (result as any).transaction });
      emitToAdmin('payments', 'payments:updated', { event: 'payout_created' });
      await logEvent('INFO', 'payments', 'Manual payout created', { amount: req.body?.amount, userId: req.body?.userId }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'PAYOUT_CREATED', targetType: 'PAYOUT',
        targetId: req.body?.userId ?? 'inline',
        payload: { amount: req.body?.amount, userId: req.body?.userId }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getSupportTicket: async (req: Request, res: Response) => {
    try {
      const result = await adminService.getSupportTicket(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Ticket not found') return sendError(res, NotFound(msg));
      sendError(res, error);
    }
  },

  updateSupportTicket: async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      const result = await adminService.updateSupportTicket(ticketId, req.body);
      // Per-ticket room → the user (and admin) viewing this ticket update live.
      emitTicketEvent('support:status', ticketId, { ticketId, status: result.ticket.status, priority: result.ticket.priority });
      // Admin room → sidebar badge / list refresh.
      emitToAdmin('support', 'support:updated', { ticketId, status: result.ticket.status });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  addSupportTicketReply: async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      const result = await adminService.addSupportTicketReply(
        ticketId,
        req.user?.id,
        req.body?.message ?? ''
      );
      emitTicketEvent('support:reply', ticketId, { ticketId, reply: result.reply });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // Assign / unassign a ticket. Body { adminId } — adminId 'me' assigns to caller,
  // null/absent unassigns, a number assigns to that admin.
  assignSupportTicket: async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      if (Number.isNaN(ticketId)) return res.status(400).json({ error: 'Invalid ticket id' });
      const raw = req.body?.adminId;
      let adminId: number | null;
      if (raw === 'me') adminId = req.user?.id ?? null;
      else if (raw == null) adminId = null;
      else {
        adminId = Number(raw);
        if (!Number.isInteger(adminId)) return res.status(400).json({ error: 'Invalid adminId' });
      }
      const result = await adminService.assignSupportTicket(ticketId, adminId);
      emitToAdmin('support', 'support:updated', { ticketId, assignedTo: result.ticket.assignedTo });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  exportTransactions: async (req: Request, res: Response) => {
    try {
      const csv = await adminService.exportTransactionsCsv({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      sendError(res, error);
    }
  },

  exportUsers: async (_req: Request, res: Response) => {
    try {
      const csv = await adminExportService.usersCsv();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      sendError(res, error);
    }
  },

  exportBookings: async (req: Request, res: Response) => {
    try {
      const csv = await adminExportService.bookingsCsv({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      sendError(res, error);
    }
  },

  exportLogs: async (req: Request, res: Response) => {
    try {
      const csv = await adminExportService.logsCsv({
        level: req.query.level as string,
        source: req.query.source as string,
        search: req.query.search as string,
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="system-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      sendError(res, error);
    }
  },

  getTransactionDetails: async (req: Request, res: Response) => {
    try {
      const result = await adminService.getTransactionDetails(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Transaction not found') return sendError(res, NotFound(msg, ErrorCode.TRANSACTION_NOT_FOUND));
      sendError(res, error);
    }
  },

  refundTransaction: async (req: Request, res: Response) => {
    try {
      const txnId = parseInt(req.params.id);
      const result = await adminService.refundTransaction(txnId, req.body || {});
      const refund = (result as any).refund;
      if (refund?.userId) {
        emitToUser(refund.userId, 'transaction:update', { event: 'refund', refund });
        await adminService.notifyUser(refund.userId, {
          title: 'Refund Issued',
          message: `A refund of ₹${Math.abs(refund.amount).toLocaleString('en-IN')} has been credited.`,
          category: 'PAYMENT',
          metadata: { refundTxnNumber: refund.txnNumber, originalTxnId: txnId },
        });
      }
      emitToAdmin('payments', 'payments:updated', { event: 'refund', refund });
      await logEvent('SUCCESS', 'payments', `Refund issued for txn ${txnId}`, { refundTxnNumber: refund?.txnNumber }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'REFUND_ISSUED', targetType: 'TRANSACTION', targetId: txnId,
        reason: req.body?.reason, payload: { amount: refund?.amount, refundTxnNumber: refund?.txnNumber }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  updateTransactionStatus: async (req: Request, res: Response) => {
    try {
      const txnId = parseInt(req.params.id);
      const result = await adminService.updateTransactionStatus(txnId, req.body?.status);
      const txn = (result as any).transaction;
      if (txn?.userId) emitToUser(txn.userId, 'transaction:update', { event: 'status_changed', transaction: txn });
      emitToAdmin('payments', 'payments:updated', { event: 'status_changed', transaction: txn });
      await logEvent('INFO', 'payments', `Transaction ${txnId} status -> ${req.body?.status}`, {}, req.user?.id);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // ── Communications ────────────────────────────────────────────────
  sendBroadcast: async (req: Request, res: Response) => {
    try {
      const result = await adminService.broadcastNotification(req.body || {});
      // Push to each recipient room
      if ((result as any).sent > 0) {
        const audience = (req.body?.audience || 'ALL') as 'ALL' | 'PARKERS' | 'OWNERS';
        const where: any = { status: 'ACTIVE' };
        if (audience === 'PARKERS') where.role = 'PARKER';
        else if (audience === 'OWNERS') where.role = 'OWNER';
        // We already wrote DB rows; emit a generic notify event so mobile refreshes its inbox
        const users = await db.user.findMany({ where, select: { id: true } });
        users.forEach((u: any) => emitToUser(u.id, 'notification:new', { title: req.body?.title, message: req.body?.message }));
      }
      await logEvent('INFO', 'notifications', `Broadcast sent to ${(result as any).sent} users`, { audience: req.body?.audience }, req.user?.id);
      // Live-refresh the admin Communications page (it listens for broadcast:new
      // on the users admin room, which every admin joins via admin:join).
      emitToAdmin('users', 'broadcast:new', { title: req.body?.title, sent: (result as any).sent });
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'BROADCAST_SENT', targetType: 'BROADCAST',
        targetId: (result as any)?.broadcastId ?? 'inline',
        payload: { audience: req.body?.audience, title: req.body?.title, recipients: (result as any).sent }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listBroadcastHistory: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listBroadcastHistory(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // ── System logs ───────────────────────────────────────────────────
  listSystemLogs: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listSystemLogs(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // ── Admin audit logs ──────────────────────────────────────────────
  listAuditLogs: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listAuditLogs({
        action: req.query.action as string,
        targetType: req.query.targetType as string,
        search: req.query.search as string,
        from: (req.query.startDate ?? req.query.from) as string,
        to: (req.query.endDate ?? req.query.to) as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  exportAuditLogs: async (req: Request, res: Response) => {
    try {
      const { logs } = await adminService.listAuditLogs({
        action: req.query.action as string,
        targetType: req.query.targetType as string,
        search: req.query.search as string,
        from: (req.query.startDate ?? req.query.from) as string,
        to: (req.query.endDate ?? req.query.to) as string,
        page: 1,
        limit: 10000,
      });
      const esc = (v: any) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ['id', 'timestamp', 'adminId', 'adminEmail', 'action', 'targetType', 'targetId', 'reason', 'metadata', 'ipAddress'];
      const rows = (logs as any[]).map((l) => [
        l.id,
        l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp,
        l.adminId ?? '',
        l.admin?.email ?? '',
        l.action,
        l.targetType,
        l.targetId,
        l.reason ?? '',
        l.payload ? JSON.stringify(l.payload) : '',
        l.ipAddress ?? '',
      ].map(esc).join(','));
      const csv = [header.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="admin-audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      sendError(res, error);
    }
  },

  // ── Legal documents ───────────────────────────────────────────────
  listLegalDocuments: async (_req: Request, res: Response) => {
    try {
      const result = await adminService.listLegalDocuments();
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  upsertLegalDocument: async (req: Request, res: Response) => {
    try {
      const result = await adminService.upsertLegalDocument(req.params.slug, req.body || {});
      await logEvent('INFO', 'admin', `Legal doc ${req.params.slug} updated`, { version: req.body?.version }, req.user?.id);
      // Live-refresh the admin Legal page (listens on the moderation admin room).
      emitToAdmin('moderation', 'legal:update', { slug: req.params.slug });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listComplianceLogs: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listComplianceLogs(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  updateComplianceLog: async (req: Request, res: Response) => {
    try {
      const result = await adminService.updateComplianceLog(parseInt(req.params.id), req.body?.status, req.body?.notes);
      // Live-refresh the admin Legal/Compliance page (moderation admin room).
      emitToAdmin('moderation', 'compliance:update', { id: parseInt(req.params.id), status: req.body?.status });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // ── Case Evidence (legal review bundle) ────────────────────────────
  getCaseEvidence: async (req: Request, res: Response) => {
    try {
      const result = await caseEvidenceService.getBookingEvidence(req.params.bookingId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listCases: async (req: Request, res: Response) => {
    try {
      const { search, from, to, flagged, status, page, limit } = req.query;
      const result = await caseEvidenceService.listCases({
        search: search as string,
        from: from as string,
        to: to as string,
        flagged: flagged === 'true' || flagged === '1',
        status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
