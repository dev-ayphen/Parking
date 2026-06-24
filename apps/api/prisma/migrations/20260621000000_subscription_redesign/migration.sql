-- Subscription redesign: schedule downgrades to take effect at the next renewal
-- instead of applying them immediately. The daily expiry/renewal job reads this.
ALTER TABLE "Subscription" ADD COLUMN "scheduledDowngradePlanId" INTEGER;
