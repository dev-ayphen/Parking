import { BookingStatus } from '@prisma/client';
import { db } from '../../config/database';
import { timeAgo } from '../../utils/adminFormat';

export const adminAnalyticsService = {
  getSidebarCounts: async () => {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000);
    const [pendingSpaces, openSupportTickets, expiringSubscriptions, openAbuseReports] = await Promise.all([
      db.space.count({ where: { status: 'PENDING', deletedAt: null } }),
      db.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'] } } }),
      db.subscription.count({ where: { status: 'ACTIVE', renewalDate: { lte: sevenDaysFromNow } } }),
      db.abuseReport.count({ where: { status: { in: ['REPORTED', 'INVESTIGATING'] } } }),
    ]);
    return { success: true, counts: { pendingSpaces, openSupportTickets, expiringSubscriptions, openAbuseReports } };
  },

  getAnalyticsOverview: async (range?: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const rangeDays = range === '30d' ? 30 : range === '90d' ? 90 : range === '1y' ? 365 : 7;
    const startOfRange = new Date(Date.now() - rangeDays * 86400000);

    const [
      totalUsers, activeSpaces, monthRevenueAgg, lastMonthRevenueAgg, liveSessions,
      recentUsers, topSpacesRaw, revenueLast7Days, lastMonthUserCount, lastMonthSpaceCount,
    ] = await Promise.all([
      db.user.count(),
      db.space.count({ where: { status: 'VERIFIED' } }),
      db.booking.aggregate({ _sum: { totalAmount: true }, where: { status: BookingStatus.COMPLETED, sessionEndedAt: { gte: startOfMonth } } }),
      db.booking.aggregate({ _sum: { totalAmount: true }, where: { status: BookingStatus.COMPLETED, sessionEndedAt: { gte: lastMonth, lt: startOfMonth } } }),
      db.booking.count({ where: { status: BookingStatus.ACTIVE } }),
      db.user.findMany({ take: 4, orderBy: { createdAt: 'desc' }, select: { id: true, firstName: true, lastName: true, phone: true, createdAt: true } }),
      db.space.findMany({ take: 5, where: { status: 'VERIFIED' }, orderBy: { bookings: { _count: 'desc' } }, select: { id: true, name: true, address: true, _count: { select: { bookings: true } } } }),
      db.booking.findMany({ where: { status: BookingStatus.COMPLETED, sessionEndedAt: { gte: startOfRange } }, select: { totalAmount: true, sessionEndedAt: true } }),
      db.user.count({ where: { createdAt: { lt: startOfMonth } } }),
      db.space.count({ where: { status: 'VERIFIED', createdAt: { lt: startOfMonth } } }),
    ]);

    const monthRevenue = monthRevenueAgg._sum.totalAmount ?? 0;
    const lastMonthRevenue = lastMonthRevenueAgg._sum.totalAmount ?? 0;
    const revenueChange = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : monthRevenue > 0 ? 100 : 0;
    const usersChange = lastMonthUserCount > 0 ? Math.round(((totalUsers - lastMonthUserCount) / lastMonthUserCount) * 100) : 0;
    const spacesChange = lastMonthSpaceCount > 0 ? Math.round(((activeSpaces - lastMonthSpaceCount) / lastMonthSpaceCount) * 100) : 0;

    // Revenue trend bucketed across the selected range.
    const useWeekdayLabels = rangeDays <= 7;
    const bucketCount = useWeekdayLabels ? rangeDays : 7;
    const daysPerBucket = Math.ceil(rangeDays / bucketCount);
    const revBuckets: { label: string; value: number; start: number; end: number }[] = [];
    for (let i = bucketCount - 1; i >= 0; i--) {
      const end = Date.now() - i * daysPerBucket * 86400000;
      const start = end - daysPerBucket * 86400000;
      const d = new Date(end);
      const label = useWeekdayLabels
        ? d.toLocaleDateString('en-IN', { weekday: 'short' })
        : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      revBuckets.push({ label, value: 0, start, end });
    }
    (revenueLast7Days as any[]).forEach((b) => {
      const t = (b.sessionEndedAt ? new Date(b.sessionEndedAt) : new Date()).getTime();
      const bucket = revBuckets.find((bk) => t > bk.start && t <= bk.end);
      if (bucket) bucket.value += b.totalAmount;
    });

    const topSpaces = (topSpacesRaw as any[]).map((s, i) => ({ rank: i + 1, id: s.id, name: s.name, location: s.address, bookings: s._count.bookings }));

    const [recentBookingRows, recentTxnRows] = await Promise.all([
      db.booking.findMany({
        take: 4, orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, createdAt: true, parker: { select: { firstName: true, lastName: true, phone: true } }, space: { select: { name: true } } },
      }),
      db.transaction.findMany({
        take: 4, orderBy: { createdAt: 'desc' }, where: { status: 'SUCCESS' },
        select: { id: true, type: true, amount: true, createdAt: true, description: true },
      }),
    ]);

    const activityItems: Array<{ id: string; type: string; title: string; user: string; createdAt: Date }> = [
      ...(recentUsers as any[]).map((u) => ({
        id: `u-${u.id}`, type: 'registration', title: 'New User Registration',
        user: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.phone, createdAt: u.createdAt,
      })),
      ...(recentBookingRows as any[]).map((b) => ({
        id: `b-${b.id}`,
        type: b.status === BookingStatus.COMPLETED ? 'payment' : (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) ? 'alert' : 'approval',
        title: b.status === BookingStatus.COMPLETED ? 'Booking Completed' : (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REJECTED) ? 'Booking Cancelled' : 'New Booking',
        user: [b.parker?.firstName, b.parker?.lastName].filter(Boolean).join(' ') || b.parker?.phone || b.space?.name || 'Parker',
        createdAt: b.createdAt,
      })),
      ...(recentTxnRows as any[]).map((t) => ({
        id: `t-${t.id}`, type: 'payment',
        title: t.type === 'REFUND' ? 'Refund Issued' : t.type === 'OWNER_PAYOUT' ? 'Owner Payout' : 'Payment Received',
        user: t.description || t.type, createdAt: t.createdAt,
      })),
    ];

    const recentActivity = activityItems
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 8)
      .map((a) => ({ id: a.id, type: a.type, title: a.title, user: a.user, time: timeAgo(a.createdAt) }));

    const startOf6MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOf30DaysAgo = new Date(Date.now() - 30 * 86400000);
    const [spaceTypeGroups, revenue6Months, bookings30Days] = await Promise.all([
      db.space.groupBy({ by: ['spaceType'], where: { status: 'VERIFIED' }, _count: { spaceType: true } }),
      db.booking.findMany({ where: { status: BookingStatus.COMPLETED, sessionEndedAt: { gte: startOf6MonthsAgo } }, select: { totalAmount: true, sessionEndedAt: true } }),
      db.booking.findMany({ where: { createdAt: { gte: startOf30DaysAgo } }, select: { createdAt: true } }),
    ]);

    const spaceTypeDistribution = (spaceTypeGroups as any[])
      .map((g) => ({ name: g.spaceType || 'Other', value: g._count.spaceType }))
      .sort((a, b) => b.value - a.value);

    const monthBuckets: { name: string; value: number; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthBuckets.push({ name: d.toLocaleDateString('en-IN', { month: 'short' }), value: 0, key: `${d.getFullYear()}-${d.getMonth()}` });
    }
    (revenue6Months as any[]).forEach((b) => {
      const d = b.sessionEndedAt ? new Date(b.sessionEndedAt) : new Date();
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = monthBuckets.find((m) => m.key === key);
      if (bucket) bucket.value += b.totalAmount;
    });
    const revenueByMonth = monthBuckets.map(({ name, value }) => ({ name, value }));

    const hourWindows = ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM'];
    const hourCounts = new Array(6).fill(0);
    (bookings30Days as any[]).forEach((b) => { hourCounts[Math.floor(new Date(b.createdAt).getHours() / 4)] += 1; });
    const bookingsByHour = hourWindows.map((time, i) => ({ time, value: hourCounts[i] }));

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
      revenueChart: revBuckets.map(({ label, value }) => ({ day: label, value })),
      topSpaces,
      recentActivity,
      revenueByMonth,
      spaceTypeDistribution,
      bookingsByHour,
    };
  },
};
