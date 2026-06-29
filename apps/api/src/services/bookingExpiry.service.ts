import { BookingStatus } from '@prisma/client';
import { db } from '../config/database';
import { emitToUser } from '../app';
import { auditService } from './audit.service';
import { adminService } from './admin.service';
import { availabilityAlertService } from './availabilityAlert.service';

const APPROVAL_WINDOW_MS = 5 * 60 * 1000;        // owner must respond to a request within 5 min
const NO_SHOW_GRACE_MS = 30 * 60 * 1000;          // parker grace period past their ETA before no-show
// Hard ceiling: an APPROVED booking that never starts a session is force-released
// this long after creation, REGARDLESS of ETA. Stops a parker from parking a
// far-future ETA on a slot to camp it indefinitely (the ETA-based no-show sweep
// alone can't catch an ETA that's hours/days out).
const APPROVED_MAX_AGE_MS = 6 * 60 * 60 * 1000;   // 6 hours

export const bookingExpiryService = {
  /**
   * Finds all PENDING_APPROVAL bookings older than 5 minutes,
   * marks them EXPIRED, notifies both parker and owner, and
   * emits real-time socket events to both.
   *
   * Called on a 30-second interval from server startup.
   */
  expireStaleBookings: async () => {
    const cutoff = new Date(Date.now() - APPROVAL_WINDOW_MS);

    const stale = await db.booking.findMany({
      where: {
        status: BookingStatus.PENDING_APPROVAL,
        createdAt: { lt: cutoff },
      },
      include: {
        space: { select: { name: true, ownerId: true } },
        parker: { select: { id: true, firstName: true } },
      },
    });

    if (stale.length === 0) return;

    for (const booking of stale) {
      await db.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.EXPIRED },
      });

      await auditService.logBookingEvent({
        bookingId: booking.id,
        event: 'BOOKING_EXPIRED',
        toStatus: BookingStatus.EXPIRED,
        actorId: 0,
        actorRole: 'SYSTEM',
        payload: { reason: 'Owner did not respond within 5 minutes' },
      });

      const parkerId = booking.parkerId;
      const ownerId = booking.space?.ownerId;
      const spaceName = booking.space?.name ?? 'your space';

      // Notify parker — DB + real-time
      await adminService.notifyUser(parkerId, {
        title: 'Booking Request Expired',
        message: `Your booking request for ${spaceName} expired. The owner did not respond in time.`,
        category: 'BOOKING',
        metadata: { bookingId: booking.id },
      });
      emitToUser(parkerId, 'booking:expired', { bookingId: booking.id });

      // Notify owner — DB + real-time (remove the pending request from their view)
      if (ownerId) {
        await adminService.notifyUser(ownerId, {
          title: 'Booking Request Expired',
          message: `A booking request for ${spaceName} expired before you responded.`,
          category: 'BOOKING',
          metadata: { bookingId: booking.id },
        });
        emitToUser(ownerId, 'booking:expired', { bookingId: booking.id });
      }

      // A held slot just freed — alert anyone watching this space.
      await availabilityAlertService.notifyOnSlotFreed(booking.spaceId);

      console.log(`[EXPIRY] Booking ${booking.id} expired (parker ${parkerId})`);
    }
  },

  /**
   * No-show release: finds APPROVED bookings where the parker never started the
   * session (no sessionStartedAt) and is now more than 30 minutes past their ETA.
   * Marks them CANCELLED, frees the space (capacity counts APPROVED slots), and
   * notifies both sides. This is what stops a no-show from blocking a spot forever.
   *
   * Signal choice: we key off `eta` (the arrival time the parker committed to) +
   * a grace buffer — fairer than a fixed timer from approval, and `eta` is always
   * set. `sessionStartedAt === null` guarantees the session never actually began,
   * and `sessionOtp === null` excludes parkers who are at the gate mid-verification
   * (they already generated their arrival OTP), so we never cancel under a live code.
   */
  releaseNoShows: async () => {
    const now = Date.now();
    const cutoff = new Date(now - NO_SHOW_GRACE_MS);
    const maxAgeCutoff = new Date(now - APPROVED_MAX_AGE_MS);

    const noShows = await db.booking.findMany({
      where: {
        status: BookingStatus.APPROVED,
        sessionStartedAt: null, // session never started → parker never verified arrival
        // A parker who already generated their arrival OTP is physically at the
        // gate mid-verification — do NOT no-show them out from under a live code.
        sessionOtp: null,
        // Release if EITHER the parker is >30min past their promised ETA, OR the
        // booking has been sitting APPROVED past the hard ceiling (camped slot).
        OR: [
          { eta: { lt: cutoff } },
          { createdAt: { lt: maxAgeCutoff } },
        ],
      },
      include: {
        space: { select: { name: true, ownerId: true } },
        parker: { select: { id: true, firstName: true } },
      },
    });

    if (noShows.length === 0) return;

    for (const booking of noShows) {
      await db.booking.update({
        where: { id: booking.id },
        // Tagged NO_SHOW so analytics can separate parker no-shows from
        // intentional cancellations — without needing a new booking status.
        data: { status: BookingStatus.CANCELLED, cancelReason: 'NO_SHOW', sessionOtp: null },
      });

      await auditService.logBookingEvent({
        bookingId: booking.id,
        event: 'BOOKING_CANCELLED',
        fromStatus: BookingStatus.APPROVED,
        toStatus: BookingStatus.CANCELLED,
        actorId: 0,
        actorRole: 'SYSTEM',
        payload: { reason: 'NO_SHOW', detail: 'Parker did not arrive within 30 minutes of ETA' },
      });

      const parkerId = booking.parkerId;
      const ownerId = booking.space?.ownerId;
      const spaceName = booking.space?.name ?? 'the space';

      // Notify parker — their approved booking was released for not showing up.
      await adminService.notifyUser(parkerId, {
        title: 'Booking Cancelled — No Arrival',
        message: `Your approved booking for ${spaceName} was cancelled because you didn't arrive within 30 minutes of your ETA.`,
        category: 'BOOKING',
        metadata: { bookingId: booking.id },
      });
      emitToUser(parkerId, 'booking:cancelled', { bookingId: booking.id });

      // Notify owner — their space is free again.
      if (ownerId) {
        await adminService.notifyUser(ownerId, {
          title: 'Space Released',
          message: `An approved booking for ${spaceName} was auto-cancelled — the parker didn't arrive. Your space is available again.`,
          category: 'BOOKING',
          metadata: { bookingId: booking.id },
        });
        emitToUser(ownerId, 'booking:cancelled', { bookingId: booking.id });
      }

      // The freed slot may now be bookable — alert anyone watching this space.
      await availabilityAlertService.notifyOnSlotFreed(booking.spaceId);

      console.log(`[NO_SHOW] Booking ${booking.id} cancelled (parker ${parkerId} never arrived)`);
    }
  },

  /**
   * Cascade-cancel a space's (or all an owner's) NOT-YET-STARTED bookings when
   * the space is blocked or the owner is banned by an admin. We cancel only
   * PENDING_APPROVAL + APPROVED — an ACTIVE session has a car physically parked,
   * so we let it finish normally rather than strand the parker mid-session.
   * Returns the count cancelled. Notifies each affected parker.
   */
  cancelInFlightBookings: async (
    filter: { spaceId?: number; ownerId?: number },
    reason: string,
  ): Promise<number> => {
    const where: any = { status: { in: [BookingStatus.PENDING_APPROVAL, BookingStatus.APPROVED] } };
    if (filter.spaceId) where.spaceId = filter.spaceId;
    if (filter.ownerId) where.space = { ownerId: filter.ownerId };

    const affected = await db.booking.findMany({
      where,
      include: { space: { select: { name: true } } },
    });
    if (affected.length === 0) return 0;

    for (const b of affected) {
      await db.booking.update({
        where: { id: b.id },
        data: { status: BookingStatus.CANCELLED, cancelReason: 'ADMIN_CANCELLED', sessionOtp: null },
      });
      await auditService.logBookingEvent({
        bookingId: b.id, event: 'BOOKING_CANCELLED', fromStatus: b.status, toStatus: BookingStatus.CANCELLED,
        actorId: 0, actorRole: 'SYSTEM', payload: { reason },
      });
      await adminService.notifyUser(b.parkerId, {
        title: 'Booking Cancelled',
        message: `Your booking for ${b.space?.name || 'a space'} was cancelled. ${reason} Please book another space.`,
        category: 'BOOKING',
        metadata: { bookingId: b.id },
      });
      emitToUser(b.parkerId, 'booking:cancelled', { bookingId: b.id });
    }
    console.log(`[CASCADE] Cancelled ${affected.length} in-flight booking(s) — ${reason}`);
    return affected.length;
  },

  /** Start the 30-second background expiry loop. Call once on server startup. */
  startExpiryLoop: () => {
    const tick = () => {
      // Both checks run each tick; each is independent and self-contained.
      bookingExpiryService.expireStaleBookings().catch((e) => {
        console.error('[EXPIRY] expireStaleBookings failed:', e?.message ?? e);
      });
      bookingExpiryService.releaseNoShows().catch((e) => {
        console.error('[EXPIRY] releaseNoShows failed:', e?.message ?? e);
      });
    };
    tick(); // run immediately on start
    setInterval(tick, 30_000);
    console.log('✅ Booking expiry loop started (every 30s: 5min request window + 30min no-show release)');
  },
};
