-- Default-vehicle support: pre-selected at checkout (roadmap #5).
ALTER TABLE "Vehicle" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Vehicle_userId_idx" ON "Vehicle"("userId");

-- Backfill: mark each user's NEWEST existing vehicle as their default, matching
-- the old checkout behaviour (which auto-selected the most-recently-created
-- vehicle). Users with no vehicles are unaffected.
UPDATE "Vehicle" v
SET "isDefault" = true
FROM (
  SELECT DISTINCT ON ("userId") "id"
  FROM "Vehicle"
  ORDER BY "userId", "createdAt" DESC
) newest
WHERE v."id" = newest."id";
