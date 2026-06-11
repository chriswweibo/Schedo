ALTER TABLE "Provider" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "Provider" ADD COLUMN "googleId" TEXT;
ALTER TABLE "Provider" ADD COLUMN "googleAccessToken" TEXT;
ALTER TABLE "Provider" ADD COLUMN "googleRefreshToken" TEXT;
ALTER TABLE "Provider" ADD COLUMN "googleTokenExpiry" TIMESTAMP(3);
ALTER TABLE "Provider" ADD COLUMN "googleSyncedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Provider_googleId_key" ON "Provider"("googleId");
