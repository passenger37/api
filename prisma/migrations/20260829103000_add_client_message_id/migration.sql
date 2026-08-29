ALTER TABLE "ChannelMessage" ADD COLUMN "clientMessageId" TEXT;

CREATE UNIQUE INDEX "ChannelMessage_clientMessageId_authorMemberId_key" ON "ChannelMessage"("clientMessageId", "authorMemberId");
