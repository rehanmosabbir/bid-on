-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetOtpCode" TEXT,
ADD COLUMN     "resetOtpExpiresAt" TIMESTAMP(3);
