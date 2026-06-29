import { Request } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { auditService } from '../audit.service';
import { availabilityAlertService } from '../availabilityAlert.service';
import { computeCharge } from './billing.util';

export const bookingSessionService = {
  // Owner confirms they received the payment (cash or via their UPI QR). ParkSwift
  // does NOT verify the transfer — this is the owner's own confirmation, which
  // flips paymentStatus WAITING → PAID. Only the space owner may call this.
  markPaymentReceived: async (bookingId: string, ownerId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true, name: true } }, parker: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if ((booking.space as any)?.ownerId !== ownerId) {
      throw new AppError('Only the space owner can confirm payment', 403);
    }

    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: 'PAID', paymentReceivedAt: new Date() },
    });
    await auditService.logBookingEvent({
      bookingId, event: 'PAYMENT_RECEIVED', fromStatus: booking.status, toStatus: booking.status,
      actorId: ownerId, actorRole: 'OWNER', req,
    });
    return {
      success: true,
      booking: updated,
      parkerId: (booking.parker as any)?.id ?? booking.parkerId,
      spaceName: (booking.space as any)?.name ?? null,
    };
  },

  acceptBooking: async (bookingId: string, ownerId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if ((booking.space as any)?.ownerId !== ownerId) {
      throw new AppError('Only the space owner can accept bookings', 403);
    }
    if (booking.status !== 'PENDING_APPROVAL') {
      throw new AppError('Booking is not in pending state', 400);
    }
    // Atomic transition: only flips if it's STILL pending. A concurrent
    // accept/cancel that already moved it makes count===0 → 409 instead of a
    // double-write.
    const res = await db.booking.updateMany({
      where: { id: bookingId, status: 'PENDING_APPROVAL' },
      data: { status: 'APPROVED' },
    });
    if (res.count === 0) throw new AppError('Booking was already updated by another action', 409);
    const updated = await db.booking.findUnique({ where: { id: bookingId } });
    await auditService.logBookingEvent({
      bookingId, event: 'BOOKING_APPROVED', fromStatus: booking.status, toStatus: 'APPROVED',
      actorId: ownerId, actorRole: 'OWNER', req,
    });
    return { success: true, booking: updated };
  },

  declineBooking: async (bookingId: string, ownerId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if ((booking.space as any)?.ownerId !== ownerId) {
      throw new AppError('Only the space owner can decline bookings', 403);
    }
    if (!['PENDING_APPROVAL', 'APPROVED'].includes(booking.status)) {
      throw new AppError('Booking cannot be declined in its current state', 400);
    }
    const res = await db.booking.updateMany({
      where: { id: bookingId, status: { in: ['PENDING_APPROVAL', 'APPROVED'] } },
      data: { status: 'REJECTED' },
    });
    if (res.count === 0) throw new AppError('Booking was already updated by another action', 409);
    const updated = await db.booking.findUnique({ where: { id: bookingId } });
    await auditService.logBookingEvent({
      bookingId, event: 'BOOKING_REJECTED', fromStatus: booking.status, toStatus: 'REJECTED',
      actorId: ownerId, actorRole: 'OWNER', req,
    });
    // A held slot just freed — alert anyone watching this space (fire-and-forget).
    void availabilityAlertService.notifyOnSlotFreed(booking.spaceId);
    return { success: true, booking: updated };
  },

  cancelBooking: async (bookingId: string, userId: number, userRole: string, reason?: string, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true, name: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);

    const ownerId = (booking.space as any)?.ownerId ?? null;
    const isParker = booking.parkerId === userId;
    const isOwner = ownerId === userId;
    const isAdmin = userRole === 'ADMIN';
    if (!isParker && !isOwner && !isAdmin) {
      throw new AppError('Only the parker, the space owner, or an admin can cancel this booking', 403);
    }
    // Cancellable while the session hasn't started. Once ACTIVE, exit must go
    // through the proper leaving/release flow, not a cancel.
    if (!['PENDING_APPROVAL', 'APPROVED'].includes(booking.status)) {
      throw new AppError(`This booking can no longer be cancelled (${booking.status.toLowerCase()})`, 400);
    }

    // Tag WHO cancelled, so analytics can separate parker-initiated, owner-
    // initiated, and admin cancellations. Keeps a single CANCELLED status while
    // staying queryable.
    const cancelReason = isAdmin ? 'ADMIN_CANCELLED' : isOwner ? 'OWNER_CANCELLED' : 'USER_CANCELLED';
    const res = await db.booking.updateMany({
      where: { id: bookingId, status: { in: ['PENDING_APPROVAL', 'APPROVED'] } },
      data: { status: 'CANCELLED', cancelReason, sessionOtp: null },
    });
    if (res.count === 0) {
      throw new AppError('This booking can no longer be cancelled (already updated).', 409);
    }
    const updated = await db.booking.findUnique({ where: { id: bookingId } });
    await auditService.logBookingEvent({
      bookingId, event: 'BOOKING_CANCELLED', fromStatus: booking.status, toStatus: 'CANCELLED',
      actorId: userId, actorRole: isAdmin ? 'ADMIN' : isOwner ? 'OWNER' : 'PARKER', req,
      payload: { reason: cancelReason, ...(reason ? { detail: reason } : {}) },
    });
    void availabilityAlertService.notifyOnSlotFreed(booking.spaceId);

    // Tell the controller who to notify (the OTHER party) and by whom it was cancelled.
    return {
      success: true, booking: updated,
      ownerId, parkerId: booking.parkerId,
      spaceName: (booking.space as any)?.name ?? 'the space',
      cancelledBy: isAdmin ? 'ADMIN' : isOwner ? 'OWNER' : 'PARKER',
      reason: reason || null,
    };
  },

  markParkerArrived: async (bookingId: string, parkerId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: { select: { ownerId: true, name: true } },
        parker: { select: { firstName: true, lastName: true, phone: true } },
        vehicle: { select: { licensePlate: true } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.parkerId !== parkerId) throw new AppError('Forbidden', 403);
    if (booking.status !== 'APPROVED') {
      throw new AppError('Booking must be approved before marking arrival', 400);
    }
    // Persist the arrival so the owner's Verify screen surfaces this parker even
    // before the arrival OTP is generated. Idempotent: only stamp the first time.
    if (!booking.arrivedAt) {
      await db.booking.update({ where: { id: bookingId }, data: { arrivedAt: new Date() } });
    }
    await auditService.logBookingEvent({
      bookingId, event: 'PARKER_ARRIVED', fromStatus: booking.status, toStatus: booking.status,
      actorId: parkerId, actorRole: 'PARKER', req,
    });
    const parkerName = booking.parker?.firstName
      ? `${booking.parker.firstName} ${booking.parker.lastName || ''}`.trim()
      : booking.parker?.phone || 'Parker';
    return {
      success: true,
      ownerId: (booking.space as any)?.ownerId,
      spaceName: (booking.space as any)?.name,
      parkerName,
      vehicleNumber: booking.vehicle?.licensePlate,
      bookingId,
    };
  },

  updateEta: async (bookingId: string, parkerId: number, eta: Date, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: { select: { ownerId: true, name: true } },
        parker: { select: { firstName: true, lastName: true } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.parkerId !== parkerId) throw new AppError('Forbidden', 403);
    if (!['PENDING_APPROVAL', 'APPROVED'].includes(booking.status)) {
      throw new AppError('Cannot update ETA at this stage', 400);
    }
    const updated = await db.booking.update({
      where: { id: bookingId },
      // Stamp etaUpdatedAt so the owner's card can flag this as an UPDATED arrival.
      data: { eta, etaUpdatedAt: new Date() },
    });
    await auditService.logBookingEvent({
      bookingId, event: 'ETA_UPDATED', fromStatus: booking.status, toStatus: booking.status,
      actorId: parkerId, actorRole: 'PARKER', req,
    });
    const parkerName = booking.parker?.firstName
      ? `${booking.parker.firstName} ${booking.parker.lastName || ''}`.trim()
      : 'The parker';
    return {
      success: true, booking: updated,
      ownerId: (booking.space as any)?.ownerId,
      spaceName: (booking.space as any)?.name,
      parkerName, eta,
    };
  },

  markLeavingSession: async (bookingId: string, userId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: { select: { ownerId: true, name: true } },
        parker: { select: { firstName: true, lastName: true } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.parkerId !== userId) throw new AppError('Forbidden: only the parker can leave this session', 403);
    if (booking.status !== 'ACTIVE') throw new AppError('Booking is not active', 400);

    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { sessionEndedAt: new Date() },
    });
    await auditService.logBookingEvent({
      bookingId, event: 'SESSION_LEAVING', fromStatus: booking.status, toStatus: booking.status,
      actorId: booking.parkerId, actorRole: 'PARKER', req,
    });
    const parkerName = booking.parker?.firstName
      ? `${booking.parker.firstName} ${booking.parker.lastName || ''}`.trim()
      : 'The parker';
    return {
      success: true, booking: updated,
      ownerId: (booking.space as any)?.ownerId,
      spaceName: (booking.space as any)?.name,
      parkerName,
    };
  },

  releaseSpace: async (bookingId: string, userId: number, data: any, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true, hourlyRate: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if ((booking.space as any)?.ownerId !== userId) {
      throw new AppError('Forbidden: only the space owner can complete this session', 403);
    }
    if (booking.status !== 'ACTIVE') throw new AppError('Only an active session can be completed', 400);

    const entryTime = booking.sessionStartedAt ?? booking.createdAt;
    const now = new Date();
    // The owner MAY supply an earlier exit time (e.g. the car left 20 min ago),
    // but we clamp it server-side to [entryTime, now] so it can never be used to
    // bill the future or before entry.
    let exitTime = data?.exitTime ? new Date(data.exitTime) : now;
    if (isNaN(exitTime.getTime())) exitTime = now;
    if (exitTime.getTime() > now.getTime()) exitTime = now;
    if (exitTime.getTime() < entryTime.getTime()) exitTime = entryTime;

    // Bill from the rate SNAPSHOTTED at booking time — never the space's live rate
    // (the owner may have edited it mid-session). Same formula as the live charge.
    const ratePerHour = (booking as any).ratePerHour || (booking.space as any)?.hourlyRate || 0;
    const durationHours = Math.max(0.5, (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60));
    const totalAmount = computeCharge(entryTime, exitTime, ratePerHour);

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED', sessionEndedAt: exitTime, exitTime, totalAmount },
      });
      await auditService.logBookingEvent({
        bookingId, event: 'SESSION_ENDED', fromStatus: booking.status, toStatus: 'COMPLETED',
        actorId: booking.parkerId, actorRole: 'PARKER', req,
      });
      return result;
    });
    void availabilityAlertService.notifyOnSlotFreed(booking.spaceId);
    return {
      success: true, booking: updated,
      summary: { entryTime, exitTime, durationHours: Math.round(durationHours * 10) / 10, totalAmount, parkerId: booking.parkerId },
    };
  },

  // Parker self-completes after tapping "I Am Leaving" and owner hasn't confirmed.
  // Only allowed when sessionEndedAt is already set (parker already notified owner).
  selfCompleteBooking: async (bookingId: string, parkerId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { hourlyRate: true, ownerId: true } } },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.parkerId !== parkerId) throw new AppError('Not your booking', 403);
    if (booking.status !== 'ACTIVE') throw new AppError('Booking is not active', 400);
    if (!booking.sessionEndedAt) throw new AppError('Tap "I Am Leaving" first before force-completing', 400);

    const entryTime = booking.sessionStartedAt || booking.createdAt;
    const exitTime = booking.sessionEndedAt;
    const ratePerHour = (booking as any).ratePerHour || (booking.space as any)?.hourlyRate || 0;
    const totalAmount = computeCharge(entryTime, exitTime, ratePerHour);

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED', exitTime, totalAmount },
      });
      await auditService.logBookingEvent({
        bookingId, event: 'SESSION_ENDED', fromStatus: 'ACTIVE', toStatus: 'COMPLETED',
        actorId: parkerId, actorRole: 'PARKER', req,
      });
      return result;
    });
    void availabilityAlertService.notifyOnSlotFreed(booking.spaceId);
    return { success: true, booking: updated, ownerId: (booking.space as any)?.ownerId ?? null };
  },
};
