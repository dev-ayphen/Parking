import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { db } from '../config/database';
import { getRequestIdentity } from '../utils/requestIdentity';

// ─── Strongly-typed event names (append-only contract) ──────────────────────

export type BookingEvent =
  | 'BOOKING_CREATED'
  | 'BOOKING_APPROVED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED'
  | 'SESSION_STARTED'
  | 'SESSION_LEAVING'
  | 'SESSION_ENDED'
  | 'VERIFICATION_SUBMITTED'
  | 'VERIFICATION_ACCEPTED'
  | 'PARKER_ARRIVED'
  | 'ETA_UPDATED'
  | 'OTP_GENERATED'
  | 'PARKER_MARKED_PAID'
  | 'BOOKING_EXPIRED';

export type ActorRole = 'PARKER' | 'OWNER' | 'ADMIN' | 'SYSTEM';

export type AdminAction =
  | 'SPACE_APPROVED'
  | 'SPACE_REJECTED'
  | 'SPACE_DOC_REQUESTED'
  | 'SPACE_BLOCKED'
  | 'SPACE_UNBLOCKED'
  | 'SPACE_DELETED'
  | 'SPACE_UPDATED'
  | 'USER_MESSAGED'
  | 'USER_SUSPENDED'
  | 'USER_UNSUSPENDED'
  | 'USER_BANNED'
  | 'USER_DELETED'
  | 'DOC_VERIFIED'
  | 'DOC_REJECTED'
  | 'REFUND_ISSUED'
  | 'PAYOUTS_PROCESSED'
  | 'PAYOUT_CREATED'
  | 'ABUSE_ACTIONED'
  | 'REVIEW_HIDDEN'
  | 'REVIEW_RESTORED'
  | 'BROADCAST_SENT'
  | 'SUBSCRIPTION_PLAN_CREATED'
  | 'SUBSCRIPTION_PLAN_UPDATED'
  | 'SUBSCRIPTION_SUSPENDED'
  | 'SUBSCRIPTION_REACTIVATED'
  | 'SUBSCRIPTION_EXTENDED'
  | 'SUBSCRIPTION_FORCE_CANCELLED'
  | 'BOOKING_FORCE_CANCELLED'
  | 'BOOKING_DISPUTE';

export type TargetType =
  | 'USER'
  | 'SPACE'
  | 'BOOKING'
  | 'DOCUMENT'
  | 'TRANSACTION'
  | 'ABUSE_REPORT'
  | 'RATING'
  | 'SUBSCRIPTION_PLAN'
  | 'SUBSCRIPTION'
  | 'PAYOUT'
  | 'BROADCAST';

// ─── Helpers ────────────────────────────────────────────────────────────────

interface BookingEventParams {
  bookingId: string;
  event: BookingEvent;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorId?: number | null;
  actorRole?: ActorRole;
  payload?: Prisma.JsonValue;
  req?: Request;
}

interface AdminActionParams {
  adminId: number;
  action: AdminAction;
  targetType: TargetType;
  targetId: string | number;
  reason?: string | null;
  payload?: Prisma.JsonValue;
  req?: Request;
}

/**
 * Append-only audit log. Never updates. Never deletes.
 * Failures are logged but do NOT throw — audit logging must never break
 * the user-facing operation.
 */
export const auditService = {
  logBookingEvent: async (params: BookingEventParams): Promise<void> => {
    try {
      const identity = params.req ? getRequestIdentity(params.req) : { ipAddress: null, userAgent: null };
      await db.bookingAuditLog.create({
        data: {
          bookingId: params.bookingId,
          event: params.event,
          fromStatus: params.fromStatus ?? null,
          toStatus: params.toStatus ?? null,
          actorId: params.actorId ?? null,
          actorRole: params.actorRole ?? null,
          payload: (params.payload ?? Prisma.JsonNull) as any,
          ipAddress: identity.ipAddress,
          userAgent: identity.userAgent,
        },
      });
    } catch (err) {
      console.error('[AUDIT] logBookingEvent failed', err);
    }
  },

  logAdminAction: async (params: AdminActionParams): Promise<void> => {
    try {
      const identity = params.req ? getRequestIdentity(params.req) : { ipAddress: null, userAgent: null };
      await db.adminActionLog.create({
        data: {
          adminId: params.adminId,
          action: params.action,
          targetType: params.targetType,
          targetId: String(params.targetId),
          reason: params.reason ?? null,
          payload: (params.payload ?? Prisma.JsonNull) as any,
          ipAddress: identity.ipAddress,
          userAgent: identity.userAgent,
        },
      });
    } catch (err) {
      console.error('[AUDIT] logAdminAction failed', err);
    }
  },
};
