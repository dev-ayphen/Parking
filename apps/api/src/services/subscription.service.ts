import { db } from '../config/database';
import { transactionService } from './transaction.service';

const FREE_FEATURES = ['1 parking space', 'Basic listing', 'Email support'];

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

    const currentPlan = active
      ? {
          id: active.id,
          name: active.planRef?.name || active.planName || 'Pro Plan',
          features: active.planRef?.features || [],
          billingCycle: active.plan,
          price: active.price,
          status: active.status,
          renewalDate: active.renewalDate.toISOString(),
          autoRenewal: active.autoRenewal,
        }
      : {
          id: null,
          name: 'Free Plan',
          features: FREE_FEATURES,
          billingCycle: null,
          price: 0,
          status: 'ACTIVE',
          renewalDate: null,
          autoRenewal: false,
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
    }));

    return { success: true, currentPlan, billingHistory, availablePlans: availablePlansList };
  },

  subscribe: async (userId: number, data: { planId?: number; plan?: string; price?: number; billingCycle?: string }) => {
    const billingCycle = data.billingCycle || data.plan || 'MONTHLY';

    let planRef: any = null;
    let finalPrice: number;
    let planName: string;

    if (data.planId) {
      planRef = await db.subscriptionPlan.findUnique({ where: { id: data.planId } });
      if (!planRef) throw new Error('Subscription plan not found');
      finalPrice = billingCycle === 'YEARLY' && planRef.yearlyPrice ? planRef.yearlyPrice : planRef.price;
      planName = planRef.name;
    } else {
      if (data.price === undefined) throw new Error('price or planId is required');
      finalPrice = Number(data.price);
      planName = 'Custom';
    }

    await db.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });

    const renewalDate = new Date();
    if (billingCycle === 'YEARLY') {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    const subscription = await db.subscription.create({
      data: {
        userId,
        planId: planRef?.id,
        planName,
        plan: billingCycle,
        price: finalPrice,
        status: 'ACTIVE',
        renewalDate,
        autoRenewal: true,
      },
    });

    // Auto-record the inflow transaction
    await transactionService.record({
      type: 'SUBSCRIPTION',
      amount: finalPrice,
      status: 'SUCCESS',
      paymentMethod: 'UPI',
      description: `Subscription (${planName})`,
      userId,
      subscriptionId: subscription.id,
    });

    return { success: true, subscription };
  },

  cancelSubscription: async (subscriptionId: number) => {
    const subscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED', autoRenewal: false },
    });

    // Issue refund transaction (negative amount)
    if (subscription.price > 0) {
      await transactionService.record({
        type: 'REFUND',
        amount: -subscription.price,
        status: 'SUCCESS',
        paymentMethod: 'UPI',
        description: `Refund (Cancelled ${subscription.planName ?? 'subscription'})`,
        userId: subscription.userId,
        subscriptionId: subscription.id,
      });
    }

    return { success: true, subscription };
  },
};
