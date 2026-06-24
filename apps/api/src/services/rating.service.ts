import { db } from '../config/database';

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
      throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
    }
    const bookingId = data?.bookingId != null ? String(data.bookingId) : '';
    const rating = Number(data?.rating);
    const review: string | null = data?.review ? String(data.review).trim() : null;

    if (!bookingId) {
      throw Object.assign(new Error('bookingId is required'), { statusCode: 400 });
    }
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw Object.assign(new Error('Rating must be between 1 and 5'), { statusCode: 400 });
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { space: { select: { id: true, ownerId: true, name: true } } },
    });
    if (!booking) {
      throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    }

    const ownerId = (booking.space as any)?.ownerId as number | undefined;
    const isParker = booking.parkerId === userId;
    const isOwner = ownerId === userId;
    if (!isParker && !isOwner) {
      throw Object.assign(new Error('Only the parker or the space owner can rate this booking'), { statusCode: 403 });
    }
    // Only a genuinely completed stay can be rated — a real, finished session.
    if (booking.status !== 'COMPLETED') {
      throw Object.assign(
        new Error('You can only review a booking after the session is completed.'),
        { statusCode: 403 },
      );
    }

    // Ratee is the OTHER party: parker rates owner; owner rates parker.
    const rateeId = isParker ? ownerId : booking.parkerId;
    if (!rateeId) {
      throw Object.assign(new Error('Other party not found'), { statusCode: 400 });
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
