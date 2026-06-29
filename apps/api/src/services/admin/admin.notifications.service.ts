import { db } from '../../config/database';
import { pushService } from '../push.service';

/**
 * Map a notification's category + metadata to the deep-link data the mobile app
 * uses to route a notification tap to the right screen.
 */
function buildDeepLinkData(category?: string, metadata?: any): Record<string, unknown> {
  const data: Record<string, unknown> = { category: category || 'GENERAL' };
  const bookingId = metadata?.bookingId;
  if (bookingId) {
    data.bookingId = bookingId;
    if (category === 'BOOKING' && metadata?.target === 'OWNER') {
      data.screen = metadata?.action === 'verify' ? 'verify' : 'booking-requests';
    } else {
      data.screen = 'booking-detail';
    }
  } else if (metadata?.ticketId) {
    data.ticketId = metadata.ticketId;
    data.screen = 'support-ticket';
  } else if (metadata?.spaceId) {
    data.spaceId = metadata.spaceId;
    data.screen = 'my-spaces';
  } else if (category === 'PAYMENT') {
    data.screen = 'billing';
  }
  return data;
}

export const adminNotificationsService = {
  notifyUser: async (userId: number, payload: { title: string; message: string; category?: string; metadata?: any }) => {
    // A notification is a SIDE EFFECT — it must never break the action that
    // triggered it. Swallow errors here so callers don't need try/catch.
    try {
      const notification = await db.notification.create({
        data: {
          userId,
          title: payload.title,
          message: payload.message,
          category: payload.category || 'GENERAL',
          metadata: payload.metadata || {},
        },
      });
      // Fire-and-forget push — deep-link data derived from metadata.
      pushService
        .sendToUser(userId, {
          title: payload.title,
          body: payload.message,
          data: buildDeepLinkData(payload.category, payload.metadata),
        })
        .catch(() => {});
      return notification;
    } catch (err) {
      console.error('[NOTIFY] notifyUser failed', { userId, err: (err as Error)?.message });
      return null;
    }
  },

  broadcastNotification: async (data: { title: string; message: string; audience?: 'ALL' | 'PARKERS' | 'OWNERS'; category?: string }) => {
    const title = (data?.title || '').trim();
    const message = (data?.message || '').trim();
    if (!title || !message) throw new Error('Title and message are required');

    const audience = data.audience || 'ALL';
    const where: any = { status: 'ACTIVE' };
    if (audience === 'PARKERS') where.role = 'PARKER';
    else if (audience === 'OWNERS') where.role = 'OWNER';

    const users = await db.user.findMany({ where, select: { id: true } });
    if (users.length === 0) return { success: true, sent: 0, message: 'No active recipients' };

    const category = data.category || 'GENERAL';
    await db.notification.createMany({
      data: users.map((u) => ({ userId: u.id, title, message, category })),
    });
    pushService
      .sendToMany(users.map((u) => u.id), { title, body: message, data: { category } })
      .catch(() => {});

    return { success: true, sent: users.length, audience, broadcastedAt: new Date().toISOString(), title, message, category };
  },

  listBroadcastHistory: async (params: { page?: number; limit?: number } = {}) => {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 20);
    const recent = await db.notification.findMany({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, title: true, message: true, category: true, createdAt: true, userId: true },
    });
    const groups = new Map<string, { title: string; message: string; category: string; createdAt: Date; count: number }>();
    for (const n of recent) {
      const bucket = new Date(n.createdAt);
      bucket.setSeconds(0, 0);
      const key = `${n.title}::${n.message}::${n.category}::${bucket.toISOString()}`;
      const existing = groups.get(key);
      if (existing) existing.count += 1;
      else groups.set(key, { title: n.title, message: n.message, category: n.category, createdAt: n.createdAt, count: 1 });
    }
    const list = Array.from(groups.values())
      .filter((g) => g.count > 1)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = list.length;
    const slice = list.slice((page - 1) * limit, page * limit);
    return {
      success: true, total, page, limit,
      history: slice.map((g) => ({
        title: g.title, message: g.message, category: g.category,
        recipients: g.count, sentAt: g.createdAt.toISOString(),
      })),
    };
  },

  listUserNotifications: async (userId: number, params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) => {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 30);
    const where: any = { userId };
    if (params.unreadOnly) where.isRead = false;
    const [items, total, unread] = await Promise.all([
      db.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { success: true, notifications: items, total, unread, page, limit };
  },

  markNotificationRead: async (userId: number, notificationId: number) => {
    const n = await db.notification.findUnique({ where: { id: notificationId } });
    if (!n || n.userId !== userId) throw new Error('Notification not found');
    return db.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  },

  markAllNotificationsRead: async (userId: number) => {
    const r = await db.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { success: true, updated: r.count };
  },
};
