-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('none', 'pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "kycStatus" "VerificationStatus" NOT NULL DEFAULT 'none',
ADD COLUMN "kycFullName" TEXT,
ADD COLUMN "kycDocumentType" TEXT,
ADD COLUMN "kycDocumentNumber" TEXT,
ADD COLUMN "kycDocumentUrl" TEXT,
ADD COLUMN "kycSubmittedAt" TIMESTAMP(3),
ADD COLUMN "kycReviewedAt" TIMESTAMP(3),
ADD COLUMN "kycRejectReason" TEXT,
ADD COLUMN "bankStatus" "VerificationStatus" NOT NULL DEFAULT 'none',
ADD COLUMN "bankAccountName" TEXT,
ADD COLUMN "bankName" TEXT,
ADD COLUMN "bankAccountNumber" TEXT,
ADD COLUMN "bankBranch" TEXT,
ADD COLUMN "bankRoutingNumber" TEXT,
ADD COLUMN "bankSubmittedAt" TIMESTAMP(3),
ADD COLUMN "bankReviewedAt" TIMESTAMP(3),
ADD COLUMN "bankRejectReason" TEXT;

-- AlterTable
ALTER TABLE "Auction" ADD COLUMN "minBidIncrement" DECIMAL(12,2) NOT NULL DEFAULT 1;
