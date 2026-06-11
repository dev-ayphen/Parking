import { db } from '../config/database';

/**
 * Space moderation: list, approve, reject, block.
 * Split out of admin.service.ts for maintainability.
 */
export const spaceAdminService = {
  listSpaces: async (query: any) => {
    const { status, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status && status !== 'all') where.status = String(status).toUpperCase();
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { address: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [spaces, total, counts] = await Promise.all([
      db.space.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          bookings: { select: { id: true } },
          ownerConsent: {
            select: {
              acceptOwnerResponsibility: true,
              acceptLegalCompliance: true,
              acceptNonViolationDeclaration: true,
              acceptedAt: true,
            },
          },
        },
      }),
      db.space.count({ where }),
      db.space.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const tally = { all: 0, pending: 0, verified: 0, rejected: 0, blocked: 0 };
    (counts as any[]).forEach((c) => {
      tally.all += c._count._all;
      const key = String(c.status).toLowerCase() as keyof typeof tally;
      if (key in tally) tally[key] = c._count._all;
    });

    const mapped = (spaces as any[]).map((s) => ({
      id: s.id,
      name: s.name,
      spaceType: s.spaceType,
      parkingFor: s.parkingFor,
      address: s.address,
      landmark: s.landmark,
      capacity: s.capacity,
      hourlyRate: s.hourlyRate,
      dailyRate: s.dailyRate,
      monthlyRate: s.monthlyRate,
      availability: s.availability,
      startTime: s.startTime,
      endTime: s.endTime,
      amenities: s.amenities,
      visibility: s.visibility,
      docType: s.docType,
      status: s.status,
      requiresAdminReview: s.requiresAdminReview,
      bookingsCount: s.bookings.length,
      owner: s.owner
        ? {
            id: s.owner.id,
            name: [s.owner.firstName, s.owner.lastName].filter(Boolean).join(' ') || s.owner.phone,
            phone: s.owner.phone,
            email: s.owner.email,
          }
        : null,
      ownerConsent: s.ownerConsent ?? null,
      createdAt: s.createdAt,
    }));

    return { success: true, spaces: mapped, total, tally, page: Number(page), limit: Number(limit) };
  },

  approveSpace: async (spaceId: number) => {
    const space = await db.space.update({
      where: { id: spaceId },
      data: { status: 'VERIFIED' },
    });
    // Notify owner
    if (space.ownerId) {
      await db.notification.create({
        data: {
          userId: space.ownerId,
          title: 'Space Verified 🎉',
          message: `Your space "${space.name}" has been verified and is now live on the map. Parkers can now find and book it!`,
          category: 'SPACE_APPROVED',
          metadata: {
            spaceId: space.id,
            spaceName: space.name,
          },
        },
      });
    }
    return { success: true, space };
  },

  rejectSpace: async (spaceId: number, reason?: string) => {
    const finalReason = reason?.trim() || 'Space was rejected by admin';
    const space = await db.space.update({
      where: { id: spaceId },
      data: {
        status: 'REJECTED',
        rejectionReason: finalReason,
      },
    });
    // Notify owner
    if (space.ownerId) {
      await db.notification.create({
        data: {
          userId: space.ownerId,
          title: 'Space Rejected ❌',
          message: `Your space "${space.name}" was rejected. Reason: ${finalReason}`,
          category: 'SPACE_REJECTED',
          metadata: {
            spaceId: space.id,
            spaceName: space.name,
            reason: finalReason,
          },
        },
      });
    }
    return { success: true, space };
  },

  blockSpace: async (spaceId: number) => {
    const space = await db.space.update({
      where: { id: spaceId },
      data: { status: 'BLOCKED' },
    });
    if (space.ownerId) {
      await db.notification.create({
        data: {
          userId: space.ownerId,
          title: 'Space Blocked 🚫',
          message: `Your space "${space.name}" has been blocked by admin. Please contact support for more details.`,
          category: 'SPACE',
        },
      });
    }
    return { success: true, space };
  },
};
