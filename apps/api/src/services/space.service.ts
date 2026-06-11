import { Prisma } from '@prisma/client';
import { db } from '../config/database';
import { CreateSpaceInput, SearchSpacesQuery } from '../validations/space.validation';

const ACTIVE_BOOKING_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'ACTIVE'];

/**
 * Attach real rating (avg + count) and live availability (capacity − active bookings)
 * to a list of space rows. Works for both search modes.
 */
async function enrichSpacesWithStats(spaces: any[]): Promise<any[]> {
  const ids = spaces.map((s) => s.id).filter((x) => x != null);
  if (ids.length === 0) return spaces;

  const [activeCounts, ratingRows] = await Promise.all([
    db.booking.groupBy({
      by: ['spaceId'],
      where: { spaceId: { in: ids }, status: { in: ACTIVE_BOOKING_STATUSES } },
      _count: { _all: true },
    }),
    db.$queryRaw<Array<{ spaceId: number; avg: number; count: number }>>`
      SELECT b."spaceId" AS "spaceId", AVG(r.rating)::float AS avg, COUNT(r.id)::int AS count
      FROM "Rating" r
      JOIN "Booking" b ON r."bookingId" = b.id
      WHERE b."spaceId" IN (${Prisma.join(ids)})
      GROUP BY b."spaceId"
    `,
  ]);

  const activeMap = new Map<number, number>();
  (activeCounts as any[]).forEach((a) => activeMap.set(a.spaceId, a._count._all));
  const ratingMap = new Map<number, { avg: number; count: number }>();
  ratingRows.forEach((r) => ratingMap.set(r.spaceId, { avg: r.avg, count: r.count }));

  return spaces.map((s) => {
    const r = ratingMap.get(s.id);
    const ratingCount = r?.count ?? 0;
    const ratingAvg = ratingCount > 0 ? Math.round((r!.avg || 0) * 10) / 10 : 0;
    const active = activeMap.get(s.id) ?? 0;
    const availableSpots = Math.max(0, (s.capacity || 0) - active);
    return { ...s, ratingAvg, ratingCount, availableSpots };
  });
}

export const spaceService = {
  /**
   * Search verified parking spaces.
   *
   * Two modes:
   *  - GEO mode (lat + lng provided): returns spaces within `radius` km, sorted by
   *    distance ascending. Distance is computed in SQL using the Haversine formula
   *    and returned per-row as `distanceKm`. A bounding-box prefilter is applied
   *    so the query uses the (lat, lng) index.
   *  - TEXT mode (no coords): plain filtered list, no distance.
   */
  searchSpaces: async (query: SearchSpacesQuery) => {
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = query.offset ?? 0;

    // ── GEO mode ─────────────────────────────────────────────────────
    if (query.lat != null && query.lng != null) {
      const radius = query.radius ?? 5; // default 5 km
      // Bounding box: 1° lat ≈ 111 km; 1° lng narrows toward poles
      const latDelta = radius / 111;
      const lngDelta = radius / (111 * Math.cos((query.lat * Math.PI) / 180));
      const minLat = query.lat - latDelta;
      const maxLat = query.lat + latDelta;
      const minLng = query.lng - lngDelta;
      const maxLng = query.lng + lngDelta;

      const sortClause =
        query.sort === 'price' ? Prisma.sql`"hourlyRate" ASC, "distanceKm" ASC`
        : query.sort === 'newest' ? Prisma.sql`"createdAt" DESC`
        : Prisma.sql`"distanceKm" ASC`;

      const searchClause = query.search
        ? Prisma.sql`AND (s."name" ILIKE ${'%' + query.search + '%'} OR s."address" ILIKE ${'%' + query.search + '%'})`
        : Prisma.empty;
      const spaceTypeClause = query.spaceType
        ? Prisma.sql`AND s."spaceType" = ${query.spaceType}`
        : Prisma.empty;
      const parkingForClause = query.parkingFor
        ? Prisma.sql`AND s."parkingFor" = ${query.parkingFor}`
        : Prisma.empty;

      const spaces = await db.$queryRaw<Array<any>>`
        SELECT
          s.*,
          (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(${query.lat}::float)) * cos(radians(s.lat)) *
                cos(radians(s.lng) - radians(${query.lng}::float)) +
                sin(radians(${query.lat}::float)) * sin(radians(s.lat))
              ))
            )
          )::float AS "distanceKm"
        FROM "Space" s
        WHERE s.status IN ('VERIFIED', 'PENDING', 'APPROVED')
          AND s."deletedAt" IS NULL
          AND s.lat IS NOT NULL AND s.lng IS NOT NULL
          AND s.lat BETWEEN ${minLat} AND ${maxLat}
          AND s.lng BETWEEN ${minLng} AND ${maxLng}
          ${searchClause}
          ${spaceTypeClause}
          ${parkingForClause}
        ORDER BY ${sortClause}
        LIMIT ${limit} OFFSET ${offset}
      `;

      // Trim spaces to those actually within radius (bounding box is a superset)
      const filtered = spaces.filter((s) => (s.distanceKm ?? Infinity) <= radius);
      const enriched = await enrichSpacesWithStats(filtered);

      return {
        success: true,
        spaces: enriched,
        count: enriched.length,
        mode: 'geo' as const,
        center: { lat: query.lat, lng: query.lng, radius },
      };
    }

    // ── TEXT mode (fallback) ─────────────────────────────────────────
    const spaces = await db.space.findMany({
      where: {
        status: { in: ['VERIFIED', 'PENDING', 'APPROVED'] },
        deletedAt: null,
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { address: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
        ...(query.spaceType && { spaceType: query.spaceType }),
        ...(query.parkingFor && { parkingFor: query.parkingFor }),
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true },
        },
      },
      orderBy: query.sort === 'price'
        ? { hourlyRate: 'asc' }
        : query.sort === 'newest'
          ? { createdAt: 'desc' }
          : undefined,
      take: limit,
      skip: offset,
    });

    const enriched = await enrichSpacesWithStats(spaces);
    return { success: true, spaces: enriched, count: enriched.length, mode: 'text' as const };
  },

  getSpace: async (spaceId: number) => {
    const space = await db.space.findUnique({
      where: { id: spaceId },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            email: true,
          },
        },
        bookings: {
          select: {
            id: true,
            parker: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            status: true,
            eta: true,
            totalAmount: true,
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!space) {
      throw new Error('Space not found');
    }

    // Real rating (avg of all ratings on this space's bookings) + live availability
    const [ratingAgg, activeCount] = await Promise.all([
      db.rating.aggregate({
        where: { booking: { spaceId } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      db.booking.count({
        where: { spaceId, status: { in: ['PENDING_APPROVAL', 'APPROVED', 'ACTIVE'] } },
      }),
    ]);

    const ratingCount = ratingAgg._count.rating;
    const ratingAvg = ratingCount > 0 ? Math.round((ratingAgg._avg.rating || 0) * 10) / 10 : 0;
    const availableSpots = Math.max(0, (space.capacity || 0) - activeCount);

    return { ...space, ratingAvg, ratingCount, availableSpots };
  },

  getMySpaces: async (ownerId: number) => {
    const spaces = await db.space.findMany({
      where: { ownerId, deletedAt: null },
      include: {
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return spaces;
  },

  createSpace: async (ownerId: number, data: CreateSpaceInput) => {
    // Enforce admin-configured hourly rate bounds
    const settings = await db.platformSettings.findUnique({ where: { id: 1 } });
    if (settings) {
      if (data.hourlyPrice < settings.minHourlyRate || data.hourlyPrice > settings.maxHourlyRate) {
        const err = new Error(
          `Hourly rate must be between ₹${settings.minHourlyRate} and ₹${settings.maxHourlyRate}`
        );
        (err as any).status = 400;
        throw err;
      }
    }

    const space = await db.space.create({
      data: {
        ownerId,
        name: data.spaceName,
        spaceType: data.spaceType,
        parkingFor: data.parkingFor,
        capacity: data.capacity,
        address: data.address,
        landmark: data.landmark || null,
        lat: data.latitude,
        lng: data.longitude,
        hourlyRate: data.hourlyPrice,
        dailyRate: data.dailyRate || null,
        monthlyRate: data.monthlyRate || null,
        availability: data.availability,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        requiresAdminReview: data.spaceType === 'Open Frontage Area',
        amenities: data.amenities || [],
        frontPhotoUrl: data.frontPhoto ? `space_${Date.now()}_front.jpg` : null,
        areaPhotoUrl: data.areaPhoto ? `space_${Date.now()}_area.jpg` : null,
        videoUrl: data.areaVideo ? `space_${Date.now()}_video.mp4` : null,
        visibility: data.visibility || null,
        docType: data.docType,
        docPhotoUrl: data.docType ? `space_${Date.now()}_doc.jpg` : null,
        status: 'PENDING',
        features: [],
      },
    });

    // Update owner profile
    await db.ownerProfile.update({
      where: { userId: ownerId },
      data: {
        totalSpaces: {
          increment: 1,
        },
      },
    });

    // Persist owner compliance declarations
    if (data.acceptOwnerResponsibility || data.acceptLegalCompliance || data.acceptNonViolation) {
      await db.ownerConsent.create({
        data: {
          spaceId: space.id,
          userId: ownerId,
          acceptOwnerResponsibility: data.acceptOwnerResponsibility ?? false,
          acceptLegalCompliance: data.acceptLegalCompliance ?? false,
          acceptPublicObstructionRules: data.acceptNonViolation ?? false,
          acceptNonViolationDeclaration: data.acceptNonViolation ?? false,
          nonViolationDeclarationText: 'This space does not block public roads, footpaths, or emergency access',
          tcVersion: 'owner-tos-v1.0',
          platform: 'mobile',
        },
      });
    }

    return space;
  },

  updateSpace: async (spaceId: number, requestorId: number, data: Partial<CreateSpaceInput>) => {
    const existing = await db.space.findUnique({ where: { id: spaceId }, select: { ownerId: true, status: true } });
    if (!existing) throw Object.assign(new Error('Space not found'), { statusCode: 404 });
    if (existing.ownerId !== requestorId) {
      throw Object.assign(new Error('Forbidden: You do not own this space'), { statusCode: 403 });
    }

    const updateData: any = {};

    if (data.spaceName) updateData.name = data.spaceName;
    if (data.spaceType) updateData.spaceType = data.spaceType;
    if (data.parkingFor) updateData.parkingFor = data.parkingFor;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.address) updateData.address = data.address;
    if (data.landmark !== undefined) updateData.landmark = data.landmark;
    if (data.latitude !== undefined) updateData.lat = data.latitude;
    if (data.longitude !== undefined) updateData.lng = data.longitude;
    if (data.hourlyPrice) updateData.hourlyRate = data.hourlyPrice;
    if (data.availability) updateData.availability = data.availability;
    if (data.amenities) updateData.amenities = data.amenities;
    if (data.visibility) updateData.visibility = data.visibility;
    if (data.docType) updateData.docType = data.docType;

    // "Edit & Resubmit": editing a REJECTED space sends it back to the admin
    // review queue (PENDING) and clears the old rejection reason.
    if (existing.status === 'REJECTED') {
      updateData.status = 'PENDING';
      updateData.rejectionReason = null;
    }

    const space = await db.space.update({
      where: { id: spaceId },
      data: updateData,
    });

    return space;
  },

  deleteSpace: async (spaceId: number, requestorId: number, requestorRole: string) => {
    const existing = await db.space.findUnique({ where: { id: spaceId }, select: { ownerId: true } });
    if (!existing) throw Object.assign(new Error('Space not found'), { statusCode: 404 });
    if (existing.ownerId !== requestorId && requestorRole !== 'ADMIN') {
      throw Object.assign(new Error('Forbidden: You do not own this space'), { statusCode: 403 });
    }

    // Check if space has active bookings
    const activeBooking = await db.booking.findFirst({
      where: {
        spaceId,
        status: {
          in: ['PENDING_APPROVAL', 'APPROVED', 'ACTIVE'],
        },
      },
    });

    if (activeBooking) {
      throw new Error('Cannot delete space with active bookings');
    }

    // Soft delete + decrement owner space count atomically
    const space = await db.$transaction(async (tx) => {
      const updated = await tx.space.update({
        where: { id: spaceId },
        data: {
          deletedAt: new Date(),
          status: 'BLOCKED',
        },
      });
      await tx.ownerProfile.update({
        where: { userId: updated.ownerId },
        data: { totalSpaces: { decrement: 1 } },
      });
      return updated;
    });

    return space;
  },

  getSpaceBookings: async (spaceId: number, ownerId: number) => {
    const space = await db.space.findFirst({ where: { id: spaceId, ownerId } });
    if (!space) throw Object.assign(new Error('Space not found or access denied'), { statusCode: 404 });

    const bookings = await db.booking.findMany({
      where: { spaceId },
      include: {
        parker: { select: { id: true, firstName: true, lastName: true, phone: true } },
        vehicle: { select: { licensePlate: true, vehicleType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings;
  },

  getSpaceAnalytics: async (spaceId: number, ownerId: number) => {
    const space = await db.space.findFirst({ where: { id: spaceId, ownerId } });
    if (!space) throw Object.assign(new Error('Space not found or access denied'), { statusCode: 404 });

    const bookings = await db.booking.findMany({ where: { spaceId } });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === 'COMPLETED').length;
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED' || b.status === 'REJECTED').length;
    const pending = bookings.filter((b) => b.status === 'PENDING_APPROVAL').length;
    const active = bookings.filter((b) => b.status === 'ACTIVE' || b.status === 'APPROVED').length;

    const totalRevenue = bookings
      .filter((b) => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const thisMonthBookings = bookings.filter((b) => new Date(b.createdAt) >= monthStart);
    const thisMonthRevenue = thisMonthBookings
      .filter((b) => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
    const avgDuration =
      completedBookings.length > 0
        ? completedBookings.reduce((sum, b) => sum + b.duration, 0) / completedBookings.length
        : 0;

    return {
      totalBookings: total,
      completedBookings: completed,
      cancelledBookings: cancelled,
      pendingBookings: pending,
      activeBookings: active,
      totalRevenue,
      thisMonthRevenue,
      thisMonthBookings: thisMonthBookings.length,
      avgDurationHours: Math.round(avgDuration * 10) / 10,
      spaceName: space.name,
      hourlyRate: space.hourlyRate,
    };
  },

  // Admin: Get all spaces with optional filters
  getAllSpaces: async (filters: { status?: string; search?: string }) => {
    const { status, search } = filters;

    const spaces = await db.space.findMany({
      where: {
        ...(status && { status }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return spaces;
  },

  // Admin: Update space status
  updateSpaceStatus: async (
    spaceId: number,
    status: 'VERIFIED' | 'REJECTED' | 'PENDING',
    rejectionReason?: string
  ) => {
    const space = await db.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      throw new Error('Space not found');
    }

    const updateData: any = { status };
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const updatedSpace = await db.space.update({
      where: { id: spaceId },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedSpace;
  },

  recordOwnerConsent: async (spaceId: number, data: any) => {
    const consent = await db.ownerConsent.upsert({
      where: { spaceId },
      create: {
        spaceId,
        userId: data.userId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        tcVersion: data.tcVersion ?? null,
        acceptOwnerResponsibility: !!data.acceptOwnerResponsibility,
        acceptLegalCompliance: !!data.acceptLegalCompliance,
        acceptPublicObstructionRules: !!data.acceptPublicObstructionRules,
        acceptNonViolationDeclaration: !!data.acceptNonViolationDeclaration,
        nonViolationDeclarationText: data.nonViolationDeclarationText ?? null,
        platform: data.platform,
        appVersion: data.appVersion,
      },
      update: {
        // Identity fields intentionally NOT overwritten — original consent is immutable.
        acceptOwnerResponsibility: !!data.acceptOwnerResponsibility,
        acceptLegalCompliance: !!data.acceptLegalCompliance,
        acceptPublicObstructionRules: !!data.acceptPublicObstructionRules,
        acceptNonViolationDeclaration: !!data.acceptNonViolationDeclaration,
      },
    });
    return { success: true, consent };
  },

  // Roadside / Open Frontage acknowledgment — court-critical evidence
  recordRoadsideAcknowledgment: async (spaceId: number, data: {
    userId: number;
    bookingId?: string | null;
    warningText: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    appVersion?: string | null;
    platform?: string | null;
  }) => {
    const ack = await db.roadsideAcknowledgment.create({
      data: {
        userId: data.userId,
        spaceId,
        bookingId: data.bookingId ?? null,
        warningText: data.warningText,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        appVersion: data.appVersion ?? null,
        platform: data.platform ?? null,
      },
    });
    return { success: true, acknowledgment: ack };
  },

  getOwnerConsent: async (spaceId: number) => {
    const consent = await db.ownerConsent.findUnique({
      where: { spaceId },
    });
    if (!consent) {
      throw new Error('Owner consent not found');
    }
    return { success: true, consent };
  },
};
