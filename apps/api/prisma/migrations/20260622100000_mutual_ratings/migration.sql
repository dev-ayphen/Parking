-- Allow mutual (two-directional) ratings: one rating per PERSON per booking,
-- so the parker can rate the owner AND the owner can rate the parker.
DROP INDEX IF EXISTS "Rating_bookingId_key";
CREATE UNIQUE INDEX "Rating_bookingId_raterId_key" ON "Rating"("bookingId", "raterId");
CREATE INDEX IF NOT EXISTS "Rating_rateeId_idx" ON "Rating"("rateeId");
