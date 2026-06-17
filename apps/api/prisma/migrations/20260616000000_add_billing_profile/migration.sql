-- AlterTable: billing profile fields for subscription invoices / GST
ALTER TABLE "User" ADD COLUMN     "billingName" TEXT,
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "gstin" TEXT;
