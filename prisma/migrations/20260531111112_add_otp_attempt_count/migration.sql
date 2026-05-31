-- DropIndex
DROP INDEX "public"."otp_tokens_email_createdAt_idx";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "totalAmount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "otp_tokens" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "otp_tokens_email_purpose_createdAt_idx" ON "otp_tokens"("email", "purpose", "createdAt");
