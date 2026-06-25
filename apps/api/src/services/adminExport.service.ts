import { db } from '../config/database';

/** Quote + escape a CSV cell. */
const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const toCsv = (header: string[], rows: unknown[][]) =>
  [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');

/**
 * CSV exports for the admin dashboard. Each returns a ready-to-download CSV
 * string. Mirrors the existing transactions export so the controller layer
 * stays uniform (text/csv + Content-Disposition attachment).
 */
export const adminExportService = {
  usersCsv: async () => {
    const users = await db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        spacesOwned: { select: { id: true } },
        _count: { select: { bookingsAsParker: true } },
      },
    });
    const header = ['User ID', 'Name', 'Phone', 'Email', 'Role', 'Status', 'Spaces', 'Bookings', 'Joined'];
    const rows = (users as any[]).map((u) => [
      `USR-${String(u.id).padStart(3, '0')}`,
      [u.firstName, u.lastName].filter(Boolean).join(' ') || '',
      u.phone,
      u.email || '',
      u.role,
      u.status,
      u.spacesOwned.length,
      u._count?.bookingsAsParker ?? 0,
      u.createdAt.toISOString(),
    ]);
    return toCsv(header, rows);
  },

  bookingsCsv: async (filters: { startDate?: string; endDate?: string } = {}) => {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    const bookings = await db.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        parker: { select: { firstName: true, lastName: true, phone: true } },
        space: { select: { name: true, owner: { select: { firstName: true, lastName: true } } } },
      },
    });
    const header = ['Booking ID', 'Parker', 'Space', 'Owner', 'Amount', 'Duration (h)', 'Status', 'Cancel Reason', 'Created'];
    const rows = (bookings as any[]).map((b) => [
      `BKG-${String(b.id).slice(-6).toUpperCase()}`,
      b.parker ? [b.parker.firstName, b.parker.lastName].filter(Boolean).join(' ') || b.parker.phone : '',
      b.space?.name || '',
      b.space?.owner ? [b.space.owner.firstName, b.space.owner.lastName].filter(Boolean).join(' ') : '',
      b.totalAmount,
      b.duration,
      b.status,
      b.cancelReason || '',
      b.createdAt.toISOString(),
    ]);
    return toCsv(header, rows);
  },

  logsCsv: async (filters: { level?: string; source?: string; search?: string } = {}) => {
    const where: any = {};
    if (filters.level && filters.level !== 'All') where.level = filters.level;
    if (filters.source && filters.source !== 'All') where.source = filters.source;
    if (filters.search) where.message = { contains: filters.search, mode: 'insensitive' };

    const logs = await db.systemLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000, // safety cap
    });
    const header = ['Time', 'Level', 'Source', 'Message', 'Actor ID'];
    const rows = (logs as any[]).map((l) => [
      l.createdAt.toISOString(),
      l.level,
      l.source,
      l.message,
      l.actorId ?? '',
    ]);
    return toCsv(header, rows);
  },
};
