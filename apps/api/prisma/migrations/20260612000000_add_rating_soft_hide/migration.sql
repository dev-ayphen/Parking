-- AlterTable: soft-hide moderation fields on Rating
ALTER TABLE "Rating" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hiddenBy" TEXT,
ADD COLUMN     "hiddenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Rating_isHidden_idx" ON "Rating"("isHidden");
