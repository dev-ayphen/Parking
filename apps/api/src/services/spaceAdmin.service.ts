import { Prisma } from '@prisma/client';
import { db } from '../config/database';
import { AppError } from '../utils/errors';
import { bookingExpiryService } from './bookingExpiry.service';
import { storageService } from './storage.service';
import { BUCKETS } from '../config/supabase';

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

    // Per-space rating aggregate (avg + count) for the spaces on this page only.
    // Ratings link to spaces through bookings, so we aggregate via a raw join.
    const pageIds = (spaces as any[]).map((s) => s.id);
    const ratingMap = new Map<number, { avg: number; count: number }>();
    if (pageIds.length > 0) {
      const rows = await db.$queryRaw<Array<{ spaceId: number; avg: number; count: number }>>`
        SELECT b."spaceId" AS "spaceId", AVG(r.rating)::float AS avg, COUNT(r.id)::int AS count
        FROM "Rating" r
        JOIN "Booking" b ON r."bookingId" = b.id
        WHERE b."spaceId" IN (${Prisma.join(pageIds)}) AND r."isHidden" = false
        GROUP BY b."spaceId"
      `;
      rows.forEach((row) => ratingMap.set(row.spaceId, { avg: row.avg, count: row.count }));
    }

    const mapped = await Promise.all((spaces as any[]).map(async (s) => ({
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
      rejectionReason: s.rejectionReason ?? null,
      requiresAdminReview: s.requiresAdminReview,
      frontPhotoUrl: s.frontPhotoUrl
        ? await storageService.resolveUrl(s.frontPhotoUrl, BUCKETS.PUBLIC).catch(() => s.frontPhotoUrl)
        : null,
      areaPhotoUrl: s.areaPhotoUrl
        ? await storageService.resolveUrl(s.areaPhotoUrl, BUCKETS.PUBLIC).catch(() => s.areaPhotoUrl)
        : null,
      videoUrl: s.videoUrl
        ? await storageService.resolveUrl(s.videoUrl, BUCKETS.PUBLIC).catch(() => s.videoUrl)
        : null,
      bookingsCount: s.bookings.length,
      ratingCount: ratingMap.get(s.id)?.count ?? 0,
      ratingAvg: (ratingMap.get(s.id)?.count ?? 0) > 0
        ? Math.round((ratingMap.get(s.id)!.avg || 0) * 10) / 10
        : 0,
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
    })));

    return { success: true, spaces: mapped, total, tally, page: Number(page), limit: Number(limit) };
  },

  // Full admin detail for one space — includes owner contact, coords, and the
  // real bookings count. (The PUBLIC GET /spaces/:id deliberately hides owner
  // email/phone and returns lat/lng + a bookings array, which the admin modal
  // mis-read as latitude/longitude/bookingsCount — fixed by this endpoint.)
  getSpaceForAdmin: async (spaceId: number) => {
    const s: any = await db.space.findUnique({
      where: { id: spaceId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        ownerConsent: {
          select: {
            acceptOwnerResponsibility: true,
            acceptLegalCompliance: true,
            acceptNonViolationDeclaration: true,
            acceptedAt: true,
          },
        },
      },
    });
    if (!s) throw new AppError('Space not found', 404);

    const [ratingAgg, bookingsCount] = await Promise.all([
      db.rating.aggregate({
        where: { booking: { spaceId }, isHidden: false },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      db.booking.count({ where: { spaceId } }),
    ]);

    const [frontPhotoUrl, areaPhotoUrl, videoUrl] = await Promise.all([
      s.frontPhotoUrl ? storageService.resolveUrl(s.frontPhotoUrl, BUCKETS.PUBLIC).catch(() => s.frontPhotoUrl) : null,
      s.areaPhotoUrl  ? storageService.resolveUrl(s.areaPhotoUrl,  BUCKETS.PUBLIC).catch(() => s.areaPhotoUrl) : null,
      s.videoUrl      ? storageService.resolveUrl(s.videoUrl,      BUCKETS.PUBLIC).catch(() => s.videoUrl) : null,
    ]);

    const space = {
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
      rejectionReason: s.rejectionReason ?? null,
      requiresAdminReview: s.requiresAdminReview,
      frontPhotoUrl,
      areaPhotoUrl,
      videoUrl,
      latitude: s.lat,
      longitude: s.lng,
      bookingsCount,
      ratingCount: ratingAgg._count.rating,
      ratingAvg: ratingAgg._count.rating > 0 ? Math.round((ratingAgg._avg.rating || 0) * 10) / 10 : 0,
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
    };
    return { success: true, space };
  },

  // Admin edits basic space fields (not photos/documents).
  updateSpace: async (
    spaceId: number,
    fields: { name?: string; address?: string; hourlyRate?: number; description?: string; capacity?: number },
  ) => {
    const existing = await db.space.findUnique({ where: { id: spaceId }, select: { id: true } });
    if (!existing) throw new AppError('Space not found', 404);

    const data: any = {};
    if (fields.name !== undefined) data.name = String(fields.name).trim();
    if (fields.address !== undefined) data.address = String(fields.address).trim();
    if (fields.hourlyRate !== undefined && fields.hourlyRate !== null && !isNaN(Number(fields.hourlyRate))) {
      data.hourlyRate = Number(fields.hourlyRate);
    }
    // Space has no dedicated description column; map "Description" to `landmark`.
    if (fields.description !== undefined) data.landmark = String(fields.description).trim() || null;
    if (fields.capacity !== undefined && fields.capacity !== null && !isNaN(Number(fields.capacity))) {
      data.capacity = Math.max(1, Math.round(Number(fields.capacity)));
    }

    const space = await db.space.update({ where: { id: spaceId }, data });
    return { success: true, space };
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

  // Soft request: ask the owner to upload/replace a specific document WITHOUT
  // rejecting or blocking the space. Sends a notification the owner sees in their
  // space card + inbox, with a deep-link back to edit/re-upload. The space status
  // is unchanged (a verified space stays live while the owner adds the doc).
  requestSpaceDocument: async (spaceId: number, documentLabel: string, message?: string) => {
    const space = await db.space.findUnique({ where: { id: spaceId } });
    if (!space) throw new AppError('Space not found', 404);

    const label = documentLabel?.trim() || 'a required document';
    const note = message?.trim();
    const body = note
      ? `Please upload "${label}" for your space "${space.name}". ${note}`
      : `Please upload "${label}" for your space "${space.name}" so we can complete its verification.`;

    if (space.ownerId) {
      await db.notification.create({
        data: {
          userId: space.ownerId,
          title: 'Document requested 📄',
          message: body,
          category: 'SPACE_DOC_REQUESTED',
          metadata: {
            spaceId: space.id,
            spaceName: space.name,
            documentLabel: label,
            note: note ?? null,
          },
        },
      });
    }
    return { success: true, spaceId: space.id, documentLabel: label };
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
    // Cascade: cancel this space's not-yet-started bookings so parkers aren't
    // sent to a space that's no longer available. Active sessions finish normally.
    const cancelled = await bookingExpiryService.cancelInFlightBookings(
      { spaceId },
      'The space was blocked.',
    );
    return { success: true, space, cancelledBookings: cancelled };
  },

  // Lift a block — return the space to VERIFIED so it's live again.
  unblockSpace: async (spaceId: number) => {
    const space = await db.space.update({
      where: { id: spaceId },
      data: { status: 'VERIFIED' },
    });
    if (space.ownerId) {
      await db.notification.create({
        data: {
          userId: space.ownerId,
          title: 'Space Unblocked ✅',
          message: `Your space "${space.name}" has been unblocked and is live on the map again.`,
          category: 'SPACE',
        },
      });
    }
    return { success: true, space };
  },
};
