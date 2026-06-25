import { Prisma } from '@prisma/client';
import { db } from '../config/database';
import { CreateSpaceInput, SearchSpacesQuery } from '../validations/space.validation';
import { storageService } from './storage.service';
import { BUCKETS } from '../config/supabase';
import { entitlementService } from './entitlement.service';
import { isSpaceOpenAt } from '../utils/availability';

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
      WHERE b."spaceId" IN (${Prisma.join(ids)}) AND r."isHidden" = false
      GROUP BY b."spaceId"
    `,
  ]);

  const activeMap = new Map<number, number>();
  (activeCounts as any[]).forEach((a) => activeMap.set(a.spaceId, a._count._all));
  const ratingMap = new Map<number, { avg: number; count: number }>();
  ratingRows.forEach((r) => ratingMap.set(r.spaceId, { avg: r.avg, count: r.count }));

  return Promise.all(spaces.map(async (s) => {
    const r = ratingMap.get(s.id);
    const ratingCount = r?.count ?? 0;
    const ratingAvg = ratingCount > 0 ? Math.round((r!.avg || 0) * 10) / 10 : 0;
    const active = activeMap.get(s.id) ?? 0;
    const availableSpots = Math.max(0, (s.capacity || 0) - active);
    // Whether the space is within its operating window right now (IST). Drives
    // the "Closed" state on the map/list independently of free capacity.
    const isOpenNow = isSpaceOpenAt(s);
    // Resolve the stored photo KEY to a usable display URL (front photo preferred,
    // area photo as fallback) so the search card shows the real space image.
    const photoKey = s.frontPhotoUrl || s.areaPhotoUrl || null;
    const imageUrl = photoKey
      ? await storageService.resolveUrl(photoKey, BUCKETS.PUBLIC).catch(() => null)
      : null;
    return { ...s, ratingAvg, ratingCount, availableSpots, isOpenNow, imageUrl };
  }));
}

type SpaceMediaFiles = {
  frontPhoto?: { buffer: Buffer; originalname: string; mimetype: string };
  areaPhoto?: { buffer: Buffer; originalname: string; mimetype: string };
  areaVideo?: { buffer: Buffer; originalname: string; mimetype: string };
};

export const spaceService = {
  /**
   * Upload space photos/video to the PUBLIC bucket (display media) and store
   * permanent URLs on the space. Owner-only. Replaces any existing media.
   */
  uploadMedia: async (spaceId: number, ownerId: number, files: SpaceMediaFiles) => {
    const space = await db.space.findFirst({ where: { id: spaceId, ownerId } });
    if (!space) throw { status: 403, message: 'Space not found or access denied' };

    const folder = `spaces/${spaceId}`;
    const data: Record<string, string> = {};

    if (files.frontPhoto) {
      const s = await storageService.uploadPublic({ ...files.frontPhoto, originalName: files.frontPhoto.originalname, mimeType: files.frontPhoto.mimetype, folder });
      if (s.url) data.frontPhotoUrl = s.url;
    }
    if (files.areaPhoto) {
      const s = await storageService.uploadPublic({ ...files.areaPhoto, originalName: files.areaPhoto.originalname, mimeType: files.areaPhoto.mimetype, folder });
      if (s.url) data.areaPhotoUrl = s.url;
    }
    if (files.areaVideo) {
      const s = await storageService.uploadPublic({ ...files.areaVideo, originalName: files.areaVideo.originalname, mimeType: files.areaVideo.mimetype, folder });
      if (s.url) data.videoUrl = s.url;
    }

    if (Object.keys(data).length === 0) {
      throw { status: 400, message: 'No media files provided' };
    }

    const updated = await db.space.update({
      where: { id: spaceId },
      data,
      select: { id: true, frontPhotoUrl: true, areaPhotoUrl: true, videoUrl: true },
    });
    return { success: true, space: updated };
  },

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
      // spaceType may be a single value OR a comma-separated list (a category
      // group like "Residential" expands to several underlying types on the client).
      const spaceTypeList = query.spaceType
        ? String(query.spaceType).split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      const spaceTypeClause = spaceTypeList.length
        ? Prisma.sql`AND s."spaceType" IN (${Prisma.join(spaceTypeList)})`
        : Prisma.empty;
      // A space marked 'Both' accepts cars AND bikes, so when the user filters by
      // 'Car' (or 'Bike') we must also include 'Both' spaces — not just exact matches.
      const parkingForClause =
        query.parkingFor === 'Car' || query.parkingFor === 'Bike'
          ? Prisma.sql`AND s."parkingFor" IN (${query.parkingFor}, 'Both')`
          : query.parkingFor
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
        WHERE s.status = 'VERIFIED'
          AND s."deletedAt" IS NULL
          AND s.lat IS NOT NULL AND s.lng IS NOT NULL
          AND s.lat BETWEEN ${minLat} AND ${maxLat}
          AND s.lng BETWEEN ${minLng} AND ${maxLng}
          -- Subscription gate: only show spaces whose owner has an ACTIVE
          -- subscription. When an owner's plan expires their listings drop out
          -- of search (no new bookings) until they re-subscribe.
          AND EXISTS (
            SELECT 1 FROM "Subscription" sub
            WHERE sub."userId" = s."ownerId" AND sub."status" = 'ACTIVE'
          )
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
        status: 'VERIFIED',
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
          // PUBLIC endpoint — expose only what a parker needs to recognise the
          // host (name + photo). Never leak the owner's email/phone here; contact
          // happens in-app through the booking flow, not via the listing.
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
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
        where: { booking: { spaceId }, isHidden: false },
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

    // Resolve storage keys to full public URLs so the mobile client can display them directly.
    const [frontPhotoUrl, areaPhotoUrl, videoUrl] = await Promise.all([
      space.frontPhotoUrl ? storageService.resolveUrl(space.frontPhotoUrl, BUCKETS.PUBLIC).catch(() => space.frontPhotoUrl) : null,
      space.areaPhotoUrl  ? storageService.resolveUrl(space.areaPhotoUrl,  BUCKETS.PUBLIC).catch(() => space.areaPhotoUrl) : null,
      space.videoUrl      ? storageService.resolveUrl(space.videoUrl,      BUCKETS.PUBLIC).catch(() => space.videoUrl) : null,
    ]);

    return { ...space, frontPhotoUrl, areaPhotoUrl, videoUrl, ratingAvg, ratingCount, availableSpots };
  },

  getMySpaces: async (ownerId: number) => {
    const spaces = await db.space.findMany({
      where: { ownerId, deletedAt: null },
      include: {
        _count: { select: { bookings: true } },
        ownerConsent: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Resolve storage keys → full public URLs for all spaces in the list
    // (front + area photo and video, so owners see their own media).
    const resolved = await Promise.all(
      spaces.map(async (sp) => ({
        ...sp,
        frontPhotoUrl: sp.frontPhotoUrl
          ? await storageService.resolveUrl(sp.frontPhotoUrl, BUCKETS.PUBLIC).catch(() => sp.frontPhotoUrl)
          : null,
        areaPhotoUrl: sp.areaPhotoUrl
          ? await storageService.resolveUrl(sp.areaPhotoUrl, BUCKETS.PUBLIC).catch(() => sp.areaPhotoUrl)
          : null,
        videoUrl: sp.videoUrl
          ? await storageService.resolveUrl(sp.videoUrl, BUCKETS.PUBLIC).catch(() => sp.videoUrl)
          : null,
      }))
    );
    return resolved;
  },

  createSpace: async (ownerId: number, data: CreateSpaceInput) => {
    // SUBSCRIPTION GATE — owners must have an active plan, and may only list up
    // to their plan's space limit. Throws 403 SUBSCRIPTION_REQUIRED /
    // PLAN_LIMIT_REACHED. This is ParkSwift's primary revenue enforcement.
    await entitlementService.assertCanCreateSpace(ownerId);

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
        // Real media is uploaded separately via POST /spaces/:id/media after creation.
        frontPhotoUrl: null,
        areaPhotoUrl: null,
        videoUrl: null,
        visibility: data.visibility || null,
        docType: data.docType,
        docPhotoUrl: null,
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

    // Persist owner compliance declarations + ownership confirmation. We always
    // record consent when the listing was confirmed (data.confirmed), so every
    // space has a legal audit row (who confirmed, when, from which IP) — not just
    // those that ticked an optional compliance box.
    if (data.confirmed || data.acceptOwnerResponsibility || data.acceptLegalCompliance || data.acceptNonViolation) {
      await db.ownerConsent.create({
        data: {
          spaceId: space.id,
          userId: ownerId,
          // Genuine ownership confirmation = the required "I confirm I own this
          // space / am authorised" checkbox the owner actually ticked (NOT the
          // hardcoded `confirmed` submit flag, which is always true and carries
          // no real consent signal).
          confirmedOwnership: (data.acceptOwnerResponsibility ?? false) || (data.confirmed ?? false),
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

    // Editing a listing is a premium action — requires an active subscription.
    // (Managing live bookings is NOT gated; only listing changes are.)
    const ent = await entitlementService.getForUser(requestorId);
    if (!ent.isSubscribed) {
      throw Object.assign(
        new Error('A subscription is required to edit your spaces. Renew your plan to continue.'),
        { statusCode: 403, code: 'SUBSCRIPTION_REQUIRED' },
      );
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
    if (data.dailyRate !== undefined) updateData.dailyRate = data.dailyRate;
    if (data.monthlyRate !== undefined) updateData.monthlyRate = data.monthlyRate;
    if (data.availability) updateData.availability = data.availability;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.amenities) updateData.amenities = data.amenities;
    if (data.visibility) updateData.visibility = data.visibility;
    if (data.docType) updateData.docType = data.docType;

    // "Edit & Resubmit": editing a REJECTED space sends it back to the admin
    // review queue (PENDING) and clears the old rejection reason.
    if (existing.status === 'REJECTED') {
      updateData.status = 'PENDING';
      updateData.rejectionReason = null;
    } else if (existing.status === 'VERIFIED') {
      // A VERIFIED space stays live for minor edits (price, hours, amenities),
      // but MATERIAL changes — what was actually verified (identity, location,
      // type, capacity, documents) — must go back through admin review.
      const materialChanged =
        (data.address !== undefined) ||
        (data.latitude !== undefined) || (data.longitude !== undefined) ||
        (data.spaceType !== undefined) ||
        (data.capacity !== undefined) ||
        (data.docType !== undefined);
      if (materialChanged) {
        updateData.status = 'PENDING';
        updateData.rejectionReason = null;
      }
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

  getSpaceBookings: async (spaceId: number, ownerId: number, opts: { page?: number; limit?: number } = {}) => {
    const space = await db.space.findFirst({ where: { id: spaceId, ownerId } });
    if (!space) throw Object.assign(new Error('Space not found or access denied'), { statusCode: 404 });

    // Paginate — a popular space can accrue thousands of bookings; never load
    // the whole table into memory.
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 50));
    const skip = (page - 1) * limit;

    const bookings = await db.booking.findMany({
      where: { spaceId },
      include: {
        parker: { select: { id: true, firstName: true, lastName: true, phone: true } },
        vehicle: { select: { licensePlate: true, vehicleType: true } },
        // The owner's booking list renders the PARKER's review of the space per
        // completed booking. With mutual ratings there can be two rows per booking
        // (parker→owner and owner→parker), so we include both and pick the one the
        // parker left (raterId === the booking's parker).
        ratings: { select: { rating: true, review: true, createdAt: true, raterId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Flatten the PARKER's rating onto the booking — the mobile owner list reads
    // `rating` (number) and `review` (text) directly off each session.
    return bookings.map((b) => {
      const parkerRating = (b as any).ratings?.find((r: any) => r.raterId === b.parkerId);
      return {
        ...b,
        rating: parkerRating?.rating ?? 0,
        review: parkerRating?.review ?? null,
      };
    });
  },

  /**
   * Public reviews for a space — used by the parker-facing "See All Reviews"
   * screen. Returns each review (stars + text + reviewer first name + date),
   * the average, the total count, and a 1–5 star breakdown for the histogram.
   * Reviews with no text are still counted in the average/breakdown but only
   * text reviews are worth surfacing in the list, so we keep both.
   */
  getSpaceReviews: async (spaceId: number, opts: { page?: number; limit?: number } = {}) => {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));
    const skip = (page - 1) * limit;

    // Public ratings for this space (join Rating → Booking on spaceId).
    // Hidden (moderated) reviews are excluded from the list, count, and breakdown.
    const where = { booking: { spaceId }, isHidden: false };

    const [ratings, total, grouped] = await Promise.all([
      db.rating.findMany({
        where,
        include: {
          rater: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.rating.count({ where }),
      db.rating.groupBy({
        by: ['rating'],
        where,
        _count: { rating: true },
      }),
    ]);

    // Build the 1–5 breakdown (always all five keys, even if zero).
    const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const g of grouped) {
      const star = g.rating as 1 | 2 | 3 | 4 | 5;
      if (star >= 1 && star <= 5) breakdown[star] = g._count.rating;
      sum += g.rating * g._count.rating;
    }
    const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    const reviews = ratings.map((r) => ({
      id: r.id,
      rating: r.rating,
      review: r.review,
      createdAt: r.createdAt,
      // First name only — reviewers aren't fully identified to other users.
      reviewerName: (r.rater?.firstName || 'Parker').trim(),
    }));

    return {
      success: true,
      average,
      total,
      breakdown,
      reviews,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  getSpaceAnalytics: async (spaceId: number, ownerId: number) => {
    const space = await db.space.findFirst({ where: { id: spaceId, ownerId } });
    if (!space) throw Object.assign(new Error('Space not found or access denied'), { statusCode: 404 });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(dayStart);
    weekStart.setDate(weekStart.getDate() - 6); // last 7 days inclusive

    // Push all aggregation to the DB — never load every booking row into memory
    // (a busy space can have thousands).
    const completedWhere = (since?: Date) => ({
      spaceId,
      status: 'COMPLETED',
      ...(since ? { createdAt: { gte: since } } : {}),
    });
    const [
      statusCounts,
      ratingAgg,
      revTotalAgg,
      revMonthAgg,
      revWeekAgg,
      revTodayAgg,
      monthBookingsCount,
      durationAgg,
      occupiedNow,
    ] = await Promise.all([
      db.booking.groupBy({ by: ['status'], where: { spaceId }, _count: { _all: true } }),
      db.rating.aggregate({
        where: { booking: { spaceId }, isHidden: false },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      db.booking.aggregate({ where: completedWhere(), _sum: { totalAmount: true } }),
      db.booking.aggregate({ where: completedWhere(monthStart), _sum: { totalAmount: true } }),
      db.booking.aggregate({ where: completedWhere(weekStart), _sum: { totalAmount: true } }),
      db.booking.aggregate({ where: completedWhere(dayStart), _sum: { totalAmount: true } }),
      db.booking.count({ where: { spaceId, createdAt: { gte: monthStart } } }),
      db.booking.aggregate({ where: completedWhere(), _avg: { duration: true }, _count: { _all: true } }),
      db.booking.count({ where: { spaceId, status: 'ACTIVE' } }),
    ]);

    const countBy = (s: string) => (statusCounts.find((g) => g.status === s)?._count._all ?? 0);
    const total = statusCounts.reduce((sum, g) => sum + g._count._all, 0);
    const completed = countBy('COMPLETED');
    const cancelled = countBy('CANCELLED') + countBy('REJECTED');
    const pending = countBy('PENDING_APPROVAL');
    const active = countBy('ACTIVE') + countBy('APPROVED');

    const totalRevenue = revTotalAgg._sum.totalAmount ?? 0;
    const thisMonthRevenue = revMonthAgg._sum.totalAmount ?? 0;
    const thisWeekRevenue = revWeekAgg._sum.totalAmount ?? 0;
    const todayRevenue = revTodayAgg._sum.totalAmount ?? 0;
    const thisMonthBookings = monthBookingsCount;
    const avgDuration = durationAgg._avg.duration ?? 0;

    // Occupancy = currently-occupied slots ÷ capacity (live snapshot).
    const occupancyPct = space.capacity > 0 ? Math.round((occupiedNow / space.capacity) * 100) : 0;

    const avgRating = ratingAgg._count.rating > 0
      ? Math.round((ratingAgg._avg.rating || 0) * 10) / 10
      : 0;

    return {
      success: true,
      totalBookings: total,
      completedBookings: completed,
      cancelledBookings: cancelled,
      pendingBookings: pending,
      activeBookings: active,
      totalRevenue,
      thisMonthRevenue,
      thisWeekRevenue,
      todayRevenue,
      thisMonthBookings,
      avgDurationHours: Math.round(avgDuration * 10) / 10,
      occupancyPct,
      avgRating,
      ratingCount: ratingAgg._count.rating,
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

  // Only the space's owner (or an admin) may record/read its owner-consent. The
  // record holds legal/PII evidence, so guessing a spaceId must not grant access.
  assertSpaceOwnerAccess: async (spaceId: number, requester: { id: number; role?: string }) => {
    const space = await db.space.findUnique({ where: { id: spaceId }, select: { ownerId: true } });
    if (!space) throw Object.assign(new Error('Space not found'), { statusCode: 404 });
    if (requester.role !== 'ADMIN' && space.ownerId !== requester.id) {
      throw Object.assign(new Error('You do not have access to this space'), { statusCode: 403 });
    }
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
