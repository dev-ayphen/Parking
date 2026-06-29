import { db } from '../config/database';
import { getIO } from '../app';

/**
 * Notification service: persist messages before Socket.IO emit so offline users
 * get messages when they reconnect. Paired with Socket.IO for real-time delivery.
 */
export const notificationService = {
  /**
   * Send a notification to a user: store in DB + emit via Socket.IO if online.
   * If user is offline, they fetch unread notifications on app resume.
   */
  notifyUser: async (userId: number, title: string, message: string, category: 'BOOKING' | 'ADMIN' | 'SYSTEM' | 'SUPPORT') => {
    try {
      // 1. Persist to DB (survives if user offline)
      const notification = await db.notification.create({
        data: {
          userId,
          title,
          message,
          category,
          isRead: false,
        },
      });

      // 2. Emit via Socket.IO if user is online (real-time)
      const io = getIO();
      if (io) {
        io.to(`user_${userId}`).emit('notification:new', {
          id: notification.id,
          title,
          message,
          category,
          createdAt: notification.createdAt,
        });
      }

      return notification;
    } catch (error) {
      if (__DEV__) console.error('[NOTIFICATION] Error:', error);
      throw error;
    }
  },

  /**
   * Fetch unread notifications for a user (for offline recovery).
   * Called when app resumes or user navigates to notifications screen.
   */
  getUnreadNotifications: async (userId: number, limit = 50) => {
    try {
      const notifications = await db.notification.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return notifications;
    } catch (error) {
      if (__DEV__) console.error('[NOTIFICATION] Fetch error:', error);
      return [];
    }
  },

  /**
   * Mark a notification as read.
   */
  markAsRead: async (notificationId: string) => {
    try {
      const notification = await db.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      });
      return notification;
    } catch (error) {
      if (__DEV__) console.error('[NOTIFICATION] Mark read error:', error);
      return null;
    }
  },

  /**
   * Mark all notifications as read for a user.
   */
  markAllAsRead: async (userId: number) => {
    try {
      await db.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('[NOTIFICATION] Mark all read error:', error);
      return { success: false };
    }
  },

  /**
   * Broadcast to all admins.
   */
  notifyAdmins: async (title: string, message: string, category: 'ADMIN' | 'SYSTEM') => {
    try {
      const io = getIO();
      if (io) {
        io.to('admin_notifications').emit('notification:new', {
          title,
          message,
          category,
          createdAt: new Date(),
        });
      }
      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('[NOTIFICATION] Broadcast error:', error);
      return { success: false };
    }
  },
};
