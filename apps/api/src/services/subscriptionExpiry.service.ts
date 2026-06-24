import { db } from '../config/database';
import { emitToUser } from '../app';
import { logEvent } from './log.service';

/**
 * Daily subscription lifecycle job.
 *
 * For every ACTIVE subscription whose renewalDate has passed:
 *  - If a downgrade was scheduled → switch to the cheaper plan and start a fresh
 *    period (renews into the new plan). The downgrade "takes effect at renewal".
 *  - Else if autoRenewal is OFF → EXPIRE the subscription (premium features lock).
 *  - Else (autoRenewal ON, no payment gateway yet) → roll the period forward so
 *    the user keeps access. When a real gateway is integrated this branch will
 *    instead attempt a charge and only renew on success.
 */
export const subscriptionExpiryService = {
  processDueSubscriptions: async () => {
    const now = new Date();
    const due = await db.subscription.findMany({
      where: { status: 'ACTIVE', renewalDate: { lte: now } },
      include: { planRef: true },
    });

    for (const sub of due as any[]) {
      try {
        const cycleMs = sub.plan === 'YEARLY' ? 365 : 30;
        const nextDate = () => {
          const d = new Date();
          if (sub.plan === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
          else d.setMonth(d.getMonth() + 1);
          return d;
        };

        // 1) Scheduled downgrade takes effect now.
        if (sub.scheduledDowngradePlanId) {
          const target = await db.subscriptionPlan.findUnique({ where: { id: sub.scheduledDowngradePlanId } });
          if (target && target.isActive) {
            const price = sub.plan === 'YEARLY' && target.yearlyPrice ? target.yearlyPrice : target.price;
            await db.subscription.update({
              where: { id: sub.id },
              data: {
                planId: target.id,
                planName: target.name,
                price,
                renewalDate: nextDate(),
                scheduledDowngradePlanId: null,
                // Honor the original auto-renewal choice.
              },
            });
            await db.notification.create({
              data: {
                userId: sub.userId,
                title: 'Plan Changed',
                message: `Your subscription has moved to the ${target.name} plan as scheduled.`,
                category: 'SUBSCRIPTION',
              },
            }).catch(() => {});
            emitToUser(sub.userId, 'subscription:updated', { status: 'ACTIVE', planName: target.name });
            continue;
          }
          // Target plan vanished/disabled → fall through to the normal logic.
        }

        // 2) Auto-renewal OFF → expire.
        if (!sub.autoRenewal) {
          await db.subscription.update({ where: { id: sub.id }, data: { status: 'EXPIRED' } });
          await db.notification.create({
            data: {
              userId: sub.userId,
              title: 'Subscription Expired',
              message: 'Your subscription has expired and premium features are now locked. Subscribe again anytime to restore them.',
              category: 'SUBSCRIPTION',
            },
          }).catch(() => {});
          emitToUser(sub.userId, 'subscription:updated', { status: 'EXPIRED' });
          continue;
        }

        // 3) Auto-renewal ON → roll the period forward (no gateway yet).
        await db.subscription.update({
          where: { id: sub.id },
          data: { renewalDate: nextDate(), startDate: now },
        });
        emitToUser(sub.userId, 'subscription:updated', { status: 'ACTIVE', renewed: true });
        void cycleMs; // (kept for clarity / future proration)
      } catch (err) {
        await logEvent('ERROR', 'subscriptions', `Failed processing due subscription ${sub.id}`, { error: (err as Error)?.message }).catch(() => {});
      }
    }

    return { processed: (due as any[]).length };
  },

  /**
   * Send advance renewal reminders at 7, 3, and 1 day(s) before renewal — only
   * for subscriptions that will EXPIRE (autoRenewal off). Each (subscription,
   * dayBucket) reminder is sent at most once, deduped via a metadata marker.
   */
  sendRenewalReminders: async () => {
    const now = new Date();
    let sent = 0;

    for (const daysOut of [7, 3, 1]) {
      // Window: subscriptions whose renewalDate falls on the day `daysOut` ahead.
      const start = new Date(now.getTime() + daysOut * 86400000);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 86400000);

      const subs = await db.subscription.findMany({
        where: {
          status: 'ACTIVE',
          autoRenewal: false, // only those that will actually expire
          renewalDate: { gte: start, lt: end },
        },
        include: { planRef: { select: { name: true } } },
      });

      for (const sub of subs as any[]) {
        // Dedup: skip if we already sent this exact reminder.
        const already = await db.notification.findFirst({
          where: {
            userId: sub.userId,
            category: 'SUBSCRIPTION',
            metadata: { path: ['reminderKey'], equals: `sub-${sub.id}-${daysOut}d` },
          },
          select: { id: true },
        }).catch(() => null);
        if (already) continue;

        const planName = sub.planRef?.name || sub.planName || 'subscription';
        const when = daysOut === 1 ? 'tomorrow' : `in ${daysOut} days`;
        await db.notification.create({
          data: {
            userId: sub.userId,
            title: `Your ${planName} plan expires ${when}`,
            message: `Renew to keep your spaces listed and continue using premium features.`,
            category: 'SUBSCRIPTION',
            metadata: { reminderKey: `sub-${sub.id}-${daysOut}d`, subscriptionId: sub.id, daysOut },
          },
        }).catch(() => {});
        emitToUser(sub.userId, 'subscription:updated', { reminder: daysOut });
        sent++;
      }
    }
    return { sent };
  },

  /**
   * Start the daily loop. Runs once on boot, then every 24h. (A precise midnight
   * cron isn't required — date-based windows catch everything due each sweep.)
   */
  startExpiryLoop: () => {
    const tick = () => {
      subscriptionExpiryService.processDueSubscriptions().catch(() => {});
      subscriptionExpiryService.sendRenewalReminders().catch(() => {});
    };
    tick();
    setInterval(tick, 24 * 60 * 60 * 1000);
    console.log('✅ Subscription expiry loop started (daily: reminders 7/3/1d + expire / downgrade / renew)');
  },
};
