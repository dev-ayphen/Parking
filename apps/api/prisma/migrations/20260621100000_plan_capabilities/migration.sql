-- Real, enforced plan capabilities (replaces "features are just display text").
-- maxSpaces = -1 means unlimited.
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxSpaces" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "hasAnalytics" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "hasFeaturedListing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "hasCsvExport" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "hasPrioritySupport" BOOLEAN NOT NULL DEFAULT false;

-- Backfill capabilities for the standard catalog tiers.
UPDATE "SubscriptionPlan" SET "maxSpaces" = 2,  "hasAnalytics" = false, "hasFeaturedListing" = false, "hasCsvExport" = false, "hasPrioritySupport" = false WHERE "name" = 'Starter';
UPDATE "SubscriptionPlan" SET "maxSpaces" = 10, "hasAnalytics" = true,  "hasFeaturedListing" = false, "hasCsvExport" = true,  "hasPrioritySupport" = true  WHERE "name" = 'Pro';
UPDATE "SubscriptionPlan" SET "maxSpaces" = -1, "hasAnalytics" = true,  "hasFeaturedListing" = true,  "hasCsvExport" = true,  "hasPrioritySupport" = true  WHERE "name" = 'Business';
