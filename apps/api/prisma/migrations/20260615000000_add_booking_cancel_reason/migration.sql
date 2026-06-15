-- AlterTable: reason a booking was cancelled (NO_SHOW vs intentional)
ALTER TABLE "Booking" ADD COLUMN     "cancelReason" TEXT;
