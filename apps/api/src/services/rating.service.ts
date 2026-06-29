import { BookingStatus } from '@prisma/client';
import { db } from '../config/database';
import { AppError } from '../utils/errors';

export const ratingService = {
  /**
   * Parker rates a completed booking (rates the space owner).
   * bookingId is a CUID string. Upserts so re-rating updates the existing record.
   */
  /**
   * Submit a rating on a COMPLETED booking. MUTUAL (Airbnb/Turo-style):
   *   - the PARKER rates the space owner, OR
   *   - the OWNER rates the parker.
   * The rater is whoever is calling; the ratee is the *other* party. One rating
   * per person per booking (unique on bookingId+raterId), so both can rate.
   */
  submitRating: async (userId: number, data: any) => {
    if (!userId) {
      throw new AppError('Authentication required', 401);
    }
    const bookingId = data?.bookingId != null ? String(data.bookingId) : '';
    const rating = Number(data?.rating);
    const review: string | null = data?.review ? String(data.review).trim() : null;

    if (!bookingId) {
      throw new AppError('bookingId is required', 400);
    }
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { id: true, ownerId: true, name: true } } },
    });
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    const ownerId = (booking.space as any)?.ownerId as number | undefined;
    const isParker = booking.parkerId === userId;
    const isOwner = ownerId === userId;
    if (!isParker && !isOwner) {
      throw new AppError('Only the parker or the space owner can rate this booking', 403);
    }
    // Only a genuinely completed stay can be rated — a real, finished session.
    if (booking.status !== BookingStatus.COMPLETED) {
      throw Object.assign(
        new Error('You can only review a booking after the session is completed.'),
        { statusCode: 403 },
      );
    }

    // Ratee is the OTHER party: parker rates owner; owner rates parker.
    const rateeId = isParker ? ownerId : booking.parkerId;
    if (!rateeId) {
      throw new AppError('Other party not found', 400);
    }

    const isUpdate = !!(await db.rating.findUnique({
      where: { bookingId_raterId: { bookingId, raterId: userId } },
      select: { id: true },
    }));

    const result = await db.rating.upsert({
      where: { bookingId_raterId: { bookingId, raterId: userId } },
      create: { bookingId, raterId: userId, rateeId, rating, review },
      update: { rating, review },
    });

    // Context for the controller to notify the rated party live.
    return {
      success: true,
      rating: result,
      direction: isParker ? 'PARKER_RATED_OWNER' : 'OWNER_RATED_PARKER',
      rateeId: rateeId as number,
      ownerId: ownerId as number,
      spaceId: (booking.space as any)?.id as number,
      spaceName: (booking.space as any)?.name as string,
      isUpdate, // true = edited an existing rating (don't re-notify)
    };
  },
};
