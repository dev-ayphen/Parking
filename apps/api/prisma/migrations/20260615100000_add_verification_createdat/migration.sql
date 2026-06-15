-- AlterTable: when the owner recorded the vehicle condition
ALTER TABLE "ConditionVerification" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
