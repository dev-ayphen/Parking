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
      // Skip subscriptions belonging to deleted/banned users — deletion cancels the
      // sub, but this guards any historical orphans so they can never renew or charge.
      where: { status: 'ACTIVE', renewalDate: { lte: now }, user: { deletedAt: null } },
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

            // Space-limit enforcement on downgrade: if the owner now has more
            // active spaces than the new plan allows, warn them. We do NOT
            // silently lock or delete spaces — instead we notify clearly so they
            // can decide which to remove. New space creation will be blocked by
            // assertCanCreateSpace() which re-reads the new plan limit.
            const newMaxSpaces: number = (target as any).maxSpaces ?? 0;
            if (newMaxSpaces >= 0) {
              const activeSpaceCount = await db.space.count({
                where: { ownerId: sub.userId, status: { notIn: ['REJECTED', 'BLOCKED'] }, deletedAt: null },
              });
              if (activeSpaceCount > newMaxSpaces) {
                const excess = activeSpaceCount - newMaxSpaces;
                await db.notification.create({
                  data: {
                    userId: sub.userId,
                    title: 'Action required — space limit exceeded',
                    message: `Your plan changed to ${target.name} (max ${newMaxSpaces} space${newMaxSpaces === 1 ? '' : 's'}). You currently have ${activeSpaceCount} active spaces — ${excess} over the limit. Existing spaces remain visible for now, but you cannot create or edit spaces until you are within the limit. Please remove ${excess} space${excess === 1 ? '' : 's'} to continue.`,
                    category: 'SUBSCRIPTION',
                  },
                }).catch(() => {});
              }
            }

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
   * Send advance renewal reminders at 7, 3, and 1 day(s) before renewal —
   * sent to ALL active subscriptions approaching their renewalDate, with
   * different messaging depending on whether they will renew or expire.
   * Each (subscription, dayBucket) reminder is sent at most once (deduped).
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
          // No autoRenewal filter — both groups get reminded, with different messages.
          renewalDate: { gte: start, lt: end },
          user: { deletedAt: null },
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
        const willRenew = sub.autoRenewal;

        const title = willRenew
          ? `Your ${planName} plan renews ${when}`
          : `Your ${planName} plan expires ${when}`;
        const message = willRenew
          ? `₹${Math.round(sub.price)} will be charged on your renewal date. You can manage auto-renewal from subscription settings.`
          : `Renew now to keep your spaces listed and continue earning. Features will lock after expiry.`;

        await db.notification.create({
          data: {
            userId: sub.userId,
            title,
            message,
            category: 'SUBSCRIPTION',
            metadata: { reminderKey: `sub-${sub.id}-${daysOut}d`, subscriptionId: sub.id, daysOut, willRenew },
          },
        }).catch(() => {});
        emitToUser(sub.userId, 'subscription:updated', { reminder: daysOut, willRenew });
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
