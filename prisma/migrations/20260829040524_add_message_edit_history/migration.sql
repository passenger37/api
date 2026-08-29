-- CreateTable
CREATE TABLE "ChannelMessageEdit" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "previousContent" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL,
    "editedByMemberId" TEXT NOT NULL,

    CONSTRAINT "ChannelMessageEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelMessageEdit_messageId_editedAt_id_idx" ON "ChannelMessageEdit"("messageId", "editedAt", "id");

-- CreateIndex
CREATE INDEX "ChannelMessageEdit_editedByMemberId_idx" ON "ChannelMessageEdit"("editedByMemberId");

-- AddForeignKey
ALTER TABLE "ChannelMessageEdit" ADD CONSTRAINT "ChannelMessageEdit_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChannelMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessageEdit" ADD CONSTRAINT "ChannelMessageEdit_editedByMemberId_fkey" FOREIGN KEY ("editedByMemberId") REFERENCES "ServerMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
