import { db } from '../config/database';

/**
 * Billing administration: transactions, payouts, refunds, subscriptions, plans.
 * Split out of admin.service.ts for maintainability.
 *
 * NOTE: ParkSwift currently does NOT handle booking money (DIRECT_AT_SPACE).
 * The transaction/refund/payout methods are retained for the eventual
 * subscription-revenue gateway and any historical records.
 */
export const billingAdminService = {
  listTransactions: async (query: any) => {
    const { type, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const typeMap: Record<string, string[]> = {
      'all transactions': [],
      'user payments': ['SUBSCRIPTION', 'BOOKING_PAYMENT'],
      'owner earnings': ['OWNER_PAYOUT'],
      refunds: ['REFUND'],
    };

    const where: any = {};
    if (type) {
      const types = typeMap[String(type).toLowerCase()];
      if (types && types.length > 0) where.type = { in: types };
    }
    if (search) {
      const searchStr = String(search);
      where.OR = [
        { txnNumber: { contains: searchStr, mode: 'insensitive' } },
        { description: { contains: searchStr, mode: 'insensitive' } },
        { entityLabel: { contains: searchStr, mode: 'insensitive' } },
        { user: { firstName: { contains: searchStr, mode: 'insensitive' } } },
        { user: { lastName: { contains: searchStr, mode: 'insensitive' } } },
        { user: { phone: { contains: searchStr } } },
        // Search by amount (as string)
        { amount: isNaN(Number(searchStr)) ? undefined : Number(searchStr) },
        // Search by payment method
        { paymentMethod: { contains: searchStr, mode: 'insensitive' } },
      ].filter(Boolean);
    }

    const [items, total] = await Promise.all([
      db.transaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      }),
      db.transaction.count({ where }),
    ]);

    const mapped = (items as any[]).map((t) => {
      const userName = t.user
        ? [t.user.firstName, t.user.lastName].filter(Boolean).join(' ') || t.user.phone
        : t.entityLabel || '—';
      const sign = t.amount >= 0 ? '+' : '-';
      return {
        id: t.txnNumber,
        rawId: t.id,
        type: t.type,
        description: t.description ?? t.type,
        user: userName,
        userId: t.user?.id,
        amount: t.amount,
        amountDisplay: `${sign}₹${Math.abs(t.amount).toLocaleString('en-IN')}`,
        isInflow: t.amount >= 0,
        method: t.paymentMethod,
        status: t.status,
        date: t.createdAt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }),
        rawDate: t.createdAt,
      };
    });

    return { success: true, transactions: mapped, total, page: Number(page), limit: Number(limit) };
  },

  getPaymentsOverview: async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [revenue30dAgg, pendingPayoutsAgg, refundsAgg, totalBookings, refundCount] = await Promise.all([
      db.transaction.aggregate({
        _sum: { amount: true },
        where: {
          status: 'SUCCESS',
          createdAt: { gte: thirtyDaysAgo },
          type: { in: ['SUBSCRIPTION', 'BOOKING_PAYMENT'] },
        },
      }),
      db.transaction.findMany({
        where: { type: 'OWNER_PAYOUT', status: 'PENDING' },
        select: { amount: true, userId: true, entityLabel: true },
      }),
      db.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'REFUND', status: 'SUCCESS' },
      }),
      db.booking.count(),
      // Count actual refund transactions for refund rate calculation
      db.transaction.count({
        where: { type: 'REFUND', status: 'SUCCESS' },
      }),
    ]);

    const revenue30d = revenue30dAgg._sum.amount ?? 0;
    const pendingPayoutAmount = Math.abs(
      (pendingPayoutsAgg as any[]).reduce((sum, p) => sum + p.amount, 0)
    );
    // Count unique accounts, skipping null/undefined properly
    const pendingPayoutAccounts = new Set(
      (pendingPayoutsAgg as any[])
        .map((p) => p.userId ?? p.entityLabel)
        .filter(Boolean)
    ).size;
    const refundsAmount = Math.abs(refundsAgg._sum.amount ?? 0);
    // Refunds rate: (total refund count / total bookings * 100)
    const refundsRate = totalBookings > 0
      ? Number((refundCount / totalBookings * 100).toFixed(1))
      : 0;

    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
    const prevAgg = await db.transaction.aggregate({
      _sum: { amount: true },
      where: {
        status: 'SUCCESS',
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        type: { in: ['SUBSCRIPTION', 'BOOKING_PAYMENT'] },
      },
    });
    const prevRevenue = prevAgg._sum.amount ?? 0;
    const revenueChange = prevRevenue > 0
      ? Math.round(((revenue30d - prevRevenue) / prevRevenue) * 100)
      : revenue30d > 0 ? 100 : 0;

    const formatRevenue = (val: number) => {
      const abs = Math.abs(val);
      if (abs >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
      if (abs >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
      return `₹${val}`;
    };

    return {
      success: true,
      stats: {
        totalRevenue30d: {
          value: formatRevenue(revenue30d),
          rawValue: revenue30d,
          trend: `${revenueChange >= 0 ? '+' : ''}${revenueChange}%`,
          isPositive: revenueChange >= 0,
        },
        pendingPayouts: {
          value: formatRevenue(pendingPayoutAmount),
          rawValue: pendingPayoutAmount,
          trend: `${pendingPayoutAccounts} account${pendingPayoutAccounts === 1 ? '' : 's'}`,
        },
        refundsProcessed: {
          value: formatRevenue(refundsAmount),
          rawValue: refundsAmount,
          trend: `${refundsRate}% rate`,
        },
      },
    };
  },

  processPayouts: async () => {
    const pending = await db.transaction.findMany({
      where: { type: 'OWNER_PAYOUT', status: 'PENDING' },
      select: { id: true, userId: true },
    });
    if (pending.length === 0) {
      return { success: true, processed: 0, message: 'No pending payouts', userIds: [] };
    }

    // TODO: Fetch owner bank details from database for each pending payout
    // TODO: Call Razorpay API to create transfer using bank details
    // TODO: Track payout ID in the transaction record (store Razorpay transfer ID)
    // For now, mark transactions as SUCCESS; in production, only update after Razorpay confirms

    await db.transaction.updateMany({
      where: { id: { in: pending.map((p) => p.id) } },
      data: { status: 'SUCCESS' },
    });
    const userIds = Array.from(new Set(pending.map((p) => p.userId).filter(Boolean))) as number[];
    for (const uid of userIds) {
      await db.notification.create({
        data: {
          userId: uid,
          title: 'Payout Processed',
          message: 'Your owner payout has been processed successfully.',
          category: 'PAYMENT',
        },
      });
    }
    return { success: true, processed: pending.length, userIds };
  },

  createPayout: async (data: { userId?: number; entityLabel?: string; amount: number; description?: string }) => {
    const last = await db.transaction.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
    const txnNumber = `TXN-${String((last?.id ?? 0) + 1).padStart(4, '0')}`;
    const txn = await db.transaction.create({
      data: {
        txnNumber,
        type: 'OWNER_PAYOUT',
        amount: -Math.round(Math.abs(Number(data.amount))),
        status: 'PENDING',
        paymentMethod: 'Bank Transfer',
        description: data.description || 'Owner Payout',
        userId: data.userId,
        entityLabel: data.entityLabel,
      },
    });
    return { success: true, transaction: txn };
  },

  getTransactionDetails: async (id: number) => {
    const txn = await db.transaction.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true } },
      },
    });
    if (!txn) throw new Error('Transaction not found');

    const refundOf = await db.transaction.findFirst({
      where: { type: 'REFUND', description: { contains: txn.txnNumber } },
      select: { id: true, txnNumber: true, amount: true, status: true, createdAt: true },
    });

    const userLabel = (txn as any).user
      ? `${(txn as any).user.firstName || ''} ${(txn as any).user.lastName || ''}`.trim() || (txn as any).user.phone
      : (txn as any).entityLabel || 'Unknown';

    return {
      success: true,
      transaction: {
        id: txn.id,
        txnNumber: txn.txnNumber,
        type: txn.type,
        description: txn.description,
        amount: txn.amount,
        status: txn.status,
        paymentMethod: txn.paymentMethod,
        entityLabel: (txn as any).entityLabel,
        bookingId: (txn as any).bookingId || null,
        createdAt: txn.createdAt,
        user: (txn as any).user ? {
          id: (txn as any).user.id,
          name: userLabel,
          phone: (txn as any).user.phone,
          email: (txn as any).user.email,
          role: (txn as any).user.role,
        } : null,
        relatedRefund: refundOf,
        isRefundable: ['BOOKING_PAYMENT', 'SUBSCRIPTION'].includes(txn.type) && txn.status === 'SUCCESS' && !refundOf,
      },
    };
  },

  refundTransaction: async (id: number, payload: { reason?: string; amount?: number }) => {
    const original = await db.transaction.findUnique({ where: { id } });
    if (!original) throw new Error('Transaction not found');
    if (!['BOOKING_PAYMENT', 'SUBSCRIPTION'].includes(original.type)) {
      throw new Error('Only booking payments or subscriptions can be refunded');
    }
    if (original.status !== 'SUCCESS') {
      throw new Error('Only successful transactions can be refunded');
    }
    // Exact id match — no more fragile substring matching on the description.
    const existing = await db.transaction.findUnique({
      where: { refundedTxnId: original.id },
    });
    if (existing) throw new Error('This transaction is already refunded');

    const refundAmount = Math.round(
      payload.amount && payload.amount > 0
        ? Math.min(Math.abs(payload.amount), Math.abs(original.amount))
        : Math.abs(original.amount)
    );

    // Race-free txnNumber (derived from the row's own id) + atomic create.
    const refund = await db.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          txnNumber: `PENDING-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
          type: 'REFUND',
          amount: -refundAmount,
          status: 'SUCCESS',
          paymentMethod: original.paymentMethod,
          description: `Refund for ${original.txnNumber}${payload.reason ? ` — ${payload.reason}` : ''}`,
          userId: (original as any).userId ?? null,
          entityLabel: (original as any).entityLabel ?? null,
          refundedTxnId: original.id,
        },
      });
      return tx.transaction.update({
        where: { id: created.id },
        data: { txnNumber: `TXN-${String(created.id).padStart(4, '0')}` },
      });
    });

    return { success: true, refund };
  },

  updateTransactionStatus: async (id: number, status: string) => {
    const allowed = ['SUCCESS', 'PENDING', 'FAILED'];
    if (!allowed.includes(status)) throw new Error(`Status must be one of ${allowed.join(', ')}`);
    const txn = await db.transaction.findUnique({ where: { id } });
    if (!txn) throw new Error('Transaction not found');
    const updated = await db.transaction.update({ where: { id }, data: { status } });
    return { success: true, transaction: updated };
  },

  exportTransactionsCsv: async (filters: { startDate?: string; endDate?: string } = {}) => {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    const txns = await db.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true, phone: true } } },
    });

    // Map status codes to human-readable labels
    const statusLabels: Record<string, string> = {
      SUCCESS: 'Completed',
      PENDING: 'Pending',
      FAILED: 'Failed',
    };

    const header = ['Transaction ID', 'Type', 'Description', 'User/Entity', 'Amount', 'Method', 'Status', 'Date'];
    const rows = (txns as any[]).map((t) => {
      const user = t.user
        ? [t.user.firstName, t.user.lastName].filter(Boolean).join(' ') || t.user.phone
        : t.entityLabel || '';
      return [
        t.txnNumber,
        t.type,
        (t.description ?? '').replace(/"/g, '""'),
        user.replace(/"/g, '""'),
        t.amount,
        t.paymentMethod,
        statusLabels[t.status] || t.status,
        t.createdAt.toISOString(),
      ];
    });

    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c)}"`).join(',')).join('\n');
    return csv;
  },

  // ─── Subscriptions ─────────────────────────────────────────────────
  // ── Subscription analytics (admin dashboard) ────────────────────────────
  getSubscriptionAnalytics: async () => {
    const now = new Date();

    const [statusGroups, activeSubs, allPlans, subRevenueAgg, monthSubs] = await Promise.all([
      // Counts by status.
      db.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
      // Active subscriptions with their plan (for MRR/ARR + distribution).
      db.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, price: true, plan: true, planId: true, planName: true, planRef: { select: { name: true, colorKey: true } } },
      }),
      db.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, colorKey: true } }),
      // Lifetime subscription revenue (all SUCCESS subscription transactions).
      db.transaction.aggregate({ where: { type: 'SUBSCRIPTION', status: 'SUCCESS' }, _sum: { amount: true } }),
      // New subscriptions per month for the last 6 months (growth chart).
      db.subscription.findMany({
        where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
        select: { createdAt: true },
      }),
    ]);

    const countBy = (s: string) => (statusGroups.find((g) => g.status === s)?._count._all ?? 0);
    const totalSubscribers = statusGroups.reduce((sum, g) => sum + g._count._all, 0);
    const active = countBy('ACTIVE');
    const expired = countBy('EXPIRED');
    const cancelled = countBy('CANCELLED');
    const suspended = countBy('SUSPENDED');

    // MRR — normalise each active sub to a monthly figure (yearly ÷ 12).
    const mrr = (activeSubs as any[]).reduce((sum, s) => sum + (s.plan === 'YEARLY' ? s.price / 12 : s.price), 0);
    const arr = mrr * 12;
    const arpu = active > 0 ? mrr / active : 0;
    const lifetimeRevenue = subRevenueAgg._sum.amount ?? 0;

    // Plan distribution (active subscribers per plan).
    const distMap = new Map<string, { name: string; colorKey: string; count: number }>();
    (allPlans as any[]).forEach((p) => distMap.set(p.name, { name: p.name, colorKey: p.colorKey, count: 0 }));
    (activeSubs as any[]).forEach((s) => {
      const name = s.planRef?.name || s.planName || 'Unknown';
      const entry = distMap.get(name) || { name, colorKey: 'blue', count: 0 };
      entry.count += 1;
      distMap.set(name, entry);
    });
    const planDistribution = Array.from(distMap.values());

    // Growth — new subs per month, last 6 months.
    const months: { label: string; key: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), key: `${d.getFullYear()}-${d.getMonth()}`, count: 0 });
    }
    (monthSubs as any[]).forEach((s) => {
      const d = new Date(s.createdAt);
      const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.count += 1;
    });
    const growth = months.map(({ label, count }) => ({ name: label, value: count }));

    const fmt = (n: number) => Math.round(n);
    return {
      success: true,
      counts: { totalSubscribers, active, expired, cancelled, suspended },
      revenue: { mrr: fmt(mrr), arr: fmt(arr), arpu: fmt(arpu), lifetimeRevenue: fmt(lifetimeRevenue) },
      planDistribution,
      growth,
    };
  },

  listSubscriptions: async (query: any) => {
    const { status, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const statusMap: Record<string, string> = {
      'active plans': 'ACTIVE',
      active: 'ACTIVE',
      expired: 'EXPIRED',
      cancelled: 'CANCELLED',
      suspended: 'SUSPENDED',
    };

    const where: any = {};
    if (status) {
      const mapped = statusMap[String(status).toLowerCase()];
      if (mapped) where.status = mapped;
    }
    if (search) {
      where.OR = [
        { user: { firstName: { contains: String(search), mode: 'insensitive' } } },
        { user: { lastName: { contains: String(search), mode: 'insensitive' } } },
        { user: { phone: { contains: String(search) } } },
        { user: { email: { contains: String(search), mode: 'insensitive' } } },
      ];
    }

    const [subs, total, plans] = await Promise.all([
      db.subscription.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          planRef: { select: { id: true, name: true, colorKey: true } },
        },
      }),
      db.subscription.count({ where }),
      db.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } } },
      }),
    ]);

    const statusDisplay: Record<string, string> = {
      ACTIVE: 'Active',
      EXPIRED: 'Expired',
      CANCELLED: 'Cancelled',
      SUSPENDED: 'Suspended',
    };

    const mapped = (subs as any[]).map((s) => {
      const planName = s.planRef?.name || s.planName || 'Basic';
      const isYearly = s.plan === 'YEARLY';
      return {
        id: `SUB-${String(s.id).padStart(4, '0')}`,
        rawId: s.id,
        user: s.user
          ? [s.user.firstName, s.user.lastName].filter(Boolean).join(' ') || s.user.phone
          : '—',
        userId: s.user?.id,
        plan: planName,
        planColor: s.planRef?.colorKey ?? 'blue',
        amount: `₹${s.price.toLocaleString('en-IN')}/${isYearly ? 'yr' : 'mo'}`,
        status: statusDisplay[s.status] ?? s.status,
        renewal: s.renewalDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        autoRenew: s.autoRenewal,
      };
    });

    const planSummaries = (plans as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      yearlyPrice: p.yearlyPrice,
      features: p.features,
      iconKey: p.iconKey,
      colorKey: p.colorKey,
      activeSubscribers: p._count.subscriptions,
    }));

    return { success: true, subscriptions: mapped, plans: planSummaries, total };
  },

  // ── Admin actions on an individual subscription ──────────────────────────
  getSubscriptionDetail: async (subscriptionId: number) => {
    const s: any = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        planRef: { select: { id: true, name: true, colorKey: true } },
      },
    });
    if (!s) throw Object.assign(new Error('Subscription not found'), { statusCode: 404 });

    // Owner's spaces count + lifetime revenue (subscription txns for this owner).
    let spacesCount = 0;
    let ownerRevenue = 0;
    if (s.user?.id) {
      const [sc, rev] = await Promise.all([
        db.space.count({ where: { ownerId: s.user.id, status: { notIn: ['REJECTED', 'BLOCKED'] } } }),
        db.transaction.aggregate({ where: { userId: s.user.id, type: 'SUBSCRIPTION', status: 'SUCCESS' }, _sum: { amount: true } }),
      ]);
      spacesCount = sc;
      ownerRevenue = rev._sum.amount ?? 0;
    }

    return {
      success: true,
      subscription: {
        id: `SUB-${String(s.id).padStart(4, '0')}`,
        rawId: s.id,
        owner: s.user ? {
          id: s.user.id,
          name: [s.user.firstName, s.user.lastName].filter(Boolean).join(' ') || s.user.phone,
          phone: s.user.phone,
          email: s.user.email,
          spacesCount,
          revenue: Math.round(ownerRevenue),
        } : null,
        plan: s.planRef?.name || s.planName || 'Basic',
        planColor: s.planRef?.colorKey ?? 'blue',
        billingCycle: s.plan,
        amount: s.price,
        status: s.status,
        startDate: s.startDate?.toISOString() ?? null,
        renewalDate: s.renewalDate?.toISOString() ?? null,
        autoRenewal: s.autoRenewal,
      },
    };
  },

  // Suspend an ACTIVE subscription (misuse) → premium features lock immediately.
  // `reason` (Fraud / Policy Violation / Fake Listings / Other) is recorded.
  suspendSubscription: async (subscriptionId: number, reason?: string) => {
    const result = await db.subscription.updateMany({
      where: { id: subscriptionId, status: 'ACTIVE' },
      data: { status: 'SUSPENDED', autoRenewal: false },
    });
    if (result.count === 0) throw Object.assign(new Error('Active subscription not found'), { statusCode: 404 });
    const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
    if (sub) {
      const reasonText = reason ? ` Reason: ${reason}.` : '';
      await db.notification.create({
        data: { userId: sub.userId, title: 'Subscription Suspended', message: `Your subscription has been suspended.${reasonText} Please contact support.`, category: 'SUBSCRIPTION' },
      }).catch(() => {});
    }
    return { success: true, subscription: sub, reason: reason ?? null };
  },

  // Lift a suspension → back to ACTIVE.
  reactivateSubscription: async (subscriptionId: number) => {
    const result = await db.subscription.updateMany({
      where: { id: subscriptionId, status: 'SUSPENDED' },
      data: { status: 'ACTIVE' },
    });
    if (result.count === 0) throw Object.assign(new Error('Suspended subscription not found'), { statusCode: 404 });
    const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
    if (sub) {
      await db.notification.create({
        data: { userId: sub.userId, title: 'Subscription Reactivated', message: 'Your subscription has been reactivated.', category: 'SUBSCRIPTION' },
      }).catch(() => {});
    }
    return { success: true, subscription: sub };
  },

  // Extend the renewal date by N days (support goodwill). Works on ACTIVE/SUSPENDED.
  extendSubscription: async (subscriptionId: number, days: number) => {
    const allowed = [7, 30, 60, 90];
    if (!allowed.includes(days)) throw Object.assign(new Error('Extension must be 7, 30, 60, or 90 days'), { statusCode: 400 });
    const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw Object.assign(new Error('Subscription not found'), { statusCode: 404 });
    const base = sub.renewalDate > new Date() ? sub.renewalDate : new Date();
    const newRenewal = new Date(base.getTime() + days * 86400000);
    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: { renewalDate: newRenewal },
    });
    await db.notification.create({
      data: { userId: sub.userId, title: 'Subscription Extended', message: `Your subscription has been extended by ${days} days.`, category: 'SUBSCRIPTION' },
    }).catch(() => {});
    return { success: true, subscription: updated };
  },

  // Force-cancel — admin override. Sets CANCELLED immediately (no refund: refunds
  // are a separate, explicit action on the Payments screen). `reason`
  // (Chargeback / Fraud / Legal Request / Other) is recorded.
  forceCancelSubscription: async (subscriptionId: number, reason?: string) => {
    const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw Object.assign(new Error('Subscription not found'), { statusCode: 404 });
    if (sub.status === 'CANCELLED' || sub.status === 'EXPIRED') {
      throw Object.assign(new Error('Subscription is already inactive'), { statusCode: 400 });
    }
    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED', autoRenewal: false, scheduledDowngradePlanId: null },
    });
    const reasonText = reason ? ` Reason: ${reason}.` : '';
    await db.notification.create({
      data: { userId: sub.userId, title: 'Subscription Cancelled', message: `Your subscription has been cancelled by an administrator.${reasonText} Contact support for details.`, category: 'SUBSCRIPTION' },
    }).catch(() => {});
    return { success: true, subscription: updated, reason: reason ?? null };
  },

  listSubscriptionPlans: async () => {
    const plans = await db.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } } },
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
        isActive: p.isActive,
        sortOrder: p.sortOrder,
        maxSpaces: p.maxSpaces,
        hasAnalytics: p.hasAnalytics,
        hasFeaturedListing: p.hasFeaturedListing,
        hasCsvExport: p.hasCsvExport,
        hasPrioritySupport: p.hasPrioritySupport,
        activeSubscribers: p._count.subscriptions,
      })),
    };
  },

  updateSubscriptionPlan: async (planId: number, data: any) => {
    // Full snapshot of the OLD plan so the controller can audit old→new diffs.
    const existing = await db.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!existing) throw Object.assign(new Error('Plan not found'), { statusCode: 404 });

    const allowed: any = {};
    if (data.name !== undefined) allowed.name = String(data.name);
    if (data.description !== undefined) allowed.description = String(data.description);
    if (data.price !== undefined) allowed.price = Number(data.price);
    if (data.yearlyPrice !== undefined) allowed.yearlyPrice = data.yearlyPrice === null ? null : Number(data.yearlyPrice);
    if (data.features !== undefined) allowed.features = Array.isArray(data.features) ? data.features.map(String) : [];
    if (data.iconKey !== undefined) allowed.iconKey = String(data.iconKey);
    if (data.colorKey !== undefined) allowed.colorKey = String(data.colorKey);
    if (data.isActive !== undefined) allowed.isActive = Boolean(data.isActive);
    // Capability limits (the real, enforced fields).
    if (data.maxSpaces !== undefined) allowed.maxSpaces = Number(data.maxSpaces);
    if (data.hasAnalytics !== undefined) allowed.hasAnalytics = Boolean(data.hasAnalytics);
    if (data.hasFeaturedListing !== undefined) allowed.hasFeaturedListing = Boolean(data.hasFeaturedListing);
    if (data.hasCsvExport !== undefined) allowed.hasCsvExport = Boolean(data.hasCsvExport);
    if (data.hasPrioritySupport !== undefined) allowed.hasPrioritySupport = Boolean(data.hasPrioritySupport);

    const plan = await db.subscriptionPlan.update({ where: { id: planId }, data: allowed });

    // Build an old→new diff of just the changed fields, for the audit log.
    const changes: Record<string, { from: any; to: any }> = {};
    for (const key of Object.keys(allowed)) {
      const before = (existing as any)[key];
      const after = (allowed as any)[key];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changes[key] = { from: before, to: after };
      }
    }

    // Notify ONLY this plan's active subscribers, and ONLY when the price actually changed.
    let notifiedUserIds: number[] = [];
    const priceChanged = !!existing && allowed.price !== undefined && Number(allowed.price) !== Number(existing.price);
    if (priceChanged) {
      const subs = await db.subscription.findMany({
        where: { planId, status: 'ACTIVE' },
        select: { userId: true },
      });
      notifiedUserIds = Array.from(new Set(subs.map((s) => s.userId)));
      if (notifiedUserIds.length > 0) {
        await db.notification.createMany({
          data: notifiedUserIds.map((userId) => ({
            userId,
            title: 'Subscription Price Updated',
            message: `Your ${plan.name} plan price will change to ₹${plan.price}, effective from your next renewal.`,
            category: 'PAYMENT',
            metadata: { planId, oldPrice: existing!.price, newPrice: plan.price },
          })),
        });
      }
    }

    return { success: true, plan, priceChanged, notifiedUserIds, changes };
  },

  createSubscriptionPlan: async (data: any) => {
    if (!data.name || data.price === undefined) {
      throw new Error('name and price are required');
    }
    const maxOrder = await db.subscriptionPlan.aggregate({ _max: { sortOrder: true } });
    const plan = await db.subscriptionPlan.create({
      data: {
        name: String(data.name),
        description: data.description || 'Complete management for space owners.',
        price: Number(data.price),
        yearlyPrice: data.yearlyPrice ? Number(data.yearlyPrice) : null,
        billingCycle: data.billingCycle || 'MONTHLY',
        features: Array.isArray(data.features) ? data.features.map(String) : [],
        iconKey: data.iconKey || 'shield',
        colorKey: data.colorKey || 'blue',
        isActive: data.isActive ?? true,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        maxSpaces: data.maxSpaces !== undefined ? Number(data.maxSpaces) : 2,
        hasAnalytics: Boolean(data.hasAnalytics),
        hasFeaturedListing: Boolean(data.hasFeaturedListing),
        hasCsvExport: Boolean(data.hasCsvExport),
        hasPrioritySupport: Boolean(data.hasPrioritySupport),
      },
    });

    // Announce a NEW, ACTIVE plan to OWNERS who don't already have an active
    // subscription (no point pitching a plan to existing subscribers). Inactive
    // plans (drafts) stay silent. Push goes out via sendToMany; the screen
    // already fetches fresh, so this is the "real-time heads-up" layer.
    let notifiedUserIds: number[] = [];
    if (plan.isActive) {
      const subscribed = await db.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: { userId: true },
      });
      const subscribedSet = new Set(subscribed.map((s) => s.userId));
      const owners = await db.user.findMany({
        where: { role: 'OWNER', status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      });
      notifiedUserIds = owners.map((o) => o.id).filter((id) => !subscribedSet.has(id));

      if (notifiedUserIds.length > 0) {
        await db.notification.createMany({
          data: notifiedUserIds.map((userId) => ({
            userId,
            title: 'New Subscription Plan',
            message: `${plan.name} is now available for ₹${plan.price}/${plan.billingCycle === 'YEARLY' ? 'yr' : 'mo'}. Upgrade to unlock more.`,
            category: 'PAYMENT',
            metadata: { planId: plan.id },
          })),
        });
      }
    }

    return { success: true, plan, notifiedUserIds };
  },
};
