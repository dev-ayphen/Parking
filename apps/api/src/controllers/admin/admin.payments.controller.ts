import { Request, Response } from 'express';
import { adminService } from '../../services/admin.service';
import { adminExportService } from '../../services/adminExport.service';
import { emitToUser, emitToAdmin } from '../../app';
import { logEvent } from '../../services/log.service';
import { auditService } from '../../services/audit.service';
import { db } from '../../config/database';
import { sendError, NotFound } from '../../utils/errors';
import { ErrorCode } from '../../utils/errorCodes';

export const adminPaymentsController = {
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
      const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { id: true, parkerId: true } });
      if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
      const statusMap: Record<string, string> = {
        warn_parker: 'WARNING_ISSUED', warn_owner: 'WARNING_ISSUED', refund: 'RESOLVED', escalate: 'INVESTIGATING',
      };
      const report = await db.abuseReport.create({
        data: {
          reportedUserId: booking.parkerId,
          reportedByUserId: req.user?.id ?? null,
          abuseType: issueType,
          description: `[Admin Dispute — Booking ${bookingId}] ${adminNotes}`,
          evidenceUrls: [],
          status: statusMap[action] ?? 'INVESTIGATING',
          adminAction: `${action.toUpperCase()} — ${adminNotes}`,
        },
      });
      await auditService.logAdminAction({
        adminId: req.user!.id, action: 'BOOKING_DISPUTE', targetType: 'BOOKING',
        targetId: booking.id, reason: `${action}: ${adminNotes}`, payload: { issueType, action }, req,
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
        targetId: planId, payload: { changes: (result as any)?.changes ?? {} }, req,
      });
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
        targetId: req.body?.userId ?? 'inline', payload: { amount: req.body?.amount, userId: req.body?.userId }, req,
      });
      res.json(result);
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
};
