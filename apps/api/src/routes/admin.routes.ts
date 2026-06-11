import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { settingsController } from '../controllers/settings.controller';
import { documentController } from '../controllers/document.controller';
import { abuseController } from '../controllers/abuse.controller';
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
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/suspend', validate(suspendUserSchema), adminController.suspendUser);
router.put('/users/:id/unsuspend', adminController.unsuspendUser);
router.put('/users/:id/ban', validate(banUserSchema), adminController.banUser);
router.delete('/users/:id', validate(deleteUserSchema), adminController.deleteUser);

// ─── Spaces ──────────────────────────────────────────────────────────
router.get('/spaces', adminController.listSpaces);
router.put('/spaces/:id/approve', adminController.approveSpace);
router.put('/spaces/:id/reject', validate(rejectSpaceSchema), adminController.rejectSpace);
router.put('/spaces/:id/block', validate(blockSpaceSchema), adminController.blockSpace);
router.get('/spaces/:id/documents', documentController.adminListForSpace);
router.put('/spaces/:id/documents/:docId/verify', validate(verifyDocumentSchema), documentController.adminVerify);

// ─── Bookings ────────────────────────────────────────────────────────
router.get('/bookings', adminController.listBookings);
router.get('/bookings/:id', adminController.getBookingDetails);

// ─── Subscriptions (ParkSwift's only revenue source) ────────────────
router.get('/subscriptions', adminController.listSubscriptions);
router.get('/subscription-plans', adminController.listSubscriptionPlans);
router.post('/subscription-plans', validate(createSubscriptionPlanSchema), adminController.createSubscriptionPlan);
router.put('/subscription-plans/:id', validate(updateSubscriptionPlanSchema), adminController.updateSubscriptionPlan);

// ─── Abuse reports ───────────────────────────────────────────────────
router.get('/abuse-reports', abuseController.listAbuseReports);
router.get('/abuse-reports/:id', abuseController.getAbuseReport);
router.put('/abuse-reports/:id/action', validate(actionAbuseReportSchema), abuseController.actionAbuseReport);

// ─── Case evidence (read-only) ───────────────────────────────────────
router.get('/cases', adminController.listCases);
router.get('/cases/:bookingId/evidence', adminController.getCaseEvidence);

// ─── Support ─────────────────────────────────────────────────────────
router.get('/support', adminController.listSupportTickets);
router.get('/support/:id', adminController.getSupportTicket);
router.put('/support/:id', validate(updateSupportTicketSchema), adminController.updateSupportTicket);
router.post('/support/:id/reply', validate(replyTicketSchema), adminController.addSupportTicketReply);

// ─── Analytics & settings ────────────────────────────────────────────
router.get('/analytics/overview', adminController.getAnalyticsOverview);
router.get('/sidebar-counts', adminController.getSidebarCounts);
router.get('/settings', settingsController.getSettings);
router.put('/settings', validate(updateSettingsSchema), settingsController.updateSettings);

// ─── Communications ──────────────────────────────────────────────────
router.post('/communications/notify', validate(sendBroadcastSchema), adminController.sendBroadcast);
router.get('/communications/history', adminController.listBroadcastHistory);

// ─── System & legal ──────────────────────────────────────────────────
router.get('/system-logs', adminController.listSystemLogs);
router.get('/legal/documents', adminController.listLegalDocuments);
router.put('/legal/documents/:slug', adminController.upsertLegalDocument);
router.get('/legal/compliance', adminController.listComplianceLogs);
router.put('/legal/compliance/:id', adminController.updateComplianceLog);

export default router;
