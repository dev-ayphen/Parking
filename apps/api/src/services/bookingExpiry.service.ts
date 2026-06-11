import { db } from '../config/database';
import { emitToUser } from '../app';
import { auditService } from './audit.service';
import { adminService } from './admin.service';

const APPROVAL_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export const bookingExpiryService = {
  /**
   * Finds all PENDING_APPROVAL bookings older than 2 minutes,
   * marks them EXPIRED, notifies both parker and owner, and
   * emits real-time socket events to both.
   *
   * Called on a 30-second interval from server startup.
   */
  expireStaleBookings: async () => {
    const cutoff = new Date(Date.now() - APPROVAL_WINDOW_MS);

    const stale = await db.booking.findMany({
      where: {
        status: 'PENDING_APPROVAL',
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
        data: { status: 'EXPIRED' },
      });

      await auditService.logBookingEvent({
        bookingId: booking.id,
        event: 'BOOKING_EXPIRED',
        toStatus: 'EXPIRED',
        actorId: 0,
        actorRole: 'SYSTEM',
        payload: { reason: 'Owner did not respond within 2 minutes' },
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

      console.log(`[EXPIRY] Booking ${booking.id} expired (parker ${parkerId})`);
    }
  },

  /** Start the 30-second background expiry loop. Call once on server startup. */
  startExpiryLoop: () => {
    // Run immediately on start, then every 30 seconds
    bookingExpiryService.expireStaleBookings().catch(() => {});
    setInterval(() => {
      bookingExpiryService.expireStaleBookings().catch(() => {});
    }, 30_000);
    console.log('✅ Booking expiry loop started (every 30s, window=2min)');
  },
};
