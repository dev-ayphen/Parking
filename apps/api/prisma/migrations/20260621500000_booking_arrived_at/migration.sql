-- Track parker arrival so the owner sees them on Verify before the OTP exists.
ALTER TABLE "Booking" ADD COLUMN "arrivedAt" TIMESTAMP(3);
