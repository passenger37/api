-- CreateEnum
CREATE TYPE "E2eeAttachmentStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED', 'DELETED');

-- CreateTable
CREATE TABLE "e2ee_attachments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "groupId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "encryptedFileKey" TEXT NOT NULL,
    "encryptedThumbnailKey" TEXT,
    "thumbnailStorageKey" TEXT,
    "thumbnailMimeType" TEXT,
    "thumbnailSizeBytes" INTEGER,
    "fileHash" TEXT NOT NULL,
    "thumbnailHash" TEXT,
    "status" "E2eeAttachmentStatus" NOT NULL DEFAULT 'PENDING',
    "uploadError" TEXT,
    "messageId" TEXT,
    "senderDeviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "e2ee_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "e2ee_attachments_storageKey_key" ON "e2ee_attachments"("storageKey");

-- CreateIndex
CREATE INDEX "e2ee_attachments_sessionId_idx" ON "e2ee_attachments"("sessionId");

-- CreateIndex
CREATE INDEX "e2ee_attachments_groupId_idx" ON "e2ee_attachments"("groupId");

-- CreateIndex
CREATE INDEX "e2ee_attachments_senderDeviceId_idx" ON "e2ee_attachments"("senderDeviceId");

-- CreateIndex
CREATE INDEX "e2ee_attachments_status_idx" ON "e2ee_attachments"("status");

-- AddForeignKey
ALTER TABLE "e2ee_attachments" ADD CONSTRAINT "e2ee_attachments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "e2ee_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_attachments" ADD CONSTRAINT "e2ee_attachments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "e2ee_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e2ee_attachments" ADD CONSTRAINT "e2ee_attachments_senderDeviceId_fkey" FOREIGN KEY ("senderDeviceId") REFERENCES "e2ee_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
