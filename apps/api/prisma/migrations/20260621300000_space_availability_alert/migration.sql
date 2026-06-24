-- "Notify me when available" alerts for full spaces.
CREATE TABLE "SpaceAvailabilityAlert" (
    "id" SERIAL NOT NULL,
    "spaceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceAvailabilityAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpaceAvailabilityAlert_spaceId_userId_key" ON "SpaceAvailabilityAlert"("spaceId", "userId");
CREATE INDEX "SpaceAvailabilityAlert_spaceId_idx" ON "SpaceAvailabilityAlert"("spaceId");
CREATE INDEX "SpaceAvailabilityAlert_userId_idx" ON "SpaceAvailabilityAlert"("userId");

ALTER TABLE "SpaceAvailabilityAlert" ADD CONSTRAINT "SpaceAvailabilityAlert_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpaceAvailabilityAlert" ADD CONSTRAINT "SpaceAvailabilityAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
