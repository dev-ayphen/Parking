import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { db } from '../config/database';
import { auditService } from './audit.service';
import { redis } from '../config/redis';

// Arrival-OTP brute-force lock: N wrong guesses on a booking → short lockout.
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_SECONDS = 15 * 60; // 15 minutes
const otpAttemptKey = (bookingId: string) => `session_otp_attempts:${bookingId}`;

export const bookingService = {
  createBooking: async (parkerId: number, data: any, req?: Request) => {
    const spaceId = parseInt(data.spaceId, 10);
    const vehicleId = parseInt(data.vehicleId, 10);
    const durationHours = parseInt(data.durationHours, 10) || 1;

    if (isNaN(spaceId)) {
      throw Object.assign(new Error('Invalid space ID'), { statusCode: 400 });
    }
    if (isNaN(vehicleId)) {
      throw Object.assign(new Error('Invalid vehicle ID'), { statusCode: 400 });
    }

    // Wrap capacity check + booking creation in a SERIALIZABLE transaction so two
    // parallel requests can't both read capacity=N-1 and both insert (which would
    // exceed capacity). Under Serializable, Postgres aborts one with a
    // serialization failure (P2034); we retry it once — on retry it sees the
    // other's committed row and correctly hits the capacity/one-active guard.
    const runTxn = () => db.$transaction(async (tx) => {
      const space = await tx.space.findUnique({
        where: { id: spaceId },
        select: { ownerId: true, hourlyRate: true, status: true, availability: true, capacity: true },
      });
      if (!space) {
        throw Object.assign(new Error('Space not found'), { statusCode: 404 });
      }
      if (space.status !== 'VERIFIED') {
        throw Object.assign(new Error('This space is not available for booking'), { statusCode: 400 });
      }
      if (space.ownerId === parkerId) {
        throw Object.assign(new Error('Owners cannot book their own parking spaces.'), { statusCode: 403 });
      }

      // Availability schedule validation
      const now = new Date();
      const dayOfWeek = now.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (space.availability === 'Weekdays Only' && isWeekend) {
        throw Object.assign(
          new Error('This space is only available on weekdays (Monday–Friday)'),
          { statusCode: 400 }
        );
      }

      // Verify vehicle belongs to parker
      const vehicle = await tx.vehicle.findFirst({
        where: { id: vehicleId, userId: parkerId },
      });
      if (!vehicle) {
        throw Object.assign(new Error('Vehicle not found or does not belong to you'), { statusCode: 404 });
      }

      // One active booking per parker. A parker who already has an in-flight
      // booking (awaiting approval, approved/arrived, or an active/leaving session)
      // must finish or cancel it before starting another — prevents holding
      // multiple spots and keeps the session bar unambiguous. Checked inside the
      // transaction so two rapid taps can't both pass.
      // (PENDING_APPROVAL covers "pending"; APPROVED covers "arrived" once the OTP
      //  is generated; ACTIVE covers "leaving" once sessionEndedAt is set.)
      const existingActive = await tx.booking.findFirst({
        where: {
          parkerId,
          status: { in: ['PENDING_APPROVAL', 'APPROVED', 'ACTIVE'] },
        },
        select: { id: true },
      });
      if (existingActive) {
        throw Object.assign(
          new Error('You already have an active parking booking. Please complete or cancel your current booking before creating a new one.'),
          { statusCode: 409 }
        );
      }

      // Capacity check inside transaction — atomic with the create below
      const activeCount = await tx.booking.count({
        where: {
          spaceId,
          status: { in: ['PENDING_APPROVAL', 'APPROVED', 'ACTIVE'] },
        },
      });
      if (activeCount >= (space.capacity ?? 1)) {
        throw Object.assign(
          new Error('This space is fully booked. Please try again later.'),
          { statusCode: 409 }
        );
      }

      const totalAmount = space.hourlyRate * durationHours;
      const eta = data.eta ? new Date(data.eta) : new Date();

      return tx.booking.create({
        data: {
          spaceId,
          parkerId,
          vehicleId,
          duration: durationHours,
          eta,
          totalAmount,
          paymentMode: 'DIRECT_AT_SPACE',
          status: 'PENDING_APPROVAL',
        },
        include: {
          space: { select: { id: true, name: true, address: true, hourlyRate: true, ownerId: true } },
          vehicle: { select: { id: true, licensePlate: true, vehicleType: true } },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Retry once if Postgres aborts the txn with a serialization failure (P2034):
    // a concurrent booking committed first, so on retry we re-read and correctly
    // enforce the capacity / one-active-booking guards.
    let booking;
    try {
      booking = await runTxn();
    } catch (err: any) {
      if (err?.code === 'P2034') {
        booking = await runTxn();
      } else {
        throw err;
      }
    }

    await auditService.logBookingEvent({
      bookingId: booking.id,
      event: 'BOOKING_CREATED',
      toStatus: 'PENDING_APPROVAL',
      actorId: parkerId,
      actorRole: 'PARKER',
      payload: { spaceId, vehicleId, durationHours },
      req,
    });

    return booking;
  },

  getMyBookings: async (parkerId: number, limit = 10) => {
    const bookings = await db.booking.findMany({
      where: { parkerId },
      include: {
        space: { select: { id: true, name: true, address: true, hourlyRate: true } },
        vehicle: { select: { licensePlate: true, vehicleType: true } },
        // Include the rating so the home screen can tell a COMPLETED booking
        // apart from one that still needs rating (the rating_pending session bar).
        rating: { select: { id: true, rating: true, review: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return bookings;
  },

  getLiveSessions: async (ownerId: number) => {
    const ownerSpaces = await db.space.findMany({
      where: { ownerId },
      select: { id: true, name: true },
    });
    const spaceIds = ownerSpaces.map((s) => s.id);
    const spaceNameMap: Record<number, string> = {};
    ownerSpaces.forEach((s) => { spaceNameMap[s.id] = s.name; });

    const bookings = await db.booking.findMany({
      where: { spaceId: { in: spaceIds }, status: 'ACTIVE' },
      include: {
        parker: { select: { firstName: true, lastName: true, phone: true } },
        vehicle: { select: { licensePlate: true, vehicleType: true, brandModel: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    return (bookings as any[]).map((b) => {
      const start = b.sessionStartedAt ? new Date(b.sessionStartedAt) : new Date(b.eta || b.createdAt);
      const durationMs = (b.duration || 1) * 60 * 60 * 1000;
      const end = new Date(start.getTime() + durationMs);
      const elapsed = now.getTime() - start.getTime();
      const progressPercent = Math.min(100, Math.round((elapsed / durationMs) * 100));
      const remainingMs = Math.max(0, end.getTime() - now.getTime());
      const remainingH = Math.floor(remainingMs / 3600000);
      const remainingM = Math.floor((remainingMs % 3600000) / 60000);
      const remaining = remainingH > 0 ? `${remainingH}h ${remainingM}m left` : `${remainingM}m left`;

      const parkerName = b.parker?.firstName
        ? `${b.parker.firstName} ${b.parker.lastName || ''}`.trim()
        : b.parker?.phone || 'Unknown';

      return {
        id: String(b.id),
        parker: parkerName,
        vehicle: b.vehicle
          ? `${b.vehicle.brandModel || b.vehicle.vehicleType} (${b.vehicle.licensePlate})`
          : 'Unknown Vehicle',
        space: spaceNameMap[b.spaceId] || 'Unknown Space',
        startTime: start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        endTime: end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        // ISO timestamps so clients can compute live countdowns (the *Time fields
        // above are formatted clock strings for display only).
        startTimeISO: start.toISOString(),
        endTimeISO: end.toISOString(),
        remaining,
        progressPercent,
        // Parker has tapped "I Am Leaving" — owner should confirm exit
        isLeaving: !!b.sessionEndedAt,
        // Time the parker reported leaving (helps the owner verify the exit quickly)
        leftAt: b.sessionEndedAt
          ? new Date(b.sessionEndedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          : null,
      };
    });
  },

  getBooking: async (bookingId: string, requestorId: number, requestorRole: string) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: {
          select: {
            id: true, name: true, address: true, ownerId: true, hourlyRate: true, lat: true, lng: true,
            owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        vehicle: { select: { id: true, licensePlate: true, vehicleType: true } },
        parker: { select: { id: true, firstName: true, lastName: true, phone: true } },
        verification: true,
        rating: { select: { id: true, rating: true, review: true, createdAt: true } },
        // One incident per booking (bookingId is @unique) — lets the receipt screen
        // show the existing report on reload instead of offering "report" again.
        incidents: { select: { id: true, reportType: true, status: true, createdAt: true } },
      },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });

    const isParker = booking.parkerId === requestorId;
    const isOwner = (booking.space as any)?.ownerId === requestorId;
    const isAdmin = requestorRole === 'ADMIN';
    if (!isParker && !isOwner && !isAdmin) {
      throw Object.assign(new Error('Forbidden: You do not have access to this booking'), { statusCode: 403 });
    }

    // Expose owner contact as `phoneNumber` to match the mobile booking screens.
    const ownerRaw = (booking.space as any)?.owner;
    if (ownerRaw) {
      (booking.space as any).owner = {
        id: ownerRaw.id,
        name: [ownerRaw.firstName, ownerRaw.lastName].filter(Boolean).join(' ') || null,
        phoneNumber: ownerRaw.phone || null,
      };
    }
    return { success: true, booking };
  },

  acceptBooking: async (bookingId: string, ownerId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true } } },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    if ((booking.space as any)?.ownerId !== ownerId) {
      throw Object.assign(new Error('Only the space owner can accept bookings'), { statusCode: 403 });
    }
    if (booking.status !== 'PENDING_APPROVAL') {
      throw Object.assign(new Error('Booking is not in pending state'), { statusCode: 400 });
    }
    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { status: 'APPROVED' },
    });
    await auditService.logBookingEvent({
      bookingId, event: 'BOOKING_APPROVED', fromStatus: booking.status, toStatus: 'APPROVED',
      actorId: ownerId, actorRole: 'OWNER', req,
    });
    return { success: true, booking: updated };
  },

  declineBooking: async (bookingId: string, ownerId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true } } },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    if ((booking.space as any)?.ownerId !== ownerId) {
      throw Object.assign(new Error('Only the space owner can decline bookings'), { statusCode: 403 });
    }
    if (!['PENDING_APPROVAL', 'APPROVED'].includes(booking.status)) {
      throw Object.assign(new Error('Booking cannot be declined in its current state'), { statusCode: 400 });
    }
    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { status: 'REJECTED' },
    });
    await auditService.logBookingEvent({
      bookingId, event: 'BOOKING_REJECTED', fromStatus: booking.status, toStatus: 'REJECTED',
      actorId: ownerId, actorRole: 'OWNER', req,
    });
    return { success: true, booking: updated };
  },

  cancelBooking: async (bookingId: string, userId: number, userRole: string, reason?: string, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true, name: true } } },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });

    const ownerId = (booking.space as any)?.ownerId ?? null;
    const isParker = booking.parkerId === userId;
    const isOwner = ownerId === userId;
    const isAdmin = userRole === 'ADMIN';
    if (!isParker && !isOwner && !isAdmin) {
      throw Object.assign(
        new Error('Only the parker, the space owner, or an admin can cancel this booking'),
        { statusCode: 403 }
      );
    }
    // Cancellable while the session hasn't started. Once ACTIVE, exit must go
    // through the proper leaving/release flow, not a cancel.
    if (!['PENDING_APPROVAL', 'APPROVED'].includes(booking.status)) {
      throw Object.assign(
        new Error('This booking can no longer be cancelled (' + booking.status.toLowerCase() + ')'),
        { statusCode: 400 }
      );
    }

    // Tag WHO cancelled, so analytics can separate parker-initiated, owner-
    // initiated, and admin cancellations (no-shows are tagged separately by the
    // expiry loop). Keeps a single CANCELLED status while staying queryable.
    const cancelReason = isAdmin ? 'ADMIN_CANCELLED' : isOwner ? 'OWNER_CANCELLED' : 'USER_CANCELLED';
    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelReason, sessionOtp: null },
    });
    await auditService.logBookingEvent({
      bookingId, event: 'BOOKING_CANCELLED', fromStatus: booking.status, toStatus: 'CANCELLED',
      actorId: userId, actorRole: isAdmin ? 'ADMIN' : isOwner ? 'OWNER' : 'PARKER', req,
      payload: { reason: cancelReason, ...(reason ? { detail: reason } : {}) },
    });

    // Tell the controller who to notify (the OTHER party) and by whom it was cancelled.
    return {
      success: true,
      booking: updated,
      ownerId,
      parkerId: booking.parkerId,
      spaceName: (booking.space as any)?.name ?? 'the space',
      cancelledBy: isAdmin ? 'ADMIN' : isOwner ? 'OWNER' : 'PARKER',
      reason: reason || null,
    };
  },

  verifySessionOtp: async (bookingId: string, data: any, userId?: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true } } },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    // The OWNER enters the OTP the parker shows them on-site.
    if (userId != null && (booking.space as any)?.ownerId !== userId) {
      throw Object.assign(new Error('Only the space owner can verify the arrival OTP'), { statusCode: 403 });
    }
    // Status guard: an OTP only starts a session for an APPROVED booking — never
    // drive a CANCELLED/EXPIRED/already-ACTIVE booking to ACTIVE via a stale code.
    if (booking.status !== 'APPROVED') {
      throw Object.assign(new Error('This booking is no longer awaiting arrival verification.'), { statusCode: 400 });
    }
    if (!booking.sessionOtp) {
      throw Object.assign(new Error('The parker has not generated an OTP yet.'), { statusCode: 400 });
    }

    // Brute-force lock: too many wrong guesses on this booking → temporary lockout.
    const key = otpAttemptKey(bookingId);
    const attempts = parseInt((await redis.get(key).catch(() => null)) ?? '0', 10);
    if (attempts >= OTP_MAX_ATTEMPTS) {
      throw Object.assign(
        new Error('Too many incorrect OTP attempts. Please wait a few minutes before trying again.'),
        { statusCode: 429 },
      );
    }

    if (booking.sessionOtp !== String(data.otp)) {
      // Count the failure and (re)set the lock window.
      const next = attempts + 1;
      await redis.set(key, String(next), 'EX', OTP_LOCK_SECONDS).catch(() => {});
      const remaining = Math.max(0, OTP_MAX_ATTEMPTS - next);
      throw Object.assign(
        new Error(`Invalid OTP. ${remaining > 0 ? `${remaining} attempt${remaining === 1 ? '' : 's'} left.` : 'Please wait before retrying.'}`),
        { statusCode: 400 },
      );
    }

    // Success — clear the attempt counter.
    await redis.del(key).catch(() => {});
    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { status: 'ACTIVE', sessionStartedAt: new Date(), sessionOtp: null },
    });
    await auditService.logBookingEvent({
      bookingId, event: 'SESSION_STARTED', fromStatus: booking.status, toStatus: 'ACTIVE',
      actorId: userId ?? booking.parkerId, actorRole: 'OWNER', req,
    });
    return { success: true, booking: updated };
  },

  markLeavingSession: async (bookingId: string, userId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: { select: { ownerId: true, name: true } },
        parker: { select: { firstName: true, lastName: true } },
      },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    // Only the parker on this booking may report they're leaving.
    if (booking.parkerId !== userId) {
      throw Object.assign(new Error('Forbidden: only the parker can leave this session'), { statusCode: 403 });
    }
    if (booking.status !== 'ACTIVE') {
      throw Object.assign(new Error('Booking is not active'), { statusCode: 400 });
    }
    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { sessionEndedAt: new Date() },
    });
    await auditService.logBookingEvent({
      bookingId, event: 'SESSION_LEAVING', fromStatus: booking.status, toStatus: booking.status,
      actorId: booking.parkerId, actorRole: 'PARKER', req,
    });
    const parkerName = booking.parker?.firstName
      ? `${booking.parker.firstName} ${booking.parker.lastName || ''}`.trim()
      : 'The parker';
    return {
      success: true,
      booking: updated,
      ownerId: (booking.space as any)?.ownerId,
      spaceName: (booking.space as any)?.name,
      parkerName,
    };
  },

  releaseSpace: async (bookingId: string, userId: number, data: any, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true, hourlyRate: true } } },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    // Only the space owner may complete (verify exit + finalize the bill).
    if ((booking.space as any)?.ownerId !== userId) {
      throw Object.assign(new Error('Forbidden: only the space owner can complete this session'), { statusCode: 403 });
    }
    // Can only complete an ACTIVE session — never re-complete or complete a
    // non-active booking (prevents double-billing / state corruption).
    if (booking.status !== 'ACTIVE') {
      throw Object.assign(new Error('Only an active session can be completed'), { statusCode: 400 });
    }

    const entryTime = booking.sessionStartedAt ?? booking.createdAt;
    const now = new Date();
    // The owner MAY supply an earlier exit time (e.g. the car left 20 min ago),
    // but we clamp it server-side to [entryTime, now] so it can never be used to
    // bill the future or before entry — neither under- nor over-charging.
    let exitTime = data?.exitTime ? new Date(data.exitTime) : now;
    if (isNaN(exitTime.getTime())) exitTime = now;
    if (exitTime.getTime() > now.getTime()) exitTime = now;
    if (exitTime.getTime() < entryTime.getTime()) exitTime = entryTime;

    const durationMs = exitTime.getTime() - entryTime.getTime();
    const durationHours = Math.max(0.5, durationMs / (1000 * 60 * 60));
    const hourlyRate = (booking.space as any)?.hourlyRate ?? 0;
    const totalAmount = Math.round(durationHours * hourlyRate);

    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED', sessionEndedAt: exitTime, exitTime, totalAmount },
    });
    await auditService.logBookingEvent({
      bookingId, event: 'SESSION_ENDED', fromStatus: booking.status, toStatus: 'COMPLETED',
      actorId: booking.parkerId, actorRole: 'PARKER', req,
    });
    return {
      success: true,
      booking: updated,
      summary: {
        entryTime,
        exitTime,
        durationHours: Math.round(durationHours * 10) / 10,
        totalAmount,
        parkerId: booking.parkerId,
      },
    };
  },

  submitVerification: async (bookingId: string, ownerId: number, data: any, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true } } },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    if ((booking.space as any)?.ownerId !== ownerId) {
      throw Object.assign(new Error('Only the space owner can submit verification'), { statusCode: 403 });
    }

    const verificationType = data?.verificationType === 'PHOTO_VIDEO' ? 'PHOTO_VIDEO' : 'NO_CONCERN';
    const mediaUrls: string[] = Array.isArray(data?.mediaUrls) ? data.mediaUrls : [];

    // The parker must explicitly review and accept the recorded condition in
    // BOTH cases (no-damage and damage), so we always start unaccepted and wait
    // for their "Accept & Continue". This keeps a clear, auditable consent that
    // they saw what the owner recorded before the session began.
    const verification = await db.conditionVerification.upsert({
      where: { bookingId },
      create: { bookingId, verificationType, mediaUrls, parkerAccepted: false, acceptedAt: null },
      update: { verificationType, mediaUrls, parkerAccepted: false, acceptedAt: null },
    });

    await auditService.logBookingEvent({
      bookingId, event: 'VERIFICATION_SUBMITTED', actorId: ownerId, actorRole: 'OWNER', req,
    });
    return { success: true, verification, parkerId: booking.parkerId, requiresAcknowledgement: true };
  },

  acceptVerification: async (bookingId: string, parkerId: number, req?: Request) => {
    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    if (booking.parkerId !== parkerId) {
      throw Object.assign(new Error('Only the parker can accept verification'), { statusCode: 403 });
    }
    // Mark the damage record acknowledged. This does NOT start the session —
    // the OTP step (verify-otp) is the sole gate that moves status to ACTIVE.
    await db.conditionVerification.updateMany({
      where: { bookingId },
      data: { parkerAccepted: true, acceptedAt: new Date() },
    });
    await auditService.logBookingEvent({
      bookingId, event: 'VERIFICATION_ACCEPTED', fromStatus: booking.status, toStatus: booking.status,
      actorId: parkerId, actorRole: 'PARKER', req,
    });
    return { success: true, acknowledged: true };
  },

  // Returns the condition/damage record in the shape the parker app expects.
  getVerification: async (bookingId: string, requestorId: number, requestorRole: string) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { ownerId: true } }, verification: true },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });

    const isParker = booking.parkerId === requestorId;
    const isOwner = (booking.space as any)?.ownerId === requestorId;
    if (!isParker && !isOwner && requestorRole !== 'ADMIN') {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    }

    const v = (booking as any).verification;
    return {
      success: true,
      verification: v
        ? {
            type: v.verificationType,
            mediaUrls: v.mediaUrls || [],
            parkerAcknowledged: v.parkerAccepted,
            acceptedAt: v.acceptedAt,
          }
        : null,
    };
  },

  recordBookingConsent: async (bookingId: string, data: any) => {
    const consent = await db.bookingConsent.upsert({
      where: { bookingId },
      create: {
        bookingId,
        userId: data.userId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        tcVersion: data.tcVersion ?? null,
        verifiedSurroundings: data.verifiedSurroundings,
        acceptLocalParkingRules: data.acceptLocalParkingRules,
        acceptFineResponsibility: data.acceptFineResponsibility,
        acceptPlatformDisclaimer: data.acceptPlatformDisclaimer,
        acceptParkingTerms: data.acceptParkingTerms,
        platform: data.platform,
        appVersion: data.appVersion,
      },
      update: {
        // Identity fields are intentionally NOT overwritten on update —
        // the original consent identity must remain immutable as evidence.
        verifiedSurroundings: data.verifiedSurroundings,
        acceptLocalParkingRules: data.acceptLocalParkingRules,
        acceptFineResponsibility: data.acceptFineResponsibility,
        acceptPlatformDisclaimer: data.acceptPlatformDisclaimer,
        acceptParkingTerms: data.acceptParkingTerms,
      },
    });
    return { success: true, consent };
  },

  getBookingConsent: async (bookingId: string) => {
    const consent = await db.bookingConsent.findUnique({
      where: { bookingId },
    });
    if (!consent) {
      throw new Error('Booking consent not found');
    }
    return { success: true, consent };
  },

  // All pending/approved bookings across all owner's spaces
  getOwnerRequests: async (ownerId: number) => {
    const ownerSpaces = await db.space.findMany({
      where: { ownerId },
      select: { id: true, name: true },
    });
    const spaceIds = ownerSpaces.map((s) => s.id);
    const spaceNameMap: Record<number, string> = {};
    ownerSpaces.forEach((s) => { spaceNameMap[s.id] = s.name; });

    // PENDING_APPROVAL: owner still needs to accept/reject — show all (they expire in 2 min anyway).
    // APPROVED: only show once the parker has generated their arrival OTP (sessionOtp IS NOT NULL).
    //   An APPROVED booking with sessionOtp = null means the parker was approved but never arrived;
    //   showing it in the verify tab would create stale "ghost" cards.
    const bookings = await db.booking.findMany({
      where: {
        spaceId: { in: spaceIds },
        OR: [
          { status: 'PENDING_APPROVAL' },
          { status: 'APPROVED', sessionOtp: { not: null } },
        ],
      },
      include: {
        parker: { select: { id: true, firstName: true, lastName: true, phone: true } },
        vehicle: { select: { licensePlate: true, vehicleType: true, brandModel: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return (bookings as any[]).map((b) => ({
      ...b,
      spaceName: spaceNameMap[b.spaceId] || 'Unknown Space',
      parkerName: b.parker?.firstName
        ? `${b.parker.firstName} ${b.parker.lastName || ''}`.trim()
        : b.parker?.phone || 'Unknown',
    }));
  },

  // Parker notifies owner they have arrived
  markParkerArrived: async (bookingId: string, parkerId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: { select: { ownerId: true, name: true } },
        parker: { select: { firstName: true, lastName: true, phone: true } },
        vehicle: { select: { licensePlate: true } },
      },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    if (booking.parkerId !== parkerId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    if (booking.status !== 'APPROVED') {
      throw Object.assign(new Error('Booking must be approved before marking arrival'), { statusCode: 400 });
    }
    await auditService.logBookingEvent({
      bookingId, event: 'PARKER_ARRIVED', fromStatus: booking.status, toStatus: booking.status,
      actorId: parkerId, actorRole: 'PARKER', req,
    });
    const parkerName = booking.parker?.firstName
      ? `${booking.parker.firstName} ${booking.parker.lastName || ''}`.trim()
      : booking.parker?.phone || 'Parker';
    return {
      success: true,
      ownerId: (booking.space as any)?.ownerId,
      spaceName: (booking.space as any)?.name,
      parkerName,
      vehicleNumber: booking.vehicle?.licensePlate,
      bookingId,
    };
  },

  // Parker updates their ETA
  updateEta: async (bookingId: string, parkerId: number, eta: Date, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: { select: { ownerId: true, name: true } },
        parker: { select: { firstName: true, lastName: true } },
      },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    if (booking.parkerId !== parkerId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    if (!['PENDING_APPROVAL', 'APPROVED'].includes(booking.status)) {
      throw Object.assign(new Error('Cannot update ETA at this stage'), { statusCode: 400 });
    }
    const updated = await db.booking.update({ where: { id: bookingId }, data: { eta } });
    await auditService.logBookingEvent({
      bookingId, event: 'ETA_UPDATED', fromStatus: booking.status, toStatus: booking.status,
      actorId: parkerId, actorRole: 'PARKER', req,
    });
    const parkerName = booking.parker?.firstName
      ? `${booking.parker.firstName} ${booking.parker.lastName || ''}`.trim()
      : 'The parker';
    return {
      success: true,
      booking: updated,
      ownerId: (booking.space as any)?.ownerId,
      spaceName: (booking.space as any)?.name,
      parkerName,
      eta,
    };
  },

  // Parker generates a 4-digit arrival OTP and shows it to the owner on-site
  generateSessionOtp: async (bookingId: string, userId: number, req?: Request) => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: { select: { ownerId: true } },
        parker: { select: { firstName: true, lastName: true } },
      },
    });
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    // The PARKER generates their arrival OTP and shows it to the owner on-site.
    if (booking.parkerId !== userId) {
      throw Object.assign(new Error('Only the parker can generate the arrival OTP'), { statusCode: 403 });
    }
    if (booking.status !== 'APPROVED') {
      throw Object.assign(new Error('OTP can only be generated for approved bookings'), { statusCode: 400 });
    }
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    await db.booking.update({ where: { id: bookingId }, data: { sessionOtp: otp } });
    await auditService.logBookingEvent({
      bookingId, event: 'OTP_GENERATED', fromStatus: booking.status, toStatus: booking.status,
      actorId: userId, actorRole: 'PARKER', req,
    });
    const parkerName = (booking as any).parker?.firstName
      ? `${(booking as any).parker.firstName} ${(booking as any).parker.lastName || ''}`.trim()
      : null;
    return { success: true, otp, bookingId, ownerId: (booking.space as any)?.ownerId ?? null, parkerName };
  },
};
