import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { settingsController } from '../controllers/settings.controller';
import { documentController } from '../controllers/document.controller';
import { abuseController } from '../controllers/abuse.controller';
import { ratingAdminController } from '../controllers/ratingAdmin.controller';
import { vehicleController } from '../controllers/vehicle.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  suspendUserSchema,
  banUserSchema,
  deleteUserSchema,
  rejectSpaceSchema,
  blockSpaceSchema,
  verifyDocumentSchema,
  updateSupportTicketSchema,
  replyTicketSchema,
  refundTransactionSchema,
  updateTransactionStatusSchema,
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
  sendBroadcastSchema,
  actionAbuseReportSchema,
  updateSettingsSchema,
} from '../validations/admin.validation';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

// ─── Users ───────────────────────────────────────────────────────────
router.get('/users', adminController.listUsers);
router.get('/users/export', adminController.exportUsers); // before :id
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/suspend', validate(suspendUserSchema), adminController.suspendUser);
router.put('/users/:id/unsuspend', adminController.unsuspendUser);
router.put('/users/:id/ban', validate(banUserSchema), adminController.banUser);
router.delete('/users/:id', validate(deleteUserSchema), adminController.deleteUser);

// ─── Spaces ──────────────────────────────────────────────────────────
router.get('/spaces', adminController.listSpaces);
router.get('/spaces/:id', adminController.getSpaceForAdmin);
router.put('/spaces/:id/approve', adminController.approveSpace);
router.put('/spaces/:id/reject', validate(rejectSpaceSchema), adminController.rejectSpace);
router.put('/spaces/:id/request-document', adminController.requestSpaceDocument);
router.put('/spaces/:id/block', validate(blockSpaceSchema), adminController.blockSpace);
router.put('/spaces/:id/unblock', adminController.unblockSpace);
router.get('/spaces/:id/documents', documentController.adminListForSpace);
router.put('/spaces/:id/documents/:docId/verify', validate(verifyDocumentSchema), documentController.adminVerify);

// ─── Bookings ────────────────────────────────────────────────────────
router.get('/bookings', adminController.listBookings);
router.get('/bookings/export', adminController.exportBookings); // before :id
router.get('/bookings/:id', adminController.getBookingDetails);

// ─── Subscriptions (ParkSwift's only revenue source) ────────────────
router.get('/subscriptions/analytics', adminController.getSubscriptionAnalytics);
router.get('/subscriptions', adminController.listSubscriptions);
router.get('/subscription-plans', adminController.listSubscriptionPlans);
router.post('/subscription-plans', validate(createSubscriptionPlanSchema), adminController.createSubscriptionPlan);
router.put('/subscription-plans/:id', validate(updateSubscriptionPlanSchema), adminController.updateSubscriptionPlan);
// Per-subscription admin actions
router.get('/subscriptions/:id', adminController.getSubscriptionDetail);
router.put('/subscriptions/:id/suspend', adminController.suspendSubscription);
router.put('/subscriptions/:id/reactivate', adminController.reactivateSubscription);
router.put('/subscriptions/:id/extend', adminController.extendSubscription);
router.put('/subscriptions/:id/force-cancel', adminController.forceCancelSubscription);

// ─── Payments & transactions ─────────────────────────────────────────
router.get('/transactions', adminController.listTransactions);
router.get('/transactions/:id', adminController.getTransactionDetails);
router.post('/transactions/:id/refund', validate(refundTransactionSchema), adminController.refundTransaction);
router.put('/transactions/:id/status', validate(updateTransactionStatusSchema), adminController.updateTransactionStatus);
router.get('/payments/overview', adminController.getPaymentsOverview);
router.post('/payments/process-payouts', adminController.processPayouts);
router.post('/payments/payout', adminController.createPayout);
router.get('/payments/export', adminController.exportTransactions);

// ─── Abuse reports ───────────────────────────────────────────────────
router.get('/abuse-reports', abuseController.listAbuseReports);
router.get('/abuse-reports/:id', abuseController.getAbuseReport);
router.put('/abuse-reports/:id/action', validate(actionAbuseReportSchema), abuseController.actionAbuseReport);

// Review moderation — list + soft hide/unhide (never delete)
router.get('/reviews', ratingAdminController.listReviews);
router.put('/reviews/:id/hide', ratingAdminController.hideReview);
router.put('/reviews/:id/unhide', ratingAdminController.unhideReview);

// ─── Case evidence (read-only) ───────────────────────────────────────
router.get('/cases', adminController.listCases);
router.get('/cases/:bookingId/evidence', adminController.getCaseEvidence);

// ─── Support ─────────────────────────────────────────────────────────
router.get('/support', adminController.listSupportTickets);
router.get('/support/:id', adminController.getSupportTicket);
router.put('/support/:id', validate(updateSupportTicketSchema), adminController.updateSupportTicket);
router.post('/support/:id/reply', validate(replyTicketSchema), adminController.addSupportTicketReply);
router.put('/support/:id/assign', adminController.assignSupportTicket);

// ─── Analytics & settings ────────────────────────────────────────────
router.get('/analytics/overview', adminController.getAnalyticsOverview);
router.get('/sidebar-counts', adminController.getSidebarCounts);
router.get('/settings', settingsController.getSettings);
router.put('/settings', validate(updateSettingsSchema), settingsController.updateSettings);

// ─── Communications ──────────────────────────────────────────────────
router.post('/communications/notify', validate(sendBroadcastSchema), adminController.sendBroadcast);
router.get('/communications/history', adminController.listBroadcastHistory);

// ─── Vehicle RC book (admin view of private docs) ────────────────────
router.get('/vehicles/:id/rcbook-url', vehicleController.getRcBookUrl);

// ─── System & legal ──────────────────────────────────────────────────
router.get('/system-logs', adminController.listSystemLogs);
router.get('/system-logs/export', adminController.exportLogs);
router.get('/legal/documents', adminController.listLegalDocuments);
router.put('/legal/documents/:slug', adminController.upsertLegalDocument);
router.get('/legal/compliance', adminController.listComplianceLogs);
router.put('/legal/compliance/:id', adminController.updateComplianceLog);

export default router;
