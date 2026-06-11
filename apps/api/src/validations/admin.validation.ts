import { z } from 'zod';

// ─── User moderation ────────────────────────────────────────────────
export const suspendUserSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
  durationDays: z.coerce.number().int().min(1).max(365).nullable().optional(),
});

export const banUserSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

export const deleteUserSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// ─── Space moderation ───────────────────────────────────────────────
export const rejectSpaceSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

export const blockSpaceSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

// Document verification (admin)
export const verifyDocumentSchema = z.object({
  action: z.enum(['VERIFIED', 'REJECTED']),
  rejectionReason: z.string().trim().min(3).max(500).optional(),
}).refine(
  (v) => v.action !== 'REJECTED' || (v.rejectionReason && v.rejectionReason.length > 0),
  { message: 'rejectionReason is required when action is REJECTED', path: ['rejectionReason'] }
);

// ─── Support tickets ────────────────────────────────────────────────
export const updateSupportTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  resolutionNote: z.string().trim().max(2000).optional(),
});

export const replyTicketSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

// ─── Transactions ───────────────────────────────────────────────────
export const refundTransactionSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
  amount: z.coerce.number().positive().optional(),
});

export const updateTransactionStatusSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED']),
});

// ─── Subscription plans ─────────────────────────────────────────────
export const createSubscriptionPlanSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
  price: z.coerce.number().nonnegative(),
  yearlyPrice: z.coerce.number().nonnegative().nullable().optional(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  features: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  iconKey: z.string().trim().max(50).optional(),
  colorKey: z.string().trim().max(50).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateSubscriptionPlanSchema = createSubscriptionPlanSchema.partial();

// ─── Broadcast ──────────────────────────────────────────────────────
export const sendBroadcastSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2000),
  audience: z.enum(['ALL', 'PARKERS', 'OWNERS']).optional(),
  category: z.string().trim().max(50).optional(),
  metadata: z.record(z.any()).optional(),
});

// ─── Abuse report action ────────────────────────────────────────────
export const actionAbuseReportSchema = z.object({
  action: z.enum(['WARNING_ISSUED', 'SUSPENDED_TEMP', 'BANNED', 'RESOLVED', 'DISMISSED']),
  adminAction: z.string().trim().min(3).max(500),
  suspendedUntil: z.string().datetime().optional(),
});

// ─── Settings ───────────────────────────────────────────────────────
export const updateSettingsSchema = z.object({
  minHourlyRate: z.coerce.number().positive().optional(),
  maxHourlyRate: z.coerce.number().positive().optional(),
  platformFeePercent: z.coerce.number().min(0).max(100).optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().trim().max(500).optional(),
}).passthrough(); // settings model has many fields; allow others
