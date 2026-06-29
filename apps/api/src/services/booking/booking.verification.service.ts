import { Request } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { auditService } from '../audit.service';
import { storageService } from '../storage.service';
import { BUCKETS } from '../../config/supabase';
import { redis } from '../../config/redis';

// Arrival-OTP brute-force lock: N wrong guesses on a booking → short lockout.
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_SECONDS = 15 * 60; // 15 minutes
const otpAttemptKey = (bookingId: string) => `session_otp_attempts:${bookingId}`;

export const bookingVerificationService = {
  generateSessionOtp: async (bookingId: string, userId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: { select: { ownerId: true } },
        parker: { select: { firstName: true, lastName: true } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.parkerId !== userId) throw new AppError('Only the parker can generate the arrival OTP', 403);
    if (booking.status !== 'APPROVED') throw new AppError('OTP can only be generated for approved bookings', 400);

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    await db.booking.update({ where: { id: bookingId }, data: { sessionOtp: otp } });
    await auditService.logBookingEvent({
      bookingId, event: 'OTP_GENERATED', fromStatus: booking.status, toStatus: booking.status,
      actorId: userId, actorRole: 'PARKER', req,
    });
    const parkerName = (booking as any).parker?.firstName
      ? `${(booking as any).parker.firstName} ${(booking as any).parker.lastName || ''}`.trim()
      : null;
    return { success: true, otp, bookingId, ownerId: (booking.space as any)?.ownerId ?? null, parkerName };
  },

  verifySessionOtp: async (bookingId: string, data: any, userId?: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    // The OWNER enters the OTP the parker shows them on-site.
    if (userId != null && (booking.space as any)?.ownerId !== userId) {
      throw new AppError('Only the space owner can verify the arrival OTP', 403);
    }
    // Status guard: an OTP only starts a session for an APPROVED booking — never
    // drive a CANCELLED/EXPIRED/already-ACTIVE booking to ACTIVE via a stale code.
    if (booking.status !== 'APPROVED') {
      throw new AppError('This booking is no longer awaiting arrival verification.', 400);
    }
    if (!booking.sessionOtp) throw new AppError('The parker has not generated an OTP yet.', 400);

    // Brute-force lock: too many wrong guesses on this booking → temporary lockout.
    // Fail CLOSED — if Redis is unreachable we cannot verify the attempt count, so
    // we refuse rather than silently disabling the lock (which would read 0).
    const key = otpAttemptKey(bookingId);
    let attempts: number;
    try {
      attempts = parseInt((await redis.get(key)) ?? '0', 10);
    } catch {
      throw new AppError('Verification is temporarily unavailable. Please try again shortly.', 503);
    }
    if (attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError('Too many incorrect OTP attempts. Please wait a few minutes before trying again.', 429);
    }

    if (booking.sessionOtp !== String(data.otp)) {
      const next = attempts + 1;
      await redis.set(key, String(next), 'EX', OTP_LOCK_SECONDS).catch(() => {});
      const remaining = Math.max(0, OTP_MAX_ATTEMPTS - next);
      throw new AppError(
        `Invalid OTP. ${remaining > 0 ? `${remaining} attempt${remaining === 1 ? '' : 's'} left.` : 'Please wait before retrying.'}`,
        400,
      );
    }

    // Success — clear the attempt counter.
    await redis.del(key).catch(() => {});
    // Atomic transition guarded on APPROVED so a concurrent cancel/duplicate
    // verify can't drive an already-moved booking to ACTIVE.
    const res = await db.booking.updateMany({
      where: { id: bookingId, status: 'APPROVED' },
      data: { status: 'ACTIVE', sessionStartedAt: new Date(), sessionOtp: null },
    });
    if (res.count === 0) throw new AppError('This booking is no longer awaiting arrival verification.', 409);
    const updated = await db.booking.findUnique({ where: { id: bookingId } });
    await auditService.logBookingEvent({
      bookingId, event: 'SESSION_STARTED', fromStatus: booking.status, toStatus: 'ACTIVE',
      actorId: userId ?? booking.parkerId, actorRole: 'OWNER', req,
    });
    return { success: true, booking: updated };
  },

  submitVerification: async (bookingId: string, ownerId: number, data: any, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if ((booking.space as any)?.ownerId !== ownerId) {
      throw new AppError('Only the space owner can submit verification', 403);
    }

    const verificationType = data?.verificationType === 'PHOTO_VIDEO' ? 'PHOTO_VIDEO' : 'NO_CONCERN';
    const mediaUrls: string[] = Array.isArray(data?.mediaUrls) ? data.mediaUrls : [];

    // The parker must explicitly review and accept the recorded condition in
    // BOTH cases (no-damage and damage), so we always start unaccepted and wait
    // for their "Accept & Continue". This keeps a clear, auditable consent that
    // they saw what the owner recorded before the session began.
    const verification = await db.conditionVerification.upsert({
      where: { bookingId },
      create: { bookingId, verificationType, mediaUrls, parkerAccepted: false, acceptedAt: null },
      update: { verificationType, mediaUrls, parkerAccepted: false, acceptedAt: null },
    });

    await auditService.logBookingEvent({
      bookingId, event: 'VERIFICATION_SUBMITTED', actorId: ownerId, actorRole: 'OWNER', req,
    });
    return { success: true, verification, parkerId: booking.parkerId, requiresAcknowledgement: true };
  },

  acceptVerification: async (bookingId: string, parkerId: number, req?: Request) => {
    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.parkerId !== parkerId) throw new AppError('Only the parker can accept verification', 403);

    // Mark the damage record acknowledged. This does NOT start the session —
    // the OTP step (verify-otp) is the sole gate that moves status to ACTIVE.
    await db.conditionVerification.updateMany({
      where: { bookingId },
      data: { parkerAccepted: true, acceptedAt: new Date() },
    });
    await auditService.logBookingEvent({
      bookingId, event: 'VERIFICATION_ACCEPTED', fromStatus: booking.status, toStatus: booking.status,
      actorId: parkerId, actorRole: 'PARKER', req,
    });
    return { success: true, acknowledged: true };
  },

  getVerification: async (bookingId: string, requestorId: number, requestorRole: string) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true } }, verification: true },
    });
    if (!booking) throw new AppError('Booking not found', 404);

    const isParker = booking.parkerId === requestorId;
    const isOwner = (booking.space as any)?.ownerId === requestorId;
    if (!isParker && !isOwner && requestorRole !== 'ADMIN') throw new AppError('Forbidden', 403);

    const v = (booking as any).verification;
    // Damage photos are stored as KEYS, not URLs. Resolve each to a short-lived
    // signed URL so the client can display the image.
    const rawMedia: string[] = Array.isArray(v?.mediaUrls) ? v.mediaUrls : [];
    const mediaUrls = await Promise.all(
      rawMedia.map((u) => storageService.resolveUrl(u, BUCKETS.PRIVATE).catch(() => u)),
    );
    return {
      success: true,
      verification: v
        ? {
            type: v.verificationType,
            mediaUrls,
            parkerAcknowledged: v.parkerAccepted,
            acceptedAt: v.acceptedAt,
          }
        : null,
    };
  },

  // Ownership gate for consent records: only the booking's parker, the space
  // owner, or an admin may touch a booking's consent. Prevents IDOR on these
  // legal/PII evidence records by guessing booking IDs.
  assertConsentAccess: async (bookingId: string, requester: { id: number; role?: string }) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { parkerId: true, space: { select: { ownerId: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    const allowed =
      requester.role === 'ADMIN' ||
      booking.parkerId === requester.id ||
      booking.space?.ownerId === requester.id;
    if (!allowed) throw new AppError('You do not have access to this booking', 403);
  },

  recordBookingConsent: async (bookingId: string, data: any) => {
    const consent = await db.bookingConsent.upsert({
      where: { bookingId },
      create: {
        bookingId,
        userId: data.userId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        tcVersion: data.tcVersion ?? null,
        verifiedSurroundings: data.verifiedSurroundings,
        acceptLocalParkingRules: data.acceptLocalParkingRules,
        acceptFineResponsibility: data.acceptFineResponsibility,
        acceptPlatformDisclaimer: data.acceptPlatformDisclaimer,
        acceptParkingTerms: data.acceptParkingTerms,
        platform: data.platform,
        appVersion: data.appVersion,
      },
      update: {
        // Identity fields are intentionally NOT overwritten on update —
        // the original consent identity must remain immutable as evidence.
        verifiedSurroundings: data.verifiedSurroundings,
        acceptLocalParkingRules: data.acceptLocalParkingRules,
        acceptFineResponsibility: data.acceptFineResponsibility,
        acceptPlatformDisclaimer: data.acceptPlatformDisclaimer,
        acceptParkingTerms: data.acceptParkingTerms,
      },
    });
    return { success: true, consent };
  },

  getBookingConsent: async (bookingId: string) => {
    const consent = await db.bookingConsent.findUnique({ where: { bookingId } });
    if (!consent) throw new AppError('Booking consent not found', 404);
    return { success: true, consent };
  },
};
