-- Messaging Media/Attachment Backend Part 1 (Basic upload path).
--
-- Message attachments follow the signed-upload flow:
--   Client -> Backend authorization -> signed upload URL -> object storage
--   -> message attachment metadata -> message.
--
-- Large binaries never touch PostgreSQL: this table stores metadata only.
-- The bytes live in object storage (MinIO locally, Cloudflare R2 in
-- production) addressed via storageKey.

CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED');

CREATE TABLE "MessageAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT,
  "serverId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING',
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageAttachment_storageKey_key" ON "MessageAttachment"("storageKey");

CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

CREATE INDEX "MessageAttachment_serverId_idx" ON "MessageAttachment"("serverId");

CREATE INDEX "MessageAttachment_channelId_createdAt_idx" ON "MessageAttachment"("channelId", "createdAt");

CREATE INDEX "MessageAttachment_uploadedById_idx" ON "MessageAttachment"("uploadedById");

ALTER TABLE "MessageAttachment"
  ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId")
  REFERENCES "ChannelMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageAttachment"
  ADD CONSTRAINT "MessageAttachment_serverId_fkey" FOREIGN KEY ("serverId")
  REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageAttachment"
  ADD CONSTRAINT "MessageAttachment_channelId_fkey" FOREIGN KEY ("channelId")
  REFERENCES "ServerChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageAttachment"
  ADD CONSTRAINT "MessageAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById")
  REFERENCES "ServerMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;