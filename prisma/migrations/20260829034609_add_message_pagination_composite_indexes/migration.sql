-- DropIndex
DROP INDEX "public"."ChannelMessage_channelId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."ChannelMessage_parentMessageId_idx";

-- CreateIndex
CREATE INDEX "ChannelMessage_channelId_createdAt_id_idx" ON "ChannelMessage"("channelId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ChannelMessage_parentMessageId_createdAt_id_idx" ON "ChannelMessage"("parentMessageId", "createdAt", "id");
