-- CreateTable
CREATE TABLE "DirectMessageChannel" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "messageCounter" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectMessageChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "messageSeq" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessageReadState" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadMessageId" TEXT,
    "lastReadAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectMessageReadState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectMessageChannel_userBId_idx" ON "DirectMessageChannel"("userBId");

-- CreateIndex
CREATE INDEX "DirectMessageChannel_lastMessageAt_idx" ON "DirectMessageChannel"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessageChannel_userAId_userBId_key" ON "DirectMessageChannel"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "DirectMessage_channelId_messageSeq_idx" ON "DirectMessage"("channelId", "messageSeq");

-- CreateIndex
CREATE INDEX "DirectMessage_channelId_createdAt_id_idx" ON "DirectMessage"("channelId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "DirectMessage_authorUserId_idx" ON "DirectMessage"("authorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessage_clientMessageId_authorUserId_key" ON "DirectMessage"("clientMessageId", "authorUserId");

-- CreateIndex
CREATE INDEX "DirectMessageReadState_userId_idx" ON "DirectMessageReadState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessageReadState_channelId_userId_key" ON "DirectMessageReadState"("channelId", "userId");

-- AddForeignKey
ALTER TABLE "DirectMessageChannel" ADD CONSTRAINT "DirectMessageChannel_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageChannel" ADD CONSTRAINT "DirectMessageChannel_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "DirectMessageChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageReadState" ADD CONSTRAINT "DirectMessageReadState_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "DirectMessageChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageReadState" ADD CONSTRAINT "DirectMessageReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageReadState" ADD CONSTRAINT "DirectMessageReadState_lastReadMessageId_fkey" FOREIGN KEY ("lastReadMessageId") REFERENCES "DirectMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

