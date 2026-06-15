import { db } from '../config/database';
import { formatUserType, formatDateShort, formatDateMid, timeAgo } from '../utils/adminFormat';
import { userAdminService } from './userAdmin.service';
import { spaceAdminService } from './spaceAdmin.service';
import { billingAdminService } from './billingAdmin.service';
import { pushService } from './push.service';

/**
 * Map a notification's category + metadata to the deep-link data the mobile app
 * uses to route a notification tap to the right screen. Kept here so every
 * notifyUser() call routes consistently.
 */
function buildDeepLinkData(category?: string, metadata?: any): Record<string, unknown> {
  const data: Record<string, unknown> = { category: category || 'GENERAL' };
  const bookingId = metadata?.bookingId;
  if (bookingId) {
    data.bookingId = bookingId;
    // BOOKING notifications routed to the owner (new request) open the requests
    // list; everything else booking-related opens that booking's detail.
    data.screen = category === 'BOOKING' && metadata?.target === 'OWNER'
      ? 'booking-requests'
      : 'booking-detail';
  } else if (metadata?.spaceId) {
    data.spaceId = metadata.spaceId;
    data.screen = 'my-spaces';
  } else if (category === 'PAYMENT') {
    data.screen = 'billing';
  }
  return data;
}

/**
 * Aggregated admin service facade. Delegates user/space/billing to focused
 * sub-services and keeps support, analytics, broadcasts, and legal-compliance
 * methods here. Existing controllers still import `adminService` — they
 * don't need to know about the split.
 */
export const adminService = {
  ...userAdminService,
  ...spaceAdminService,
  ...billingAdminService,

  // ─── Bookings, support, analytics, broadcasts, legal & system logs ──
  listBookings: async (query: any) => {
    const { status, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
    };

    const where: any = {};
    if (status && statusMap[String(status).toLowerCase()]) {
      where.status = statusMap[String(status).toLowerCase()];
    }
    if (search) {
      where.OR = [
        { id: { contains: String(search) } },
        { space: { name: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          parker: { select: { id: true, firstName: true, lastName: true, phone: true } },
          space: {
            select: {
              id: true,
              name: true,
              owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
            },
          },
        },
      }),
      db.booking.count({ where }),
    ]);

    const statusDisplay: Record<string, string> = {
      PENDING_APPROVAL: 'Pending',
      APPROVED: 'Upcoming',
      ACTIVE: 'Active',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      REJECTED: 'Rejected',
    };

    const cancelReasonDisplay: Record<string, string> = {
      NO_SHOW: 'No Show',
      USER_CANCELLED: 'Parker Cancelled',
      OWNER_CANCELLED: 'Owner Cancelled',
      ADMIN_CANCELLED: 'Admin Cancelled',
    };

    const mapped = (bookings as any[]).map((b) => ({
      id: `BKG-${String(b.id).slice(-4).toUpperCase()}`,
      rawId: b.id,
      parker: b.parker
        ? {
            id: b.parker.id,
            name: [b.parker.firstName, b.parker.lastName].filter(Boolean).join(' ') || b.parker.phone,
          }
        : null,
      owner: b.space?.owner
        ? {
            id: b.space.owner.id,
            name:
              [b.space.owner.firstName, b.space.owner.lastName].filter(Boolean).join(' ') ||
              b.space.owner.phone,
          }
        : null,
      space: b.space?.name ?? '—',
      date: formatDateMid(b.createdAt),
      duration: `${b.duration} hr${b.duration > 1 ? 's' : ''}`,
      amount: `₹${b.totalAmount}`,
      status: statusDisplay[b.status] ?? b.status,
      // Human-readable cancellation reason for the admin table (null unless cancelled).
      cancelReason: b.status === 'CANCELLED' ? (cancelReasonDisplay[b.cancelReason] ?? null) : null,
      createdAt: b.createdAt,
    }));

    return { success: true, bookings: mapped, total, page: Number(page), limit: Number(limit) };
  },

  getBookingDetails: async (bookingId: string) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        parker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        space: {
          select: {
            id: true,
            name: true,
            address: true,
            landmark: true,
            spaceType: true,
            hourlyRate: true,
            capacity: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        vehicle: {
          select: {
            id: true,
            brandModel: true,
            licensePlate: true,
            vehicleType: true,
          },
        },
      },
    });

    if (!booking) throw new Error('Booking not found');

    const b = booking as any;

    const statusDisplay: Record<string, string> = {
      PENDING_APPROVAL: 'Pending',
      APPROVED: 'Upcoming',
      ACTIVE: 'Active',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      REJECTED: 'Rejected',
    };

    const parkerName = b.parker
      ? [b.parker.firstName, b.parker.lastName].filter(Boolean).join(' ') || b.parker.phone
      : 'Unknown';

    const ownerName = b.space?.owner
      ? [b.space.owner.firstName, b.space.owner.lastName].filter(Boolean).join(' ') || b.space.owner.phone
      : 'Unknown';

    return {
      success: true,
      booking: {
        id: b.id,
        displayId: `BKG-${String(b.id).slice(-4).toUpperCase()}`,
        status: statusDisplay[b.status] ?? b.status,
        rawStatus: b.status,
        parker: b.parker
          ? {
              id: b.parker.id,
              name: parkerName,
              phone: b.parker.phone,
              email: b.parker.email,
            }
          : null,
        owner: b.space?.owner
          ? {
              id: b.space.owner.id,
              name: ownerName,
              phone: b.space.owner.phone,
              email: b.space.owner.email,
            }
          : null,
        space: b.space
          ? {
              id: b.space.id,
              name: b.space.name,
              address: b.space.address,
              landmark: b.space.landmark,
              spaceType: b.space.spaceType,
              hourlyRate: b.space.hourlyRate,
              capacity: b.space.capacity,
            }
          : null,
        vehicle: b.vehicle
          ? {
              id: b.vehicle.id,
              brandModel: b.vehicle.brandModel,
              licensePlate: b.vehicle.licensePlate,
              vehicleType: b.vehicle.vehicleType,
            }
          : null,
        duration: b.duration,
        totalAmount: b.totalAmount,
        paymentMode: b.paymentMode,
        eta: b.eta?.toISOString() ?? null,
        sessionStartedAt: b.sessionStartedAt?.toISOString() ?? null,
        sessionEndedAt: b.sessionEndedAt?.toISOString() ?? null,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      },
    };
  },

  notifyUser: async (userId: number, payload: { title: string; message: string; category?: string; metadata?: any }) => {
    // A notification is a SIDE EFFECT — it must never break the action that
    // triggered it (a booking still succeeds even if the notification row or
    // push fails). Controllers `await` this, so we swallow errors here rather
    // than relying on every caller to wrap it in try/catch.
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

      // Fire-and-forget push so users hear it even with the app closed. This is
      // the SINGLE source of push for notifications — every notifyUser() call
      // gets a push for free, with deep-link data derived from metadata.
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

  listSupportTickets: async (query: any) => {
    const { status, priority, category, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (status && status !== 'All') where.status = String(status).toUpperCase().replace(' ', '_');
    if (priority) where.priority = String(priority).toUpperCase();
    if (category) where.category = String(category).toUpperCase();
    if (search) {
      where.OR = [
        { subject: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { user: { firstName: { contains: String(search), mode: 'insensitive' } } },
        { user: { lastName: { contains: String(search), mode: 'insensitive' } } },
        { user: { phone: { contains: String(search) } } },
      ];
    }

    const [tickets, total, counts] = await Promise.all([
      db.supportTicket.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          _count: { select: { replies: true } },
        },
      }),
      db.supportTicket.count({ where }),
      db.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const stats = { open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 };
    (counts as any[]).forEach((c) => {
      stats.total += c._count._all;
      const key = String(c.status).toLowerCase() as keyof typeof stats;
      if (key in stats) (stats as any)[key] = c._count._all;
    });

    const mapped = (tickets as any[]).map((t) => ({
      id: t.id,
      ticketNumber: `PS-${String(1000 + t.id)}`,
      subject: t.subject || t.description.slice(0, 60) + (t.description.length > 60 ? '…' : ''),
      category: t.category,
      description: t.description,
      status: t.status,
      priority: t.priority,
      user: t.user
        ? {
            id: t.user.id,
            name: [t.user.firstName, t.user.lastName].filter(Boolean).join(' ') || t.user.phone,
            phone: t.user.phone,
          }
        : null,
      replyCount: t._count.replies,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return { success: true, tickets: mapped, stats, total, page: Number(page), limit: Number(limit) };
  },

  getSupportTicket: async (ticketId: number) => {
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) throw new Error('Ticket not found');

    return {
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: `PS-${String(1000 + ticket.id)}`,
        subject: ticket.subject,
        category: ticket.category,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        resolutionNote: ticket.resolutionNote,
        user: ticket.user ? {
          id: ticket.user.id,
          name: [ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(' ') || ticket.user.phone,
          phone: ticket.user.phone,
          email: ticket.user.email,
          role: ticket.user.role,
        } : null,
        attachmentUrls: (ticket as any).attachmentUrls || [],
        replies: ticket.replies.map((r) => ({
          id: r.id,
          message: r.message,
          isAdmin: r.isAdmin,
          authorId: r.authorId,
          createdAt: r.createdAt,
        })),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        closedAt: ticket.closedAt,
      },
    };
  },

  updateSupportTicket: async (ticketId: number, data: any) => {
    const allowed: any = {};
    if (data.status) {
      const s = String(data.status).toUpperCase().replace(' ', '_');
      if (!['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'].includes(s)) {
        throw new Error('Invalid status');
      }
      allowed.status = s;
      if (s === 'CLOSED' || s === 'RESOLVED') allowed.closedAt = new Date();
      if (s === 'OPEN' || s === 'IN_PROGRESS' || s === 'WAITING_FOR_USER') allowed.closedAt = null;
    }
    if (data.priority) {
      const p = String(data.priority).toUpperCase();
      if (!['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(p)) {
        throw new Error('Invalid priority');
      }
      allowed.priority = p;
    }
    if (data.resolutionNote !== undefined) allowed.resolutionNote = data.resolutionNote || null;

    const ticket = await db.supportTicket.update({ where: { id: ticketId }, data: allowed });
    return { success: true, ticket };
  },

  addSupportTicketReply: async (ticketId: number, adminId: number | undefined, message: string) => {
    const trimmed = (message || '').trim();
    if (!trimmed) throw new Error('Message cannot be empty');

    const reply = await db.supportTicketReply.create({
      data: { ticketId, authorId: adminId, message: trimmed, isAdmin: true },
    });

    // Auto-transition OPEN → IN_PROGRESS when admin replies
    const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
    if (ticket && ticket.status === 'OPEN') {
      await db.supportTicket.update({ where: { id: ticketId }, data: { status: 'IN_PROGRESS' } });
    }

    return { success: true, reply };
  },

  // Sidebar badge counts — single round-trip for all "needs action" indicators
  getSidebarCounts: async () => {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000);
    const [
      pendingSpaces,
      openSupportTickets,
      expiringSubscriptions,
      openAbuseReports,
    ] = await Promise.all([
      db.space.count({ where: { status: 'PENDING', deletedAt: null } }),
      db.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'] } } }),
      db.subscription.count({
        where: {
          status: 'ACTIVE',
          renewalDate: { lte: sevenDaysFromNow },
        },
      }),
      db.abuseReport.count({ where: { status: { in: ['REPORTED', 'INVESTIGATING'] } } }),
    ]);
    return {
      success: true,
      counts: {
        pendingSpaces,
        openSupportTickets,
        expiringSubscriptions,
        openAbuseReports,
      },
    };
  },

  getAnalyticsOverview: async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOf7DaysAgo = new Date(Date.now() - 7 * 86400000);

    const [
      totalUsers,
      activeSpaces,
      monthRevenueAgg,
      lastMonthRevenueAgg,
      liveSessions,
      recentUsers,
      topSpacesRaw,
      revenueLast7Days,
      lastMonthUserCount,
      lastMonthSpaceCount,
    ] = await Promise.all([
      db.user.count(),
      db.space.count({ where: { status: 'VERIFIED' } }),
      db.booking.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'COMPLETED', sessionEndedAt: { gte: startOfMonth } },
      }),
      db.booking.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: 'COMPLETED',
          sessionEndedAt: { gte: lastMonth, lt: startOfMonth },
        },
      }),
      db.booking.count({ where: { status: 'ACTIVE' } }),
      db.user.findMany({
        take: 4,
        orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, phone: true, createdAt: true },
      }),
      db.space.findMany({
        take: 5,
        where: { status: 'VERIFIED' },
        orderBy: { bookings: { _count: 'desc' } },
        select: {
          id: true,
          name: true,
          address: true,
          _count: { select: { bookings: true } },
        },
      }),
      db.booking.findMany({
        where: { status: 'COMPLETED', sessionEndedAt: { gte: startOf7DaysAgo } },
        select: { totalAmount: true, sessionEndedAt: true },
      }),
      db.user.count({ where: { createdAt: { lt: startOfMonth } } }),
      db.space.count({ where: { status: 'VERIFIED', createdAt: { lt: startOfMonth } } }),
    ]);

    const monthRevenue = monthRevenueAgg._sum.totalAmount ?? 0;
    const lastMonthRevenue = lastMonthRevenueAgg._sum.totalAmount ?? 0;
    const revenueChange = lastMonthRevenue > 0
      ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : monthRevenue > 0
        ? 100
        : 0;

    const usersChange = lastMonthUserCount > 0
      ? Math.round(((totalUsers - lastMonthUserCount) / lastMonthUserCount) * 100)
      : 0;

    const spacesChange = lastMonthSpaceCount > 0
      ? Math.round(((activeSpaces - lastMonthSpaceCount) / lastMonthSpaceCount) * 100)
      : 0;

    const revenueByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString('en-IN', { weekday: 'short' });
      revenueByDay[key] = 0;
    }
    (revenueLast7Days as any[]).forEach((b) => {
      const d = b.sessionEndedAt ? new Date(b.sessionEndedAt) : new Date();
      const key = d.toLocaleDateString('en-IN', { weekday: 'short' });
      if (key in revenueByDay) revenueByDay[key] += b.totalAmount;
    });

    const revenueChartData = Object.entries(revenueByDay).map(([day, value]) => ({ day, value }));

    const topSpaces = (topSpacesRaw as any[]).map((s, i) => ({
      rank: i + 1,
      id: s.id,
      name: s.name,
      location: s.address,
      bookings: s._count.bookings,
    }));

    const recentActivity = (recentUsers as any[]).map((u) => ({
      id: u.id,
      type: 'registration',
      title: 'New User Registration',
      user: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.phone,
      time: timeAgo(u.createdAt),
    }));

    const formatRevenue = (val: number) => {
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
      if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
      return `₹${val}`;
    };

    return {
      success: true,
      stats: {
        totalUsers: { value: totalUsers.toLocaleString('en-IN'), change: `${usersChange >= 0 ? '+' : ''}${usersChange}%`, isPositive: usersChange >= 0 },
        activeSpaces: { value: activeSpaces.toLocaleString('en-IN'), change: `${spacesChange >= 0 ? '+' : ''}${spacesChange}%`, isPositive: spacesChange >= 0 },
        monthlyRevenue: { value: formatRevenue(monthRevenue), change: `${revenueChange >= 0 ? '+' : ''}${revenueChange}%`, isPositive: revenueChange >= 0 },
        liveSessions: { value: liveSessions.toLocaleString('en-IN'), change: 'Now', isPositive: true },
      },
      revenueChart: revenueChartData,
      topSpaces,
      recentActivity,
    };
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
    if (users.length === 0) {
      return { success: true, sent: 0, message: 'No active recipients' };
    }

    const category = data.category || 'GENERAL';
    await db.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        message,
        category,
      })),
    });

    // Fire-and-forget push to every recipient with the app installed.
    pushService
      .sendToMany(users.map((u) => u.id), { title, body: message, data: { category } })
      .catch(() => {});

    return { success: true, sent: users.length, audience, broadcastedAt: new Date().toISOString(), title, message, category };
  },

  listBroadcastHistory: async (params: { page?: number; limit?: number } = {}) => {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 20);
    // Group notifications by (title, message, category, minute) to reconstruct broadcasts
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
    // Only show entries with more than one recipient as "broadcasts"
    const list = Array.from(groups.values())
      .filter((g) => g.count > 1)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = list.length;
    const slice = list.slice((page - 1) * limit, page * limit);
    return {
      success: true,
      total,
      page,
      limit,
      history: slice.map((g) => ({
        title: g.title,
        message: g.message,
        category: g.category,
        recipients: g.count,
        sentAt: g.createdAt.toISOString(),
      })),
    };
  },

  // ── User-facing notification endpoints ───────────────────────────────
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

  // ── System logs ──────────────────────────────────────────────────────
  listSystemLogs: async (params: { level?: string; source?: string; search?: string; page?: number; limit?: number } = {}) => {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 50);
    const where: any = {};
    if (params.level && params.level !== 'All') where.level = params.level;
    if (params.source && params.source !== 'All') where.source = params.source;
    if (params.search) where.message = { contains: String(params.search), mode: 'insensitive' };

    const [logs, total] = await Promise.all([
      db.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.systemLog.count({ where }),
    ]);
    return { success: true, logs, total, page, limit };
  },

  // ── Legal documents ──────────────────────────────────────────────────
  listLegalDocuments: async () => {
    const docs = await db.legalDocument.findMany({ orderBy: { updatedAt: 'desc' } });
    return { success: true, documents: docs };
  },

  getLegalDocument: async (slug: string) => {
    const doc = await db.legalDocument.findUnique({ where: { slug } });
    if (!doc) throw new Error('Document not found');
    return { success: true, document: doc };
  },

  upsertLegalDocument: async (slug: string, payload: { title?: string; content?: string; version?: string; isActive?: boolean }) => {
    const existing = await db.legalDocument.findUnique({ where: { slug } });
    if (existing) {
      const doc = await db.legalDocument.update({
        where: { slug },
        data: {
          ...(payload.title !== undefined && { title: payload.title }),
          ...(payload.content !== undefined && { content: payload.content }),
          ...(payload.version !== undefined && { version: payload.version }),
          ...(payload.isActive !== undefined && { isActive: payload.isActive }),
          effectiveAt: new Date(),
        },
      });
      return { success: true, document: doc };
    }
    const doc = await db.legalDocument.create({
      data: {
        slug,
        title: payload.title || slug,
        content: payload.content || '',
        version: payload.version || '1.0.0',
      },
    });
    return { success: true, document: doc };
  },

  listComplianceLogs: async (params: { type?: string; userId?: string; search?: string; page?: number; limit?: number } = {}) => {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 30);
    const where: any = {};
    if (params.type && params.type !== 'All') where.type = params.type;
    if (params.userId) where.userId = Number(params.userId);
    if (params.search) {
      where.user = {
        OR: [
          { firstName: { contains: params.search, mode: 'insensitive' } },
          { lastName: { contains: params.search, mode: 'insensitive' } },
          { phone: { contains: params.search } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ],
      };
    }

    const [logs, total] = await Promise.all([
      db.complianceLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          document: { select: { slug: true, title: true, version: true } },
        },
      }),
      db.complianceLog.count({ where }),
    ]);
    return { success: true, logs, total, page, limit };
  },

  updateComplianceLog: async (id: number, status: string, notes?: string) => {
    const log = await db.complianceLog.update({
      where: { id },
      data: { status, ...(notes !== undefined && { notes }) },
    });
    return { success: true, log };
  },

  recordCompliance: async (params: {
    type: string;
    userId?: number;
    documentSlug?: string;
    documentVersion?: string;
    platform?: string;
    ipAddress?: string;
    appVersion?: string;
  }) => {
    let documentId: number | undefined;
    if (params.documentSlug) {
      const doc = await db.legalDocument.findUnique({ where: { slug: params.documentSlug }, select: { id: true } });
      if (doc) documentId = doc.id;
    }
    const log = await db.complianceLog.create({
      data: {
        type: params.type,
        userId: params.userId ?? null,
        documentId: documentId ?? null,
        documentVersion: params.documentVersion ?? null,
        platform: params.platform ?? null,
        ipAddress: params.ipAddress ?? null,
        appVersion: params.appVersion ?? null,
      },
    });
    return { success: true, log };
  },
};
