-- Support: assignment, SLA, alternate contact fields. Remove dead isLiveChat.
ALTER TABLE "SupportTicket" DROP COLUMN IF EXISTS "isLiveChat";
ALTER TABLE "SupportTicket" ADD COLUMN "contactName" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "assignedToId" INTEGER;
ALTER TABLE "SupportTicket" ADD COLUMN "slaDueAt" TIMESTAMP(3);
CREATE INDEX "SupportTicket_assignedToId_idx" ON "SupportTicket"("assignedToId");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
