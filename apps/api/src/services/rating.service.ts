import { db } from '../config/database';

export const ratingService = {
  /**
   * Parker rates a completed booking (rates the space owner).
   * bookingId is a CUID string. Upserts so re-rating updates the existing record.
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
    if (booking.parkerId !== userId) {
      throw Object.assign(new Error('Only the parker can rate this booking'), { statusCode: 403 });
    }

    const rateeId = (booking.space as any)?.ownerId;
    if (!rateeId) {
      throw Object.assign(new Error('Space owner not found'), { statusCode: 400 });
    }
    const isUpdate = !!(await db.rating.findUnique({ where: { bookingId }, select: { id: true } }));

    const result = await db.rating.upsert({
      where: { bookingId },
      create: { bookingId, raterId: userId, rateeId, rating, review },
      update: { rating, review },
    });

    // Return the context the controller needs to notify the owner live.
    return {
      success: true,
      rating: result,
      ownerId: rateeId as number,
      spaceId: (booking.space as any)?.id as number,
      spaceName: (booking.space as any)?.name as string,
      isUpdate, // true = parker edited an existing rating (don't re-notify)
    };
  },
};
