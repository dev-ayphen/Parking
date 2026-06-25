import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { db } from '../config/database';
import { entitlementService } from '../services/entitlement.service';

const router = Router();

router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    // Fetch user data
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        parkerProfile: true,
        ownerProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch recent bookings for activity feed
    const recentBookings = await db.booking.findMany({
      where: {
        parkerId: userId,
      },
      include: {
        space: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Format activities
    const activities = recentBookings.map((booking: any) => ({
      id: booking.id,
      type: 'booking' as const,
      location: booking.space.address,
      status: booking.status === 'COMPLETED' ? 'Completed' : booking.status === 'ACTIVE' ? 'Active' : 'Pending',
      time: booking.createdAt,
      amount: booking.totalAmount,
    }));

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User',
          email: user.email,
          phone: user.phone,
          photoUrl: user.photoUrl,
          isProfileComplete: user.isProfileComplete,
          role: user.role,
        },
        parkerProfile: user.parkerProfile || {
          totalBookings: 0,
          totalSpent: 0,
          averageRating: 0,
        },
        ownerProfile: user.ownerProfile || {
          totalSpaces: 0,
          totalEarnings: 0,
          averageRating: 0,
        },
        activities,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Parker stats — spaces near user (all verified spaces)
    const [spotsNearby, ownerSpaces] = await Promise.all([
      db.space.count({ where: { status: 'VERIFIED' } }),
      db.space.findMany({
        where: { ownerId: userId },
        select: { id: true },
      }),
    ]);

    const spaceIds = ownerSpaces.map((s) => s.id);

    // Owner stats — run in parallel
    const [activeBookings, todayCompletedBookings] = await Promise.all([
      db.booking.count({
        where: { spaceId: { in: spaceIds }, status: { in: ['ACTIVE', 'APPROVED'] } },
      }),
      db.booking.findMany({
        where: { spaceId: { in: spaceIds }, status: 'COMPLETED', createdAt: { gte: todayStart } },
        select: { totalAmount: true },
      }),
    ]);

    const todayEarnings = todayCompletedBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    return res.json({
      success: true,
      stats: {
        parker: {
          spotsNearby,
          available: spotsNearby,
        },
        owner: {
          todayEarnings,
          activeBookings,
          spacesListed: spaceIds.length,
        },
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/notifications', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });


    // Parker bookings (user booked a space)
    const parkerBookings = await db.booking.findMany({
      where: { parkerId: userId },
      include: { space: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    // Owner bookings (someone booked the user's space)
    const ownerSpaces = await db.space.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, status: true, createdAt: true, updatedAt: true },
    });
    const ownerSpaceIds = ownerSpaces.map((s) => s.id);
    const ownerBookings = await db.booking.findMany({
      where: { spaceId: { in: ownerSpaceIds } },
      include: {
        parker: { select: { firstName: true, lastName: true, phone: true } },
        space: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const notifications: any[] = [];

    // Parker notifications — one per booking state
    for (const b of parkerBookings) {
      const spaceName = b.space?.name || 'your space';
      const base = { bookingId: b.id, createdAt: b.createdAt };
      if (b.status === 'PENDING_APPROVAL') {
        notifications.push({ ...base, id: `p_pending_${b.id}`, type: 'booking_request', title: 'Booking Requested', body: `Your booking at ${spaceName} is waiting for owner approval.` });
      } else if (b.status === 'APPROVED') {
        notifications.push({ ...base, id: `p_approved_${b.id}`, type: 'booking_approved', title: 'Booking Confirmed ✅', body: `Your booking at ${spaceName} has been approved by the owner.` });
      } else if (b.status === 'ACTIVE') {
        notifications.push({ ...base, id: `p_active_${b.id}`, type: 'session_started', title: 'Parking Session Started', body: `Your session at ${spaceName} has started. Duration: ${b.duration}h.` });
      } else if (b.status === 'COMPLETED') {
        notifications.push({ ...base, id: `p_completed_${b.id}`, type: 'session_ended', title: 'Session Ended', body: `Your parking session at ${spaceName} ended. Total: ${b.duration}h, ₹${b.totalAmount}.` });
      } else if (b.status === 'CANCELLED') {
        notifications.push({ ...base, id: `p_cancelled_${b.id}`, type: 'booking_rejected', title: 'Booking Cancelled', body: `Your booking at ${spaceName} was cancelled.` });
      } else if (b.status === 'REJECTED') {
        notifications.push({ ...base, id: `p_rejected_${b.id}`, type: 'booking_rejected', title: 'Booking Not Available', body: `Your booking at ${spaceName} was rejected by the owner.` });
      }
    }

    // Owner notifications — incoming booking requests on their spaces
    for (const b of ownerBookings) {
      const parkerName = b.parker?.firstName
        ? `${b.parker.firstName} ${b.parker.lastName || ''}`.trim()
        : b.parker?.phone || 'Someone';
      const spaceName = b.space?.name || 'your space';
      if (b.status === 'PENDING_APPROVAL') {
        notifications.push({ id: `o_request_${b.id}`, type: 'booking_request', title: 'New Booking Request', body: `${parkerName} wants to park at ${spaceName}.`, createdAt: b.createdAt });
      }
    }

    // Real DB-stored notifications (broadcasts, payouts, refunds, manual notifyUser calls)
    const realNotifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    for (const n of realNotifications) {
      notifications.push({
        id: `db_${n.id}`,
        dbId: n.id,
        type: n.category.toLowerCase(),
        title: n.title,
        body: n.message,
        createdAt: n.createdAt,
        isRead: n.isRead,
        metadata: n.metadata,
      });
    }

    // Sort newest first
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Unread badge = ONLY real DB notifications still unread.
    //
    // The synthetic (booking/space-state-derived) rows above are display-only
    // duplicates — every genuine event ("New Booking Request", "Booking
    // Approved", etc.) is ALSO written as a real DB notification via notifyUser,
    // which carries a proper isRead flag and is created exactly once. Counting
    // the synthetic rows too would (a) double-count and (b) light the badge on
    // first open with historical state the user never "received". So the badge
    // tracks DB notifications only; opening the inbox marks them read and the
    // badge clears.
    const unreadCount = realNotifications.filter((n) => !n.isRead).length;

    return res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error('Notifications error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/notifications/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false });
    const id = parseInt(String(req.params.id).replace(/^db_/, ''));
    if (Number.isNaN(id)) return res.json({ success: true }); // synthetic ids — nothing to mark
    const n = await db.notification.findUnique({ where: { id } });
    if (!n || n.userId !== userId) return res.status(404).json({ success: false });
    await db.notification.update({ where: { id }, data: { isRead: true } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

router.post('/notifications/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false });
    // Mark DB notifications read AND stamp the inbox-clear time so synthetic
    // booking notifications are counted as read too (they have no isRead flag).
    const [r] = await Promise.all([
      db.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } }),
      db.user.update({ where: { id: userId }, data: { notificationsReadAt: new Date() } }),
    ]);
    return res.json({ success: true, updated: r.count });
  } catch (error) {
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// ── Owner History: earnings summary + completed sessions ─────────────
router.get('/owner-history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const spaces = await db.space.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true },
    });
    const spaceIds = spaces.map((s) => s.id);
    const spaceNameMap: Record<number, string> = {};
    spaces.forEach((s) => { spaceNameMap[s.id] = s.name; });

    if (spaceIds.length === 0) {
      return res.json({
        success: true,
        earnings: { today: 0, thisWeek: 0, thisMonth: 0 },
        breakdown: [],
        sessions: [],
      });
    }

    // Completed bookings on owner's spaces
    const completedBookings = await db.booking.findMany({
      where: { spaceId: { in: spaceIds }, status: 'COMPLETED' },
      include: {
        parker: { select: { id: true, firstName: true, lastName: true, phone: true } },
        ratings: { select: { rating: true, review: true, raterId: true } },
      },
      orderBy: { sessionEndedAt: 'desc' },
      take: 50,
    });

    // Earnings calculations
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayEarnings = 0;
    let weekEarnings = 0;
    let monthEarnings = 0;

    const breakdownMap: Record<number, { name: string; earnings: number; count: number }> = {};
    spaceIds.forEach((id) => { breakdownMap[id] = { name: spaceNameMap[id], earnings: 0, count: 0 }; });

    const allBookings = completedBookings as any[];
    for (const b of allBookings) {
      const endedAt = b.sessionEndedAt ? new Date(b.sessionEndedAt) : new Date(b.updatedAt);
      const amt = b.totalAmount || 0;

      if (endedAt >= todayStart) todayEarnings += amt;
      if (endedAt >= weekStart) weekEarnings += amt;
      if (endedAt >= monthStart) monthEarnings += amt;

      if (breakdownMap[b.spaceId]) {
        breakdownMap[b.spaceId].earnings += amt;
        breakdownMap[b.spaceId].count += 1;
      }
    }

    const breakdown = Object.values(breakdownMap)
      .filter((b) => b.count > 0)
      .sort((a, b) => b.earnings - a.earnings);

    // Map sessions for display
    const avatarPalette = [
      { bg: '#ECFDF5', color: '#10B981' },
      { bg: '#E0F2FE', color: '#0284C7' },
      { bg: '#FFFBEB', color: '#D97706' },
      { bg: '#FEE2E2', color: '#DC2626' },
      { bg: '#F3E8FF', color: '#9333EA' },
    ];

    const sessions = allBookings.map((b, idx) => {
      const parkerName = b.parker?.firstName
        ? `${b.parker.firstName} ${b.parker.lastName || ''}`.trim()
        : b.parker?.phone || 'Unknown';
      const initials = parkerName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
      const palette = avatarPalette[idx % avatarPalette.length];

      const startedAt = b.sessionStartedAt ? new Date(b.sessionStartedAt) : new Date(b.createdAt);
      const endedAt = b.sessionEndedAt ? new Date(b.sessionEndedAt) : new Date(b.updatedAt);
      const durationMs = endedAt.getTime() - startedAt.getTime();
      const durationH = Math.floor(durationMs / 3600000);
      const durationM = Math.floor((durationMs % 3600000) / 60000);

      const formatTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const formatDate = (d: Date) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const dateStart = new Date(d); dateStart.setHours(0, 0, 0, 0);
        if (dateStart.getTime() === today.getTime()) return 'Today';
        if (dateStart.getTime() === yesterday.getTime()) return 'Yesterday';
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      };

      return {
        id: b.id,
        name: parkerName,
        initials,
        avatarBg: palette.bg,
        avatarColor: palette.color,
        phone: b.parker?.phone || '—',
        space: spaceNameMap[b.spaceId] || '—',
        date: `${formatDate(startedAt)} · ${formatTime(startedAt)} – ${formatTime(endedAt)}`,
        duration: `${durationH}h ${durationM}m`,
        amount: `₹${(b.totalAmount || 0).toLocaleString('en-IN')}`,
        rating: (b as any).ratings?.find((r: any) => r.raterId === b.parkerId)?.rating || 0,
        review: (b as any).ratings?.find((r: any) => r.raterId === b.parkerId)?.review || '',
      };
    });

    return res.json({
      success: true,
      earnings: {
        today: todayEarnings,
        thisWeek: weekEarnings,
        thisMonth: monthEarnings,
      },
      breakdown,
      sessions,
    });
  } catch (error) {
    console.error('Owner history error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── Owner Dashboard: revenue, stats, pending requests, live sessions ─────
router.get('/owner-dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Owner's spaces
    const spaces = await db.space.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, status: true, address: true, lat: true, lng: true },
    });
    const activeSpaces = spaces.filter((s) => s.status === 'VERIFIED');
    const spaceIds = spaces.map((s) => s.id);
    const spaceNameMap: Record<number, string> = {};
    spaces.forEach((s) => { spaceNameMap[s.id] = s.name; });

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthLabel = monthStart.toLocaleDateString('en-IN', { month: 'long' });

    // If owner has no spaces, return empty dashboard — but STILL include their
    // subscription + entitlements. A freshly-subscribed owner has no spaces yet,
    // and the client uses these to lift the "subscription required" gate so they
    // can add their first space. Omitting them traps the owner permanently.
    if (spaceIds.length === 0) {
      const [noSpaceSub, noSpaceEnt] = await Promise.all([
        db.subscription.findFirst({
          where: { userId, status: 'ACTIVE' },
          include: { planRef: true },
          orderBy: { createdAt: 'desc' },
        }),
        entitlementService.getForUser(userId),
      ]);
      return res.json({
        success: true,
        revenue: { amount: 0, monthLabel, trendPct: 0, nextPayoutDate: null, completedThisMonth: 0 },
        stats: { activeSpacesCount: 0, todayBookingsCount: 0 },
        subscription: noSpaceSub
          ? { planName: noSpaceSub.planRef?.name || noSpaceSub.planName, status: noSpaceSub.status }
          : null,
        entitlements: noSpaceEnt,
        usage: {
          spacesUsed: 0,
          maxSpaces: noSpaceEnt.maxSpaces,
          daysRemaining: noSpaceSub
            ? Math.max(0, Math.ceil((noSpaceSub.renewalDate.getTime() - Date.now()) / 86400000))
            : 0,
          isExpired: !noSpaceEnt.isSubscribed,
        },
        // No spaces yet → no parker can pay → suppress the UPI nudge for now.
        hasUpiId: true,
        pendingRequests: [],
        liveSessions: [],
        awaitingArrival: [],
        recentRequests: [],
      });
    }

    const [
      monthBookings,
      prevMonthBookings,
      todayBookings,
      pendingBookings,
      activeBookings,
      awaitingArrivalBookings,
      activeSubscription,
      recentBookings,
    ] = await Promise.all([
      db.booking.findMany({
        where: { spaceId: { in: spaceIds }, status: 'COMPLETED', sessionEndedAt: { gte: monthStart, lt: monthEnd } },
        select: { totalAmount: true },
      }),
      db.booking.findMany({
        where: { spaceId: { in: spaceIds }, status: 'COMPLETED', sessionEndedAt: { gte: prevMonthStart, lt: monthStart } },
        select: { totalAmount: true },
      }),
      db.booking.count({
        where: { spaceId: { in: spaceIds }, createdAt: { gte: todayStart, lt: todayEnd }, status: { in: ['PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'COMPLETED'] } },
      }),
      db.booking.findMany({
        where: { spaceId: { in: spaceIds }, status: 'PENDING_APPROVAL' },
        include: {
          parker: { select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true } },
          space: { select: { id: true, name: true, lat: true, lng: true } },
          vehicle: { select: { brandModel: true, licensePlate: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.booking.findMany({
        where: { spaceId: { in: spaceIds }, status: 'ACTIVE' },
        include: {
          parker: { select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true } },
          space: { select: { id: true, name: true } },
          vehicle: { select: { brandModel: true, licensePlate: true } },
        },
        orderBy: { sessionStartedAt: 'desc' },
        take: 10,
      }),
      // ACCEPTED but not yet started — drives the owner's "Parker on the way" /
      // "Parker at gate — verify OTP" status bars between APPROVED and ACTIVE.
      db.booking.findMany({
        where: { spaceId: { in: spaceIds }, status: 'APPROVED' },
        include: {
          parker: { select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true } },
          space: { select: { id: true, name: true } },
          vehicle: { select: { brandModel: true, licensePlate: true } },
        },
        orderBy: { eta: 'asc' },
        take: 10,
      }),
      db.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { startDate: 'desc' },
      }),
      // Recent past requests (retained history) — everything that left the pending state
      db.booking.findMany({
        where: {
          spaceId: { in: spaceIds },
          status: { in: ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'COMPLETED'] },
        },
        include: {
          parker: { select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true } },
          space: { select: { id: true, name: true } },
          vehicle: { select: { brandModel: true, licensePlate: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    // Owner's effective entitlements (drives the usage meter + lock state).
    const ownerEntitlements = await entitlementService.getForUser(userId);

    // Whether the owner has set a UPI ID. The dashboard shows a "add UPI to get
    // paid" nudge when this is false, since without it parkers only see the cash
    // fallback on the pay-QR card (no scan-to-pay).
    const ownerUser = await db.user.findUnique({ where: { id: userId }, select: { upiId: true } });
    const hasUpiId = !!ownerUser?.upiId;

    // Revenue
    const monthRevenue = monthBookings.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const prevMonthRevenue = prevMonthBookings.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    let trendPct = 0;
    if (prevMonthRevenue > 0) {
      trendPct = Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 1000) / 10;
    } else if (monthRevenue > 0) {
      trendPct = 100;
    }

    // Next payout: end of current month
    const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Pending Requests mapping
    const initialsOf = (name: string) => name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    const fullName = (p: any) => p?.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : (p?.phone || 'Unknown');

    const pendingRequests = pendingBookings.map((b: any) => {
      const name = fullName(b.parker);
      return {
        id: b.id,
        parkerName: name,
        initials: initialsOf(name),
        parkerPhotoUrl: b.parker?.photoUrl || null,
        phone: b.parker?.phone || '—',
        spaceName: b.space?.name || '—',
        durationHours: b.duration,
        etaText: humanRelativeTime(b.eta),
        createdAt: b.createdAt,
        vehicle: b.vehicle?.brandModel || null,
        licensePlate: b.vehicle?.licensePlate || null,
        amount: b.totalAmount,
      };
    });

    // Recent past requests — retained so expired/rejected ones don't vanish
    const recentRequests = (recentBookings as any[]).map((b: any) => {
      const name = fullName(b.parker);
      return {
        id: b.id,
        parkerName: name,
        initials: initialsOf(name),
        parkerPhotoUrl: b.parker?.photoUrl || null,
        spaceName: b.space?.name || '—',
        status: b.status, // APPROVED | REJECTED | EXPIRED | CANCELLED | COMPLETED
        durationHours: b.duration,
        vehicle: b.vehicle?.brandModel || null,
        licensePlate: b.vehicle?.licensePlate || null,
        amount: b.totalAmount,
        createdAt: b.createdAt,
      };
    });

    const liveSessions = activeBookings.map((b: any) => {
      const name = fullName(b.parker);
      const startedAt = b.sessionStartedAt ? new Date(b.sessionStartedAt) : new Date(b.createdAt);
      const totalMs = b.duration * 3600000;
      const endsAt = new Date(startedAt.getTime() + totalMs);
      const elapsedMs = Math.max(0, now.getTime() - startedAt.getTime());
      const remainingMs = Math.max(0, endsAt.getTime() - now.getTime());
      const progressPct = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
      const formatTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const rh = Math.floor(remainingMs / 3600000);
      const rm = Math.floor((remainingMs % 3600000) / 60000);

      return {
        id: b.id,
        parkerName: name,
        initials: initialsOf(name),
        parkerPhotoUrl: b.parker?.photoUrl || null,
        spaceName: b.space?.name || '—',
        startTime: formatTime(startedAt),
        endTime: formatTime(endsAt),
        // ISO timestamp so the client can run a live countdown (endTime above is
        // a formatted clock string for display only).
        endTimeISO: endsAt.toISOString(),
        progressPct,
        remainingText: rh > 0 ? `${rh}h ${rm}m left` : `${rm}m left`,
        vehicle: b.vehicle?.brandModel || null,
        licensePlate: b.vehicle?.licensePlate || null,
        // Parker has tapped "I Am Leaving" — owner must confirm the exit now.
        isLeaving: !!b.sessionEndedAt,
      };
    });

    // Accepted-but-not-started bookings → drive the owner's "on the way" / "at gate"
    // status bars. `atGate` is true once the parker has arrived or generated their
    // arrival OTP; otherwise they're still en route.
    const awaitingArrival = (awaitingArrivalBookings as any[]).map((b) => {
      const name = fullName(b.parker);
      const fmt = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      return {
        id: b.id,
        parkerName: name,
        spaceName: b.space?.name || '—',
        licensePlate: b.vehicle?.licensePlate || null,
        etaText: b.eta ? fmt(new Date(b.eta)) : null,
        atGate: !!b.arrivedAt || !!b.sessionOtp,
      };
    });

    return res.json({
      success: true,
      revenue: {
        amount: monthRevenue,
        monthLabel,
        trendPct,
        nextPayoutDate: nextPayoutDate.toISOString(),
        completedThisMonth: monthBookings.length,
      },
      stats: {
        activeSpacesCount: activeSpaces.length,
        todayBookingsCount: todayBookings,
      },
      subscription: activeSubscription ? {
        id: activeSubscription.id,
        planName: activeSubscription.planName || activeSubscription.plan,
        renewalDate: activeSubscription.renewalDate.toISOString(),
        autoRenewal: activeSubscription.autoRenewal,
        status: activeSubscription.status,
      } : null,
      // Entitlements + usage so the dashboard can show the "subscribe to list /
      // renew to continue" lock state and the usage meter.
      entitlements: ownerEntitlements,
      usage: {
        spacesUsed: spaces.length,
        maxSpaces: ownerEntitlements.maxSpaces,
        daysRemaining: activeSubscription
          ? Math.max(0, Math.ceil((activeSubscription.renewalDate.getTime() - Date.now()) / 86400000))
          : 0,
        isExpired: !ownerEntitlements.isSubscribed,
      },
      hasUpiId,
      pendingRequests,
      liveSessions,
      awaitingArrival,
      recentRequests,
    });
  } catch (error) {
    console.error('Owner dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

function humanRelativeTime(d: Date | null | undefined): string {
  if (!d) return '—';
  const now = Date.now();
  const t = new Date(d).getTime();
  const diffMin = Math.round((t - now) / 60000);
  if (diffMin <= 0) return 'now';
  if (diffMin < 60) return `${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m ? `${h}h ${m}m` : `${h} hr${h > 1 ? 's' : ''}`;
}

export default router;
