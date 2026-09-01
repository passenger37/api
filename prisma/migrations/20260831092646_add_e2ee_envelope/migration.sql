/*
  Warnings:

  - You are about to drop the column `searchVector` on the `ChannelMessage` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "E2eeEnvelopeType" AS ENUM ('PRE_KEY', 'SIGNAL', 'SENDER_KEY');

-- CreateEnum
CREATE TYPE "E2eeEnvelopeStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- DropIndex
DROP INDEX "public"."ChannelMessage_searchVector_idx";

-- DropIndex
DROP INDEX "public"."MessageReport_serverId_status_id_idx";

-- DropIndex
DROP INDEX "public"."UserReport_serverId_status_id_idx";

-- AlterTable
ALTER TABLE "ChannelMessage" DROP COLUMN "searchVector";

-- AlterTable
ALTER TABLE "MessageAttachment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "e2ee_ratchet_states" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "e2ee_sessions" ALTER COLUMN "archivedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "e2ee_envelopes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "E2eeEnvelopeType" NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "associatedData" TEXT,
    "senderDeviceId" TEXT NOT NULL,
    "recipientDeviceId" TEXT NOT NULL,
    "status" "E2eeEnvelopeStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_envelopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "e2ee_envelopes_recipientDeviceId_status_idx" ON "e2ee_envelopes"("recipientDeviceId", "status");

-- CreateIndex
CREATE INDEX "e2ee_envelopes_senderDeviceId_idx" ON "e2ee_envelopes"("senderDeviceId");

-- CreateIndex
CREATE INDEX "e2ee_envelopes_sessionId_idx" ON "e2ee_envelopes"("sessionId");

-- AddForeignKey
ALTER TABLE "e2ee_envelopes" ADD CONSTRAINT "e2ee_envelopes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "e2ee_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_envelopes" ADD CONSTRAINT "e2ee_envelopes_senderDeviceId_fkey" FOREIGN KEY ("senderDeviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_envelopes" ADD CONSTRAINT "e2ee_envelopes_recipientDeviceId_fkey" FOREIGN KEY ("recipientDeviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
