import { db } from '../config/database';
import { transactionService } from './transaction.service';
import { entitlementService } from './entitlement.service';

const FREE_FEATURES = ['1 parking space', 'Basic listing', 'Email support'];

// Compute the next renewal date from now for a billing cycle.
const nextRenewal = (billingCycle: string): Date => {
  const d = new Date();
  if (billingCycle === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
};

const priceForCycle = (plan: any, billingCycle: string): number =>
  billingCycle === 'YEARLY' && plan.yearlyPrice ? plan.yearlyPrice : plan.price;

export const subscriptionService = {
  getMyTransactions: async (userId: number) => {
    const txns = await db.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      success: true,
      transactions: (txns as any[]).map((t) => ({
        id: t.txnNumber,
        type: t.type,
        description: t.description ?? t.type,
        amount: t.amount,
        amountDisplay: `${t.amount >= 0 ? '+' : '-'}₹${Math.abs(t.amount).toLocaleString('en-IN')}`,
        isInflow: t.amount >= 0,
        method: t.paymentMethod,
        status: t.status,
        date: t.createdAt.toISOString(),
      })),
    };
  },

  getAvailablePlans: async () => {
    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return {
      success: true,
      plans: (plans as any[]).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        yearlyPrice: p.yearlyPrice,
        billingCycle: p.billingCycle,
        features: p.features,
        iconKey: p.iconKey,
        colorKey: p.colorKey,
      })),
    };
  },

  getSubscription: async (userId: number) => {
    const [subscriptions, availablePlans] = await Promise.all([
      db.subscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { planRef: true },
      }),
      db.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const active = (subscriptions as any[]).find((s) => s.status === 'ACTIVE');

    // Resolve a pending scheduled downgrade's plan name (if any) for display.
    let scheduledDowngrade: { planId: number; planName: string } | null = null;
    if (active?.scheduledDowngradePlanId) {
      const target = (availablePlans as any[]).find((p) => p.id === active.scheduledDowngradePlanId)
        || (await db.subscriptionPlan.findUnique({ where: { id: active.scheduledDowngradePlanId } }));
      if (target) scheduledDowngrade = { planId: target.id, planName: target.name };
    }

    const currentPlan = active
      ? {
          id: active.id,                       // subscription id (for cancel/manage)
          planId: active.planId ?? null,       // catalog plan id (for "current" matching)
          name: active.planRef?.name || active.planName || 'Pro Plan',
          features: active.planRef?.features || [],
          billingCycle: active.plan,
          price: active.price,
          status: active.status,
          renewalDate: active.renewalDate.toISOString(),
          autoRenewal: active.autoRenewal,
          // When auto-renewal is off, the sub will EXPIRE (not renew) on renewalDate.
          willExpireOn: active.autoRenewal ? null : active.renewalDate.toISOString(),
          scheduledDowngrade,
        }
      : {
          id: null,
          planId: null,
          name: 'Free Plan',
          features: FREE_FEATURES,
          billingCycle: null,
          price: 0,
          status: 'ACTIVE',
          renewalDate: null,
          autoRenewal: false,
          willExpireOn: null,
          scheduledDowngrade: null,
        };

    const billingHistory = (subscriptions as any[]).map((s) => {
      const planName = s.planRef?.name || s.planName || 'Subscription';
      return {
        id: `INV-${String(s.id).padStart(3, '0')}`,
        date: s.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        plan: `${planName} - ${s.plan === 'YEARLY' ? 'Yearly' : 'Monthly'}`,
        amount: `₹${s.price}`,
        status: s.status === 'ACTIVE' ? 'Paid' : s.status,
      };
    });

    const availablePlansList = (availablePlans as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      yearlyPrice: p.yearlyPrice,
      features: p.features,
      iconKey: p.iconKey,
      colorKey: p.colorKey,
      // Real capability limits for the feature matrix on the plans screen.
      maxSpaces: p.maxSpaces,
      hasAnalytics: p.hasAnalytics,
      hasFeaturedListing: p.hasFeaturedListing,
      hasCsvExport: p.hasCsvExport,
      hasPrioritySupport: p.hasPrioritySupport,
    }));

    // Entitlements + usage (powers the owner usage meter and expiry banner).
    const entitlements = await entitlementService.getForUser(userId);
    const spacesUsed = await entitlementService.countActiveSpaces(userId);
    const daysRemaining = active
      ? Math.max(0, Math.ceil((active.renewalDate.getTime() - Date.now()) / 86400000))
      : 0;

    return {
      success: true,
      currentPlan,
      billingHistory,
      availablePlans: availablePlansList,
      entitlements,
      usage: {
        spacesUsed,
        maxSpaces: entitlements.maxSpaces,   // -1 = unlimited
        daysRemaining,
        isExpired: !entitlements.isSubscribed,
      },
    };
  },

  /**
   * Subscribe to a plan (or change plan). Price is ALWAYS derived server-side
   * from the catalog — never trusted from the client.
   *
   * Plan-change rules (simple version per spec):
   *  - No active sub, or same/higher-priced plan → take effect IMMEDIATELY:
   *    expire the old active sub and create a fresh ACTIVE one.
   *  - Lower-priced plan while an active sub exists → DOWNGRADE is SCHEDULED for
   *    the current renewal date (the user keeps what they paid for until then).
   */
  subscribe: async (userId: number, data: { planId?: number; billingCycle?: string }) => {
    const billingCycle = data.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY';

    const planId = Number(data.planId);
    if (!planId || Number.isNaN(planId)) throw Object.assign(new Error('planId is required'), { statusCode: 400 });

    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) throw Object.assign(new Error('Subscription plan not found or unavailable'), { statusCode: 404 });

    const finalPrice = priceForCycle(plan, billingCycle);
    if (typeof finalPrice !== 'number' || finalPrice < 0) throw Object.assign(new Error('Invalid plan price'), { statusCode: 400 });

    const current = await db.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    // DOWNGRADE: an active sub on a higher-priced plan moving to a cheaper one →
    // schedule it for renewal instead of switching now.
    if (current && current.planId && current.price > finalPrice) {
      await db.subscription.update({
        where: { id: current.id },
        data: { scheduledDowngradePlanId: planId },
      });
      const updated = await db.subscription.findUnique({ where: { id: current.id }, include: { planRef: true } });
      return {
        success: true,
        scheduled: true,
        effectiveOn: current.renewalDate.toISOString(),
        subscription: updated,
      };
    }

    // IMMEDIATE: new sub or same/upgrade → expire any current active sub and
    // create a fresh ACTIVE one starting today.
    if (current) {
      await db.subscription.update({
        where: { id: current.id },
        data: { status: 'EXPIRED', autoRenewal: false, scheduledDowngradePlanId: null },
      });
    }

    const subscription = await db.subscription.create({
      data: {
        userId,
        planId: plan.id,
        planName: plan.name,
        plan: billingCycle,
        price: finalPrice,
        status: 'ACTIVE',
        renewalDate: nextRenewal(billingCycle),
        autoRenewal: true,
      },
    });

    // Bookkeeping inflow (no real charge yet — payment gateway is future work).
    await transactionService.record({
      type: 'SUBSCRIPTION',
      amount: Math.round(finalPrice),
      status: 'SUCCESS',
      paymentMethod: 'UPI',
      description: `Subscription (${plan.name})`,
      userId,
      subscriptionId: subscription.id,
    });

    return { success: true, scheduled: false, subscription };
  },

  /**
   * Cancel = turn OFF auto-renewal only. The subscription stays ACTIVE until its
   * renewalDate; the daily expiry job then flips it to EXPIRED. NO refund, NO
   * immediate cancellation. Scoped to the caller's own subscription.
   */
  cancelSubscription: async (subscriptionId: number, userId: number) => {
    const result = await db.subscription.updateMany({
      where: { id: subscriptionId, userId, status: 'ACTIVE' },
      data: { autoRenewal: false, scheduledDowngradePlanId: null },
    });
    if (result.count === 0) {
      throw Object.assign(new Error('Active subscription not found'), { statusCode: 404 });
    }
    const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
    return {
      success: true,
      subscription,
      message: subscription
        ? `Auto-renewal turned off. Your plan stays active until ${subscription.renewalDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`
        : 'Auto-renewal turned off.',
    };
  },
};
