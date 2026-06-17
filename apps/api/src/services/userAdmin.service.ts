import { db } from '../config/database';
import { formatUserType, formatDateShort } from '../utils/adminFormat';
import { bookingExpiryService } from './bookingExpiry.service';

/**
 * User moderation: list, view details, suspend, unsuspend, ban, delete.
 * Split out of admin.service.ts for maintainability.
 */
export const userAdminService = {
  listUsers: async (query: any) => {
    const { status, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const statusFilterMap: Record<string, any> = {
      active: { status: 'ACTIVE', isProfileComplete: true },
      inactive: { status: 'ACTIVE', isProfileComplete: false },
      suspended: { status: 'SUSPENDED' },
      banned: { status: 'BANNED' },
    };

    const where: any = {};
    if (status && status !== 'All Users') {
      Object.assign(where, statusFilterMap[String(status).toLowerCase()] || {});
    }
    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search) } },
      ];
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          spacesOwned: { select: { id: true } },
          ratingsReceived: { where: { isHidden: false }, select: { rating: true } },
        },
      }),
      db.user.count({ where }),
    ]);

    const mapped = (users as any[]).map((u) => {
      const ratings = u.ratingsReceived as { rating: number }[];
      const avgRating = ratings.length > 0
        ? Number((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1))
        : 0;

      let displayStatus: string;
      if (u.status === 'SUSPENDED') {
        if (u.suspendedUntil && new Date(u.suspendedUntil) < new Date()) {
          displayStatus = u.isProfileComplete ? 'Active' : 'Inactive';
        } else {
          displayStatus = 'Suspended';
        }
      } else if (u.status === 'BANNED') {
        displayStatus = 'Banned';
      } else {
        displayStatus = u.isProfileComplete ? 'Active' : 'Inactive';
      }

      return {
        id: u.id,
        usrId: `USR-${String(u.id).padStart(3, '0')}`,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.phone,
        email: u.email || '—',
        phone: u.phone,
        photoUrl: u.photoUrl || null,
        type: formatUserType(u.role, u.spacesOwned.length > 0),
        status: displayStatus,
        rawStatus: u.status,
        rating: avgRating || null,
        joined: formatDateShort(u.createdAt),
      };
    });

    return { success: true, users: mapped, total, page: Number(page), limit: Number(limit) };
  },

  getUserDetails: async (userId: number) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        spacesOwned: { select: { id: true, name: true, status: true, hourlyRate: true } },
        vehicles: { select: { id: true, brandModel: true, licensePlate: true, vehicleType: true, frontPhotoUrl: true, sidePhotoUrl: true } },
        bookingsAsParker: {
          select: { id: true, status: true, totalAmount: true, createdAt: true, space: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        ratingsReceived: { where: { isHidden: false }, select: { rating: true } },
        subscriptions: {
          select: { id: true, planName: true, price: true, status: true, renewalDate: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) throw new Error('User not found');

    const ratings = user.ratingsReceived;
    const avgRating = ratings.length > 0
      ? Number((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1))
      : 0;

    const totalSpent = (user.bookingsAsParker as any[])
      .filter((b) => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    return {
      success: true,
      user: {
        id: user.id,
        usrId: `USR-${String(user.id).padStart(3, '0')}`,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        photoUrl: user.photoUrl,
        role: user.role,
        // Billing profile (for subscription invoices / GST) — admin-visible.
        billing: {
          billingName: user.billingName || null,
          billingEmail: user.billingEmail || null,
          billingAddress: user.billingAddress || null,
          gstin: user.gstin || null,
        },
        type: formatUserType(user.role, user.spacesOwned.length > 0),
        status: user.status,
        suspendReason: user.suspendReason,
        suspendedAt: user.suspendedAt,
        suspendedUntil: user.suspendedUntil,
        banReason: user.banReason,
        bannedAt: user.bannedAt,
        isProfileComplete: user.isProfileComplete,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        emergencyContactName: user.emergencyContactName,
        emergencyContactPhone: user.emergencyContactPhone,
        stats: {
          totalBookings: user.bookingsAsParker.length,
          totalSpaces: user.spacesOwned.length,
          totalVehicles: user.vehicles.length,
          averageRating: avgRating,
          ratingCount: ratings.length,
          totalSpent,
        },
        spaces: user.spacesOwned,
        vehicles: user.vehicles,
        recentBookings: (user.bookingsAsParker as any[]).map((b) => ({
          id: b.id,
          space: b.space?.name ?? '—',
          status: b.status,
          amount: b.totalAmount,
          date: b.createdAt,
        })),
        subscriptions: user.subscriptions,
      },
    };
  },

  suspendUser: async (userId: number, opts: { reason?: string; durationDays?: number | null } = {}) => {
    const reason = (opts.reason || '').trim() || 'No reason provided';
    const suspendedUntil = opts.durationDays && opts.durationDays > 0
      ? new Date(Date.now() + opts.durationDays * 86400000)
      : null;

    await db.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedUntil,
        suspendReason: reason,
      },
    });
    await db.session.deleteMany({ where: { userId } });
    return { success: true, message: 'User suspended', suspendedUntil };
  },

  unsuspendUser: async (userId: number) => {
    await db.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspendedUntil: null,
        suspendReason: null,
      },
    });
    return { success: true, message: 'User reinstated' };
  },

  banUser: async (userId: number, opts: { reason?: string } = {}) => {
    const reason = (opts.reason || '').trim() || 'No reason provided';
    await db.user.update({
      where: { id: userId },
      data: {
        status: 'BANNED',
        bannedAt: new Date(),
        banReason: reason,
      },
    });
    await db.session.deleteMany({ where: { userId } });
    // Cascade: cancel not-yet-started bookings on a banned OWNER's spaces so
    // parkers aren't sent to a banned owner. Active sessions finish normally.
    await bookingExpiryService.cancelInFlightBookings(
      { ownerId: userId },
      'The space owner is no longer available.',
    );
    return { success: true, message: 'User banned' };
  },

  deleteUser: async (userId: number, reason?: string) => {
    await db.$transaction([
      db.session.deleteMany({ where: { userId } }),
      db.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          deletedReason: reason || null,
          status: 'BANNED',
        },
      }),
    ]);
    return { success: true, message: 'User deleted (soft delete)' };
  },
};
