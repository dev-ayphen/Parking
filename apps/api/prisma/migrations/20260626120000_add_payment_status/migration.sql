-- Owner-confirmed payment tracking. The owner taps "Payment Received" once the
-- parker has paid directly (cash or by scanning the owner's UPI QR). ParkSwift
-- never verifies the transfer; this is the owner's own confirmation.
--   paymentStatus: WAITING (default) | PAID  (future: DISPUTED)
--   paymentReceivedAt: timestamp the owner confirmed receipt (null until then)
ALTER TABLE "Booking" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'WAITING';
ALTER TABLE "Booking" ADD COLUMN "paymentReceivedAt" TIMESTAMP(3);
