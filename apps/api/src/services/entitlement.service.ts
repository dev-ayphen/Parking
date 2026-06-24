import { db } from '../config/database';

/**
 * A user's effective plan capabilities. Resolved from their ACTIVE subscription's
 * plan, or the FREE defaults when they have no active subscription (or it has
 * expired / been suspended / cancelled).
 *
 * This is the single source of truth for "what is this owner allowed to do".
 */
export interface Entitlements {
  planName: string;       // 'Free' | plan name
  maxSpaces: number;      // -1 = unlimited
  hasAnalytics: boolean;
  hasFeaturedListing: boolean;
  hasCsvExport: boolean;
  hasPrioritySupport: boolean;
  isSubscribed: boolean;  // has an ACTIVE paid subscription
}

// No-subscription tier. Subscription is ParkSwift's ONLY revenue source, so an
// owner with NO active subscription cannot list ANY space (maxSpaces = 0) and
// gets no premium capability. They must subscribe to start earning.
export const FREE_ENTITLEMENTS: Entitlements = {
  planName: 'Free',
  maxSpaces: 0,
  hasAnalytics: false,
  hasFeaturedListing: false,
  hasCsvExport: false,
  hasPrioritySupport: false,
  isSubscribed: false,
};

export const entitlementService = {
  /** Resolve the caller's current entitlements. */
  getForUser: async (userId: number): Promise<Entitlements> => {
    const sub = await db.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { planRef: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub || !sub.planRef) return FREE_ENTITLEMENTS;
    const p: any = sub.planRef;
    return {
      planName: p.name,
      maxSpaces: p.maxSpaces ?? FREE_ENTITLEMENTS.maxSpaces,
      hasAnalytics: !!p.hasAnalytics,
      hasFeaturedListing: !!p.hasFeaturedListing,
      hasCsvExport: !!p.hasCsvExport,
      hasPrioritySupport: !!p.hasPrioritySupport,
      isSubscribed: true,
    };
  },

  /** Count the spaces an owner currently has that count toward their limit. */
  countActiveSpaces: async (userId: number): Promise<number> => {
    // BLOCKED/REJECTED spaces don't consume a slot; everything else does.
    return db.space.count({
      where: { ownerId: userId, status: { notIn: ['REJECTED', 'BLOCKED'] } },
    });
  },

  /**
   * Throw a 403 if the owner has reached their plan's space limit. Call before
   * creating a new space. Unlimited (maxSpaces = -1) never throws.
   */
  assertCanCreateSpace: async (userId: number): Promise<void> => {
    const ent = await entitlementService.getForUser(userId);
    if (ent.maxSpaces < 0) return; // unlimited

    // No active subscription → cannot list any space at all.
    if (!ent.isSubscribed || ent.maxSpaces === 0) {
      throw Object.assign(
        new Error('A subscription is required to list a parking space. Choose a plan to start earning.'),
        { statusCode: 403, code: 'SUBSCRIPTION_REQUIRED' },
      );
    }

    const used = await entitlementService.countActiveSpaces(userId);
    if (used >= ent.maxSpaces) {
      throw Object.assign(
        new Error(`${ent.planName} plan allows a maximum of ${ent.maxSpaces} parking space${ent.maxSpaces === 1 ? '' : 's'}. Upgrade your plan to list more.`),
        { statusCode: 403, code: 'PLAN_LIMIT_REACHED' },
      );
    }
  },

  /** Throw a 403 if the user's plan doesn't include a given capability. */
  assertCapability: async (
    userId: number,
    cap: 'hasAnalytics' | 'hasFeaturedListing' | 'hasCsvExport' | 'hasPrioritySupport',
    label: string,
  ): Promise<void> => {
    const ent = await entitlementService.getForUser(userId);
    if (!ent[cap]) {
      throw Object.assign(
        new Error(`${label} is not available on the ${ent.planName} plan. Upgrade to unlock it.`),
        { statusCode: 403, code: 'PLAN_FEATURE_LOCKED' },
      );
    }
  },
};
