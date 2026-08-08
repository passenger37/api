-- CreateTable
CREATE TABLE "ChannelMessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelMessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelMessageReaction_messageId_idx" ON "ChannelMessageReaction"("messageId");

-- CreateIndex
CREATE INDEX "ChannelMessageReaction_memberId_idx" ON "ChannelMessageReaction"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelMessageReaction_messageId_memberId_emoji_key" ON "ChannelMessageReaction"("messageId", "memberId", "emoji");

-- AddForeignKey
ALTER TABLE "ChannelMessageReaction" ADD CONSTRAINT "ChannelMessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChannelMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessageReaction" ADD CONSTRAINT "ChannelMessageReaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ServerMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
