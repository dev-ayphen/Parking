import { BookingStatus } from '@prisma/client';
import { db } from '../../config/database';
import { formatDateMid } from '../../utils/adminFormat';

export const adminBookingsService = {
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
        ? { id: b.parker.id, name: [b.parker.firstName, b.parker.lastName].filter(Boolean).join(' ') || b.parker.phone }
        : null,
      owner: b.space?.owner
        ? { id: b.space.owner.id, name: [b.space.owner.firstName, b.space.owner.lastName].filter(Boolean).join(' ') || b.space.owner.phone }
        : null,
      space: b.space?.name ?? '—',
      date: formatDateMid(b.createdAt),
      duration: `${b.duration} hr${b.duration > 1 ? 's' : ''}`,
      amount: `₹${b.totalAmount}`,
      status: statusDisplay[b.status] ?? b.status,
      cancelReason: b.status === BookingStatus.CANCELLED ? (cancelReasonDisplay[b.cancelReason] ?? null) : null,
      createdAt: b.createdAt,
    }));

    return { success: true, bookings: mapped, total, page: Number(page), limit: Number(limit) };
  },

  getBookingDetails: async (bookingId: string) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        parker: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        space: {
          select: {
            id: true, name: true, address: true, landmark: true, spaceType: true, hourlyRate: true, capacity: true,
            owner: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          },
        },
        vehicle: { select: { id: true, brandModel: true, licensePlate: true, vehicleType: true } },
      },
    });
    if (!booking) throw new Error('Booking not found');

    const b = booking as any;
    const statusDisplay: Record<string, string> = {
      PENDING_APPROVAL: 'Pending', APPROVED: 'Upcoming', ACTIVE: 'Active',
      COMPLETED: 'Completed', CANCELLED: 'Cancelled', REJECTED: 'Rejected',
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
        parker: b.parker ? { id: b.parker.id, name: parkerName, phone: b.parker.phone, email: b.parker.email } : null,
        owner: b.space?.owner ? { id: b.space.owner.id, name: ownerName, phone: b.space.owner.phone, email: b.space.owner.email } : null,
        space: b.space ? { id: b.space.id, name: b.space.name, address: b.space.address, landmark: b.space.landmark, spaceType: b.space.spaceType, hourlyRate: b.space.hourlyRate, capacity: b.space.capacity } : null,
        vehicle: b.vehicle ? { id: b.vehicle.id, brandModel: b.vehicle.brandModel, licensePlate: b.vehicle.licensePlate, vehicleType: b.vehicle.vehicleType } : null,
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
};
