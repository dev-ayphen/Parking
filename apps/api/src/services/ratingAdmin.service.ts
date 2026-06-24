import { db } from '../config/database';

/**
 * Admin review moderation. Unlike the public reads, this sees ALL reviews
 * (including hidden ones) so an admin can review and restore them. Moderation is
 * SOFT — a review is hidden, never deleted — so it stays auditable and reversible.
 */
const REF = (id: number) => `REV-${String(id).padStart(5, '0')}`;

export const ratingAdminService = {
  /**
   * List reviews for the admin moderation table. Filters:
   *  - status: 'all' | 'visible' | 'hidden'
   *  - search: matches review text, space name, or reviewer name
   * Only ratings that actually carry review TEXT are worth moderating, but we
   * include star-only ratings too so the admin sees the full picture.
   */
  listReviews: async (query: { status?: string; search?: string; page?: number; limit?: number } = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status === 'hidden') where.isHidden = true;
    else if (query.status === 'visible') where.isHidden = false;

    if (query.search) {
      const q = String(query.search);
      where.OR = [
        { review: { contains: q, mode: 'insensitive' } },
        { booking: { space: { name: { contains: q, mode: 'insensitive' } } } },
        { rater: { firstName: { contains: q, mode: 'insensitive' } } },
        { rater: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [rows, total, hiddenCount] = await Promise.all([
      db.rating.findMany({
        where,
        include: {
          rater: { select: { id: true, firstName: true, lastName: true } },
          ratee: { select: { id: true, firstName: true, lastName: true } },
          booking: { select: { parkerId: true, space: { select: { id: true, name: true, ownerId: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.rating.count({ where }),
      db.rating.count({ where: { isHidden: true } }),
    ]);

    const reviews = rows.map((r) => ({
      id: r.id,
      reference: REF(r.id),
      rating: r.rating,
      review: r.review,
      createdAt: r.createdAt,
      isHidden: r.isHidden,
      hiddenBy: r.hiddenBy,
      hiddenAt: r.hiddenAt,
      reviewerName: [r.rater?.firstName, (r.rater as any)?.lastName].filter(Boolean).join(' ') || 'User',
      // Who was rated + which way the review goes (mutual ratings).
      rateeName: [(r as any).ratee?.firstName, (r as any).ratee?.lastName].filter(Boolean).join(' ') || 'User',
      direction: (r as any).rateeId === (r as any).booking?.space?.ownerId
        ? 'PARKER_RATED_OWNER'
        : 'OWNER_RATED_PARKER',
      space: r.booking?.space
        ? { id: r.booking.space.id, name: r.booking.space.name }
        : null,
    }));

    return {
      success: true,
      reviews,
      total,
      hiddenCount,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  /** Hide a review (soft) — excluded from all public reads, stays in the DB. */
  hideReview: async (reviewId: number, adminLabel: string) => {
    const existing = await db.rating.findUnique({ where: { id: reviewId } });
    if (!existing) throw Object.assign(new Error('Review not found'), { statusCode: 404 });

    const updated = await db.rating.update({
      where: { id: reviewId },
      data: { isHidden: true, hiddenBy: adminLabel || 'admin', hiddenAt: new Date() },
    });
    return { success: true, review: { id: updated.id, isHidden: updated.isHidden } };
  },

  /** Restore a previously hidden review. */
  unhideReview: async (reviewId: number) => {
    const existing = await db.rating.findUnique({ where: { id: reviewId } });
    if (!existing) throw Object.assign(new Error('Review not found'), { statusCode: 404 });

    const updated = await db.rating.update({
      where: { id: reviewId },
      data: { isHidden: false, hiddenBy: null, hiddenAt: null },
    });
    return { success: true, review: { id: updated.id, isHidden: updated.isHidden } };
  },
};
