-- Recreate the enum so new values can be added inside Prisma's migration transaction.
CREATE TYPE "TransactionStatus_new" AS ENUM ('pending', 'held', 'disputed', 'completed', 'failed', 'refunded');

ALTER TABLE "Transaction" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Transaction"
  ALTER COLUMN "status" TYPE "TransactionStatus_new"
  USING ("status"::text::"TransactionStatus_new");

ALTER TYPE "TransactionStatus" RENAME TO "TransactionStatus_old";
ALTER TYPE "TransactionStatus_new" RENAME TO "TransactionStatus";
DROP TYPE "TransactionStatus_old";

ALTER TABLE "Transaction" ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "Transaction" ADD COLUMN "heldAt" TIMESTAMP(3),
ADD COLUMN "releaseDueAt" TIMESTAMP(3),
ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "releasedAt" TIMESTAMP(3),
ADD COLUMN "disputeReason" TEXT,
ADD COLUMN "disputedAt" TIMESTAMP(3),
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "resolveNote" TEXT;
