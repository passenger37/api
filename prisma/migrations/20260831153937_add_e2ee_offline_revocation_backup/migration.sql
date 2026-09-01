-- CreateEnum
CREATE TYPE "E2eeDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "E2eeRevocationReason" AS ENUM ('USER_REQUEST', 'COMPROMISE', 'EXPIRED', 'ADMIN_ACTION');

-- CreateEnum
CREATE TYPE "E2eeBackupStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "e2ee_delivery_queue" (
    "id" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "targetDeviceId" TEXT NOT NULL,
    "status" "E2eeDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_delivery_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_group_delivery_queue" (
    "id" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "targetDeviceId" TEXT NOT NULL,
    "status" "E2eeDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 10,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_group_delivery_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_device_revocations" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "reason" "E2eeRevocationReason" NOT NULL,
    "initiatedByUserId" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "replacementDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_device_revocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_encrypted_backups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "recoveryPasswordHash" TEXT,
    "status" "E2eeBackupStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "e2ee_encrypted_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e2ee_key_transparency_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "epoch" BIGINT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "e2ee_key_transparency_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "e2ee_delivery_queue_targetDeviceId_status_idx" ON "e2ee_delivery_queue"("targetDeviceId", "status");

-- CreateIndex
CREATE INDEX "e2ee_delivery_queue_envelopeId_idx" ON "e2ee_delivery_queue"("envelopeId");

-- CreateIndex
CREATE INDEX "e2ee_delivery_queue_status_nextRetryAt_idx" ON "e2ee_delivery_queue"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "e2ee_group_delivery_queue_targetDeviceId_status_idx" ON "e2ee_group_delivery_queue"("targetDeviceId", "status");

-- CreateIndex
CREATE INDEX "e2ee_group_delivery_queue_envelopeId_idx" ON "e2ee_group_delivery_queue"("envelopeId");

-- CreateIndex
CREATE INDEX "e2ee_group_delivery_queue_status_nextRetryAt_idx" ON "e2ee_group_delivery_queue"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "e2ee_device_revocations_deviceId_idx" ON "e2ee_device_revocations"("deviceId");

-- CreateIndex
CREATE INDEX "e2ee_device_revocations_initiatedByUserId_idx" ON "e2ee_device_revocations"("initiatedByUserId");

-- CreateIndex
CREATE INDEX "e2ee_encrypted_backups_userId_idx" ON "e2ee_encrypted_backups"("userId");

-- CreateIndex
CREATE INDEX "e2ee_encrypted_backups_deviceId_idx" ON "e2ee_encrypted_backups"("deviceId");

-- CreateIndex
CREATE INDEX "e2ee_encrypted_backups_status_idx" ON "e2ee_encrypted_backups"("status");

-- CreateIndex
CREATE INDEX "e2ee_key_transparency_entries_userId_epoch_idx" ON "e2ee_key_transparency_entries"("userId", "epoch");

-- CreateIndex
CREATE UNIQUE INDEX "e2ee_key_transparency_entries_userId_deviceId_epoch_key" ON "e2ee_key_transparency_entries"("userId", "deviceId", "epoch");

-- AddForeignKey
ALTER TABLE "e2ee_delivery_queue" ADD CONSTRAINT "e2ee_delivery_queue_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "e2ee_envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_delivery_queue" ADD CONSTRAINT "e2ee_delivery_queue_targetDeviceId_fkey" FOREIGN KEY ("targetDeviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_group_delivery_queue" ADD CONSTRAINT "e2ee_group_delivery_queue_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "e2ee_group_envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_group_delivery_queue" ADD CONSTRAINT "e2ee_group_delivery_queue_targetDeviceId_fkey" FOREIGN KEY ("targetDeviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_device_revocations" ADD CONSTRAINT "e2ee_device_revocations_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_device_revocations" ADD CONSTRAINT "e2ee_device_revocations_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_encrypted_backups" ADD CONSTRAINT "e2ee_encrypted_backups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_encrypted_backups" ADD CONSTRAINT "e2ee_encrypted_backups_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_key_transparency_entries" ADD CONSTRAINT "e2ee_key_transparency_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_key_transparency_entries" ADD CONSTRAINT "e2ee_key_transparency_entries_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
