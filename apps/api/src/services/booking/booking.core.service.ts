import { Prisma, BookingStatus } from '@prisma/client';
import { Request } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { auditService } from '../audit.service';
import { isSpaceOpenAt, hoursLabel } from '../../utils/availability';
import { storageService } from '../storage.service';
import { BUCKETS } from '../../config/supabase';
import { computeCharge, minimumCharge } from './billing.util';

export const bookingCoreService = {
  createBooking: async (parkerId: number, data: any, req?: Request) => {
    const spaceId = parseInt(data.spaceId, 10);
    const vehicleId = parseInt(data.vehicleId, 10);
    const durationHours = parseInt(data.durationHours, 10) || 1;

    if (isNaN(spaceId)) throw new AppError('Invalid space ID', 400);
    if (isNaN(vehicleId)) throw new AppError('Invalid vehicle ID', 400);

    // Mandatory profile: a parker must have completed their profile (name) before
    // booking, so the space owner always has a real name + phone to contact. The
    // mobile app gates this too, but enforce server-side so it can't be bypassed.
    const parker = await db.user.findUnique({
      where: { id: parkerId },
      select: { isProfileComplete: true, firstName: true },
    });
    if (!parker?.isProfileComplete || !parker.firstName) {
      throw new AppError('Please complete your profile (name) before booking a space.', 403, 'PROFILE_INCOMPLETE');
    }

    // Wrap capacity check + booking creation in a SERIALIZABLE transaction so two
    // parallel requests can't both read capacity=N-1 and both insert (which would
    // exceed capacity). Under Serializable, Postgres aborts one with a
    // serialization failure (P2034); we retry it once — on retry it sees the
    // other's committed row and correctly hits the capacity/one-active guard.
    const runTxn = () => db.$transaction(async (tx) => {
      const space = await tx.space.findUnique({
        where: { id: spaceId },
        select: {
          ownerId: true, hourlyRate: true, status: true, parkingFor: true,
          availability: true, startTime: true, endTime: true, capacity: true,
        },
      });
      if (!space) throw new AppError('Space not found', 404);
      if (space.status !== 'VERIFIED') throw new AppError('This space is not available for booking', 400);
      if (space.ownerId === parkerId) throw new AppError('Owners cannot book their own parking spaces.', 403);

      // Availability schedule validation — enforce the owner's operating window.
      // Covers '24 Hours' (always ok), 'Weekdays Only' (Mon–Fri), and 'Custom
      // Hours' (within startTime–endTime, incl. overnight ranges). Evaluated in
      // IST. We check the ETA (when the parker actually arrives) rather than the
      // request instant, since that's the time the spot is occupied.
      const arrivalAt = data.eta ? new Date(data.eta) : new Date();
      if (!isSpaceOpenAt(space, arrivalAt)) {
        const label = hoursLabel(space);
        const msg = space.availability === 'Weekdays Only'
          ? 'This space is only available on weekdays (Monday–Friday).'
          : `This space is only available during its open hours (${label}). Please pick an arrival time within that window.`;
        throw new AppError(msg, 400);
      }

      const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, userId: parkerId } });
      if (!vehicle) throw new AppError('Vehicle not found or does not belong to you', 404);

      // Vehicle-type gate:
      //   Car space  → Car or Bike allowed (a car slot fits a bike)
      //   Bike space → Bike only (a bike slot is too small for a car)
      //   Both       → Car or Bike allowed
      if (space.parkingFor === 'Bike' && vehicle.vehicleType !== 'BIKE') {
        throw new AppError('This space only accepts bikes. Please book with a bike.', 400);
      }

      // One active booking per parker. A parker who already has an in-flight
      // booking (awaiting approval, approved/arrived, or an active/leaving session)
      // must finish or cancel it before starting another — prevents holding
      // multiple spots and keeps the session bar unambiguous. Checked inside the
      // transaction so two rapid taps can't both pass.
      const existingActive = await tx.booking.findFirst({
        where: {
          parkerId,
          status: { in: [BookingStatus.PENDING_APPROVAL, BookingStatus.APPROVED, BookingStatus.ACTIVE] },
        },
        select: { id: true },
      });
      if (existingActive) {
        throw new AppError(
          'You already have an active parking booking. Please complete or cancel your current booking before creating a new one.',
          409,
        );
      }

      // Capacity check inside transaction — atomic with the create below
      const activeCount = await tx.booking.count({
        where: {
          spaceId,
          status: { in: [BookingStatus.PENDING_APPROVAL, BookingStatus.APPROVED, BookingStatus.ACTIVE] },
        },
      });
      if (activeCount >= (space.capacity ?? 1)) {
        throw new AppError('This space is fully booked. Please try again later.', 409);
      }

      const ratePerHour = space.hourlyRate;
      // Store a clean integer rupee amount — never a fractional float (avoids
      // IEEE-754 drift accumulating across sums/invoices).
      const totalAmount = Math.round(ratePerHour * durationHours);
      const eta = data.eta ? new Date(data.eta) : new Date();

      return tx.booking.create({
        data: {
          spaceId, parkerId, vehicleId,
          duration: durationHours, eta,
          ratePerHour, totalAmount,
          paymentMode: 'DIRECT_AT_SPACE',
          status: BookingStatus.PENDING_APPROVAL,
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
    } catch (err: unknown) {
      if ((err as any)?.code === 'P2034') {
        booking = await runTxn();
      } else {
        throw err;
      }
    }

    await auditService.logBookingEvent({
      bookingId: booking.id,
      event: 'BOOKING_CREATED',
      toStatus: BookingStatus.PENDING_APPROVAL,
      actorId: parkerId,
      actorRole: 'PARKER',
      payload: { spaceId, vehicleId, durationHours },
      req,
    });

    return booking;
  },

  getMyBookings: async (parkerId: number, limit = 10, skip = 0) => {
    const bookings = await db.booking.findMany({
      where: { parkerId },
      include: {
        space: { select: { id: true, name: true, address: true, hourlyRate: true } },
        vehicle: { select: { licensePlate: true, vehicleType: true } },
        // Include ratings so the home screen can tell a COMPLETED booking apart
        // from one the PARKER still needs to rate (the rating_pending session bar).
        ratings: { select: { id: true, rating: true, review: true, raterId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });
    const total = await db.booking.count({ where: { parkerId } });
    // Flatten the PARKER's own rating to `rating` so the mobile contract is
    // unchanged (it reads booking.rating to decide if a review is still pending).
    const mapped = (bookings as any[]).map((b) => ({
      ...b,
      rating: b.ratings?.find((r: any) => r.raterId === parkerId) ?? null,
    }));
    return { bookings: mapped, total };
  },

  getLiveSessions: async (ownerId: number) => {
    const ownerSpaces = await db.space.findMany({
      where: { ownerId },
      select: { id: true, name: true },
    });
    const spaceIds = ownerSpaces.map((s) => s.id);
    const spaceNameMap: Record<number, string> = {};
    ownerSpaces.forEach((s) => { spaceNameMap[s.id] = s.name; });

    // Owner's own UPI ID — used to render their pay-QR on the Live Sessions card so
    // the parker can scan and pay them directly. The app never holds the money.
    const owner = await db.user.findUnique({
      where: { id: ownerId },
      select: { upiId: true, firstName: true, lastName: true },
    });
    const ownerUpiId = owner?.upiId || null;
    const ownerName = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || 'ParkSwift Owner';

    const bookings = await db.booking.findMany({
      where: { spaceId: { in: spaceIds }, status: BookingStatus.ACTIVE },
      include: {
        parker: { select: { firstName: true, lastName: true, phone: true } },
        vehicle: { select: { licensePlate: true, vehicleType: true, brandModel: true } },
        space: { select: { hourlyRate: true } },
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

      // Live charge — recomputed from elapsed time on every fetch (the card polls,
      // so the displayed amount grows naturally). Display-only: the AUTHORITATIVE
      // amount is recomputed again at release. The exit clock stops at sessionEndedAt
      // once the parker reports leaving, so the charge freezes at that point.
      const rate = (b.ratePerHour || b.space?.hourlyRate || 0) as number;
      const chargeUntil = b.sessionEndedAt ? new Date(b.sessionEndedAt) : now;
      const currentCharge = computeCharge(start, chargeUntil, rate);
      const minCharge = minimumCharge(rate);

      const elapsedMin = Math.max(0, Math.floor((chargeUntil.getTime() - start.getTime()) / 60000));
      const elapsedH = Math.floor(elapsedMin / 60);
      const elapsedM = elapsedMin % 60;
      const elapsedLabel = elapsedH > 0 ? `${elapsedH}h ${elapsedM}m` : `${elapsedM}m`;

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
        // Live charge display + the fixed 30-min minimum.
        currentCharge,
        minimumCharge: minCharge,
        elapsedLabel,
        // Owner-confirmed payment (owner taps "Payment Received"). WAITING | PAID.
        paymentStatus: b.paymentStatus || 'WAITING',
        // Owner's UPI (no amount in the QR — one QR works for the whole session;
        // the parker enters the current charge in their UPI app).
        ownerUpiId,
        ownerName,
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
            owner: { select: { id: true, firstName: true, lastName: true, phone: true, upiId: true } },
          },
        },
        vehicle: { select: { id: true, licensePlate: true, vehicleType: true, brandModel: true, frontPhotoUrl: true } },
        parker: { select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true } },
        verification: true,
        ratings: { select: { id: true, rating: true, review: true, createdAt: true, raterId: true } },
        // One incident per booking (bookingId is @unique) — lets the receipt screen
        // show the existing report on reload instead of offering "report" again.
        incidents: { select: { id: true, reportType: true, status: true, createdAt: true } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404);

    // Resolve vehicle front photo storage key → signed public URL
    if ((booking as any).vehicle?.frontPhotoUrl) {
      (booking as any).vehicle.frontPhotoUrl = await storageService
        .resolveUrl((booking as any).vehicle.frontPhotoUrl, BUCKETS.PUBLIC)
        .catch(() => null);
    }

    // Flatten the REQUESTOR's own rating to `rating` so the receipt screen can tell
    // if THEY still need to rate (mobile contract reads booking.rating).
    (booking as any).rating =
      (booking as any).ratings?.find((r: any) => r.raterId === requestorId) ?? null;

    // Parker's reputation (avg of ratings they RECEIVED), shown to the owner on
    // the incoming request so they can screen parkers — like Uber/Turo.
    const pAgg = await db.rating.aggregate({
      where: { rateeId: booking.parkerId, isHidden: false },
      _avg: { rating: true }, _count: { rating: true },
    });
    (booking as any).parkerRating = {
      avg: pAgg._count.rating > 0 ? Math.round((pAgg._avg.rating || 0) * 10) / 10 : 0,
      count: pAgg._count.rating,
    };

    const isParker = booking.parkerId === requestorId;
    const isOwner = (booking.space as any)?.ownerId === requestorId;
    const isAdmin = requestorRole === 'ADMIN';
    if (!isParker && !isOwner && !isAdmin) {
      throw new AppError('Forbidden: You do not have access to this booking', 403);
    }

    // Expose owner contact as `phoneNumber` to match the mobile booking screens.
    const ownerRaw = (booking.space as any)?.owner;
    if (ownerRaw) {
      (booking.space as any).owner = {
        id: ownerRaw.id,
        name: [ownerRaw.firstName, ownerRaw.lastName].filter(Boolean).join(' ') || null,
        phoneNumber: ownerRaw.phone || null,
        // Owner's UPI ID — the parker's active-session screen builds a pay QR from
        // this so they can pay the owner directly (app never handles the money).
        upiId: ownerRaw.upiId || null,
      };
    }
    return { success: true, booking };
  },

  getOwnerRequests: async (ownerId: number) => {
    const ownerSpaces = await db.space.findMany({
      where: { ownerId },
      select: { id: true, name: true },
    });
    const spaceIds = ownerSpaces.map((s) => s.id);
    const spaceNameMap: Record<number, string> = {};
    ownerSpaces.forEach((s) => { spaceNameMap[s.id] = s.name; });

    // PENDING_APPROVAL: owner still needs to accept/reject.
    // APPROVED (any): show all approved bookings so the owner can see who is
    //   en-route vs arrived. The mobile app differentiates:
    //   - no arrivedAt, no sessionOtp → "Parker is on the way" info card
    //   - arrivedAt set               → condition-check flow
    //   - sessionOtp set              → OTP scan flow
    const bookings = await db.booking.findMany({
      where: {
        spaceId: { in: spaceIds },
        OR: [{ status: 'PENDING_APPROVAL' }, { status: 'APPROVED' }],
      },
      include: {
        parker: { select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true } },
        vehicle: { select: { licensePlate: true, vehicleType: true, brandModel: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return (bookings as any[]).map((b) => ({
      ...b,
      arrivedAt: b.arrivedAt ?? null,
      sessionOtp: b.sessionOtp ?? null,
      spaceName: spaceNameMap[b.spaceId] || 'Unknown Space',
      parkerPhotoUrl: b.parker?.photoUrl || null,
      parkerName: b.parker?.firstName
        ? `${b.parker.firstName} ${b.parker.lastName || ''}`.trim()
        : b.parker?.phone || 'Unknown',
    }));
  },
};
