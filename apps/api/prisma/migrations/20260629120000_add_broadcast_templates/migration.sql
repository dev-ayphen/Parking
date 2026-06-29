-- Reusable broadcast (push) templates for the admin Communications page.
-- Previously stored in browser localStorage; moved to the DB so they persist
-- across storage clears and are shared across admin machines.
CREATE TABLE "BroadcastTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BroadcastTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BroadcastTemplate_createdAt_idx" ON "BroadcastTemplate"("createdAt");
