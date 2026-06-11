import { db } from '../config/database';

/**
 * Aggregates ALL evidence connected to a single booking into one bundle.
 * Used by GET /admin/cases/:bookingId/evidence and the case page in admin UI.
 *
 * Returns a frozen snapshot suitable for legal review / PDF export.
 */
interface ListCasesParams {
  search?: string;
  from?: string;
  to?: string;
  flagged?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}

export const caseEvidenceService = {
  /**
   * Searchable list of bookings ("cases") with flag indicators showing whether
   * each one has incident reports, abuse reports involving its parties, or
   * roadside acknowledgments. Used by the /admin/cases search page.
   */
  listCases: async (params: ListCasesParams) => {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, params.limit ?? 20);
    const offset = (page - 1) * limit;
    const search = params.search?.trim();

    // Build booking filter
    const bookingWhere: any = {};
    if (params.status) bookingWhere.status = params.status;
    if (params.from || params.to) {
      bookingWhere.createdAt = {};
      if (params.from) bookingWhere.createdAt.gte = new Date(params.from);
      if (params.to) bookingWhere.createdAt.lte = new Date(params.to);
    }

    // Search across booking id, parker name/phone, vehicle plate
    if (search) {
      bookingWhere.OR = [
        { id: { contains: search } },
        { parker: { firstName: { contains: search, mode: 'insensitive' } } },
        { parker: { lastName: { contains: search, mode: 'insensitive' } } },
        { parker: { phone: { contains: search } } },
        { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
        { space: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // "Flagged" = has at least one incident report
    if (params.flagged) {
      bookingWhere.incidents = { some: {} };
    }

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where: bookingWhere,
        include: {
          parker: { select: { id: true, firstName: true, lastName: true, phone: true } },
          vehicle: { select: { licensePlate: true } },
          space: {
            select: {
              id: true,
              name: true,
              address: true,
              ownerId: true,
              owner: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          incidents: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.booking.count({ where: bookingWhere }),
    ]);

    // Look up flag data per booking — abuse reports + roadside acks
    const parkerIds = [...new Set(bookings.map((b) => b.parkerId))];
    const ownerIds = [...new Set(bookings.map((b) => (b.space as any)?.ownerId).filter(Boolean))];
    const allUserIds = [...new Set([...parkerIds, ...ownerIds])];

    const [abuseByUser, roadsideByBooking] = await Promise.all([
      allUserIds.length === 0
        ? Promise.resolve([])
        : db.abuseReport.groupBy({
            by: ['reportedUserId'],
            where: { reportedUserId: { in: allUserIds } },
            _count: true,
          }),
      db.roadsideAcknowledgment.groupBy({
        by: ['bookingId'],
        where: { bookingId: { in: bookings.map((b) => b.id) } },
        _count: true,
      }),
    ]);

    const abuseMap = new Map<number, number>();
    abuseByUser.forEach((r: any) => abuseMap.set(r.reportedUserId, r._count));
    const roadsideMap = new Map<string, number>();
    roadsideByBooking.forEach((r: any) => {
      if (r.bookingId) roadsideMap.set(r.bookingId, r._count);
    });

    const cases = bookings.map((b) => {
      const ownerId = (b.space as any)?.ownerId;
      const incidentCount = b.incidents.length;
      const abuseCount =
        (abuseMap.get(b.parkerId) ?? 0) + (ownerId ? abuseMap.get(ownerId) ?? 0 : 0);
      const roadsideAcks = roadsideMap.get(b.id) ?? 0;
      const flagged = incidentCount > 0 || abuseCount > 0;

      return {
        bookingId: b.id,
        shortId: b.id.slice(0, 10),
        status: b.status,
        createdAt: b.createdAt,
        eta: b.eta,
        duration: b.duration,
        totalAmount: b.totalAmount,
        parker: b.parker,
        owner: (b.space as any)?.owner,
        space: {
          id: (b.space as any)?.id,
          name: (b.space as any)?.name,
          address: (b.space as any)?.address,
        },
        vehicle: b.vehicle,
        flags: {
          flagged,
          incidentCount,
          abuseCount,
          roadsideAcks,
        },
      };
    });

    return {
      success: true,
      cases,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  },


  getBookingEvidence: async (bookingId: string) => {
    // 1. Core booking + related entities
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        parker: {
          select: {
            id: true, firstName: true, lastName: true, phone: true, email: true,
            createdAt: true, status: true, deletedAt: true,
          },
        },
        vehicle: {
          select: { id: true, licensePlate: true, vehicleType: true, brandModel: true, capacity: true, ownershipType: true },
        },
        space: {
          include: {
            owner: {
              select: {
                id: true, firstName: true, lastName: true, phone: true, email: true,
                createdAt: true, status: true, deletedAt: true,
              },
            },
            ownerConsent: true,
            documents: {
              select: {
                id: true, documentType: true, fileUrl: true, status: true,
                verifiedAt: true, verifiedById: true, rejectionReason: true, createdAt: true,
              },
            },
          },
        },
        consent: true, // BookingConsent
        incidents: true,
        rating: true,
      },
    });

    if (!booking) {
      throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    }

    const spaceId = booking.spaceId;
    const ownerId = booking.space.ownerId;
    const parkerId = booking.parkerId;

    // 2. Run remaining lookups in parallel
    const [
      bookingAudit,
      roadsideAcks,
      abuseReports,
      adminActions,
      relatedNotifications,
    ] = await Promise.all([
      // Append-only booking lifecycle log
      db.bookingAuditLog.findMany({
        where: { bookingId },
        orderBy: { timestamp: 'asc' },
      }),
      // Roadside warning acknowledgments (this parker on this space)
      db.roadsideAcknowledgment.findMany({
        where: {
          OR: [
            { bookingId },
            { AND: [{ userId: parkerId }, { spaceId }] },
          ],
        },
        orderBy: { acceptedAt: 'asc' },
      }),
      // Abuse reports involving either party
      db.abuseReport.findMany({
        where: {
          OR: [
            { reportedUserId: parkerId },
            { reportedUserId: ownerId },
            { reportedByUserId: parkerId },
            { reportedByUserId: ownerId },
          ],
        },
        include: {
          reportedUser: { select: { id: true, firstName: true, lastName: true } },
          reportedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Admin actions touching this booking, space, or either user
      db.adminActionLog.findMany({
        where: {
          OR: [
            { targetType: 'BOOKING', targetId: bookingId },
            { targetType: 'SPACE', targetId: String(spaceId) },
            { targetType: 'USER', targetId: { in: [String(parkerId), String(ownerId)] } },
            { targetType: 'DOCUMENT', payload: { path: ['spaceId'], equals: spaceId } },
          ],
        },
        orderBy: { timestamp: 'asc' },
      }),
      // Notifications carrying this bookingId in their metadata
      db.notification.findMany({
        where: {
          OR: [
            { metadata: { path: ['bookingId'], equals: bookingId } },
            {
              userId: { in: [parkerId, ownerId] },
              category: 'BOOKING',
              createdAt: {
                gte: new Date(booking.createdAt.getTime() - 86400000),
                lte: booking.sessionEndedAt
                  ? new Date(booking.sessionEndedAt.getTime() + 86400000)
                  : new Date(),
              },
            },
          ],
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // 3. Build a timeline (event-ordered for UI / PDF rendering)
    type TimelineEvent = {
      timestamp: Date;
      kind: string;
      summary: string;
      actor?: string;
      payload?: any;
    };
    const timeline: TimelineEvent[] = [];

    timeline.push({
      timestamp: booking.createdAt,
      kind: 'BOOKING_CREATED',
      summary: `Booking created by parker (${booking.parker.firstName ?? 'Unknown'})`,
      actor: `parker:${parkerId}`,
    });

    if (booking.consent) {
      timeline.push({
        timestamp: booking.consent.acceptedAt,
        kind: 'BOOKING_CONSENT',
        summary: 'Parker accepted booking T&C',
        actor: `parker:${parkerId}`,
        payload: {
          ip: booking.consent.ipAddress,
          userAgent: booking.consent.userAgent,
          tcVersion: booking.consent.tcVersion,
        },
      });
    }

    roadsideAcks.forEach((ack) => {
      timeline.push({
        timestamp: ack.acceptedAt,
        kind: 'ROADSIDE_ACKNOWLEDGED',
        summary: 'Parker acknowledged roadside risk warning',
        actor: `parker:${ack.userId}`,
        payload: { ip: ack.ipAddress, userAgent: ack.userAgent, warningText: ack.warningText },
      });
    });

    bookingAudit.forEach((log) => {
      timeline.push({
        timestamp: log.timestamp,
        kind: log.event,
        summary: `${log.event.replace(/_/g, ' ').toLowerCase()}${
          log.fromStatus && log.toStatus ? ` (${log.fromStatus} → ${log.toStatus})` : ''
        }`,
        actor: log.actorId ? `${log.actorRole?.toLowerCase() ?? 'user'}:${log.actorId}` : 'system',
        payload: { ip: log.ipAddress, userAgent: log.userAgent, ...((log.payload as object) ?? {}) },
      });
    });

    adminActions.forEach((log) => {
      timeline.push({
        timestamp: log.timestamp,
        kind: log.action,
        summary: `Admin: ${log.action.replace(/_/g, ' ').toLowerCase()} on ${log.targetType.toLowerCase()} ${log.targetId}`,
        actor: log.adminId ? `admin:${log.adminId}` : 'admin:unknown',
        payload: { ip: log.ipAddress, userAgent: log.userAgent, reason: log.reason },
      });
    });

    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      success: true,
      caseRef: `CASE-${bookingId}`,
      generatedAt: new Date(),
      evidence: {
        booking: {
          id: booking.id,
          status: booking.status,
          duration: booking.duration,
          eta: booking.eta,
          totalAmount: booking.totalAmount,
          paymentMode: booking.paymentMode,
          sessionStartedAt: booking.sessionStartedAt,
          sessionEndedAt: booking.sessionEndedAt,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
        },
        parker: booking.parker,
        vehicle: booking.vehicle,
        owner: booking.space.owner,
        space: {
          id: booking.space.id,
          name: booking.space.name,
          spaceType: booking.space.spaceType,
          address: booking.space.address,
          landmark: booking.space.landmark,
          lat: booking.space.lat,
          lng: booking.space.lng,
          visibility: booking.space.visibility,
          status: booking.space.status,
          capacity: booking.space.capacity,
          hourlyRate: booking.space.hourlyRate,
          availability: booking.space.availability,
          requiresAdminReview: booking.space.requiresAdminReview,
          createdAt: booking.space.createdAt,
          deletedAt: booking.space.deletedAt,
        },
        bookingConsent: booking.consent,
        ownerConsent: booking.space.ownerConsent,
        roadsideAcknowledgments: roadsideAcks,
        documents: booking.space.documents,
        bookingAuditLog: bookingAudit,
        adminActionLog: adminActions,
        abuseReports,
        incidentReports: booking.incidents,
        rating: booking.rating,
        notifications: relatedNotifications,
      },
      timeline,
      counts: {
        bookingAuditEntries: bookingAudit.length,
        roadsideAcks: roadsideAcks.length,
        abuseReports: abuseReports.length,
        adminActions: adminActions.length,
        incidents: booking.incidents.length,
        notifications: relatedNotifications.length,
        documents: booking.space.documents.length,
      },
    };
  },
};
