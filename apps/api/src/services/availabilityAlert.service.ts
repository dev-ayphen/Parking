import { db } from '../config/database';
import { adminService } from './admin.service';
import { emitToUser } from '../app';

/**
 * "Notify me when available" — a parker subscribes to a FULL space and is alerted
 * (in-app notification + socket) the moment a slot frees. Deliberately simple:
 *
 *  - One-shot: the alert row is deleted once it fires, so a parker who misses it
 *    simply taps "Notify me" again.
 *  - No queue, no hold, no reservation. When a slot frees we notify EVERYONE
 *    subscribed; booking stays first-come, exactly like the normal green/red flow.
 *  - Booking is unchanged: the notification just deep-links back to the space.
 */

// A booking in one of these statuses occupies a slot.
const OCCUPYING_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'ACTIVE'];

/** True when the space currently has no free slots (active bookings ≥ capacity). */
const isSpaceFull = async (spaceId: number): Promise<boolean> => {
  const space = await db.space.findUnique({ where: { id: spaceId }, select: { capacity: true } });
  if (!space) return false;
  const active = await db.booking.count({
    where: { spaceId, status: { in: OCCUPYING_STATUSES } },
  });
  return active >= (space.capacity || 0);
};

export const availabilityAlertService = {
  /**
   * Subscribe the user to availability alerts for a space. Only meaningful while
   * the space is full — if it already has free slots, we tell the caller so the
   * UI can just send them to book instead. Idempotent (unique on spaceId+userId).
   */
  subscribe: async (userId: number, spaceId: number) => {
    const space = await db.space.findFirst({
      where: { id: spaceId, deletedAt: null },
      select: { id: true, ownerId: true },
    });
    if (!space) throw Object.assign(new Error('Space not found'), { statusCode: 404 });
    if (space.ownerId === userId) {
      throw Object.assign(new Error('You cannot set an availability alert on your own space.'), { statusCode: 400 });
    }

    if (!(await isSpaceFull(spaceId))) {
      // Nothing to wait for — surface this so the client books directly.
      return { success: true, subscribed: false, available: true };
    }

    await db.spaceAvailabilityAlert.upsert({
      where: { spaceId_userId: { spaceId, userId } },
      create: { spaceId, userId },
      update: {}, // already subscribed → no-op
    });
    return { success: true, subscribed: true, available: false };
  },

  /** Remove the user's alert for a space (idempotent — safe if none exists). */
  unsubscribe: async (userId: number, spaceId: number) => {
    await db.spaceAvailabilityAlert.deleteMany({ where: { spaceId, userId } });
    return { success: true, subscribed: false };
  },

  /** Whether the user currently holds an alert for this space. */
  getStatus: async (userId: number, spaceId: number) => {
    const alert = await db.spaceAvailabilityAlert.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
      select: { id: true },
    });
    return { success: true, subscribed: !!alert };
  },

  /**
   * Fire-and-forget: a slot on `spaceId` just freed (booking completed / cancelled
   * / expired). Notify every subscriber, then clear their alerts (one-shot).
   *
   * A SIDE EFFECT — must never throw into the booking flow that triggered it, so
   * all errors are swallowed. Guards against a false alarm by re-checking that the
   * space genuinely has a free slot now (the freeing booking may overlap another).
   */
  notifyOnSlotFreed: async (spaceId: number): Promise<void> => {
    try {
      if (await isSpaceFull(spaceId)) return; // still full — nothing freed

      const alerts = await db.spaceAvailabilityAlert.findMany({
        where: { spaceId },
        select: { id: true, userId: true },
      });
      if (alerts.length === 0) return;

      const space = await db.space.findUnique({
        where: { id: spaceId },
        select: { name: true },
      });
      const spaceName = space?.name || 'A saved parking space';

      // Notify each subscriber (in-app inbox + live socket), then delete the rows.
      await Promise.all(
        alerts.map((a) =>
          adminService.notifyUser(a.userId, {
            title: 'Parking now available',
            message: `${spaceName} just freed up a spot. Book now before it's taken.`,
            category: 'SPACE',
            metadata: { screen: 'space-detail', spaceId },
          }),
        ),
      );
      alerts.forEach((a) => emitToUser(a.userId, 'space:available', { spaceId }));

      await db.spaceAvailabilityAlert.deleteMany({
        where: { id: { in: alerts.map((a) => a.id) } },
      });
    } catch {
      // Never let a notification failure break the booking lifecycle.
    }
  },
};
