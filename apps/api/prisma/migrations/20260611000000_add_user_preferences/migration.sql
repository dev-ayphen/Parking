-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationServices" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "darkTheme" BOOLEAN NOT NULL DEFAULT false;
