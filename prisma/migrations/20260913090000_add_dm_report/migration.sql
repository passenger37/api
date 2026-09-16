-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_parentCommentId_fkey";

-- CreateTable
CREATE TABLE "DmReport" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "reason" "MessageReportReason" NOT NULL,
    "reportPackage" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "handledByUserId" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DmReport_channelId_createdAt_idx" ON "DmReport"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "DmReport_targetUserId_idx" ON "DmReport"("targetUserId");

-- CreateIndex
CREATE INDEX "DmReport_status_idx" ON "DmReport"("status");

-- CreateIndex
CREATE INDEX "DmReport_reporterUserId_idx" ON "DmReport"("reporterUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DmReport_messageId_reporterUserId_key" ON "DmReport"("messageId", "reporterUserId");

-- AddForeignKey
ALTER TABLE "DmReport" ADD CONSTRAINT "DmReport_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "DirectMessageChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmReport" ADD CONSTRAINT "DmReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmReport" ADD CONSTRAINT "DmReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmReport" ADD CONSTRAINT "DmReport_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmReport" ADD CONSTRAINT "DmReport_handledByUserId_fkey" FOREIGN KEY ("handledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

