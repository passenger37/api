-- CreateEnum
CREATE TYPE "MentionType" AS ENUM ('MEMBER', 'ROLE', 'EVERYONE');

-- CreateTable
CREATE TABLE "ChannelMention" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "mentionType" "MentionType" NOT NULL,
    "targetMemberId" TEXT,
    "targetRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelMention_messageId_idx" ON "ChannelMention"("messageId");

-- CreateIndex
CREATE INDEX "ChannelMention_serverId_idx" ON "ChannelMention"("serverId");

-- CreateIndex
CREATE INDEX "ChannelMention_targetMemberId_idx" ON "ChannelMention"("targetMemberId");

-- CreateIndex
CREATE INDEX "ChannelMention_targetRoleId_idx" ON "ChannelMention"("targetRoleId");

-- AddForeignKey
ALTER TABLE "ChannelMention" ADD CONSTRAINT "ChannelMention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChannelMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMention" ADD CONSTRAINT "ChannelMention_targetMemberId_fkey" FOREIGN KEY ("targetMemberId") REFERENCES "ServerMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMention" ADD CONSTRAINT "ChannelMention_targetRoleId_fkey" FOREIGN KEY ("targetRoleId") REFERENCES "ServerRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
