-- H2: snapshot the hourly rate on each booking at creation time, so the final
-- bill is computed from the agreed rate, not the space's live (editable) rate.
ALTER TABLE "Booking" ADD COLUMN "ratePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill existing bookings with their space's current rate as the best estimate.
UPDATE "Booking" b
SET "ratePerHour" = s."hourlyRate"
FROM "Space" s
WHERE b."spaceId" = s."id" AND b."ratePerHour" = 0;

-- H7: the reporter FK used onDelete: SetNull on a NOT NULL column, which is
-- invalid (Postgres can't null a NOT NULL column). Make the columns nullable so
-- deleting a reporter retains the report (legal evidence) with a null reporter.
ALTER TABLE "IncidentReport" ALTER COLUMN "reportedByUserId" DROP NOT NULL;
ALTER TABLE "AbuseReport" ALTER COLUMN "reportedByUserId" DROP NOT NULL;

-- M4: track the refunded transaction by exact id (replaces fragile description
-- substring matching where TXN-001 matched TXN-0011).
ALTER TABLE "Transaction" ADD COLUMN "refundedTxnId" INTEGER;
CREATE UNIQUE INDEX "Transaction_refundedTxnId_key" ON "Transaction"("refundedTxnId");
