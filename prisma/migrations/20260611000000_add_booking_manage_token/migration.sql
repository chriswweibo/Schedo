-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "manageToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_manageToken_key" ON "Booking"("manageToken");
