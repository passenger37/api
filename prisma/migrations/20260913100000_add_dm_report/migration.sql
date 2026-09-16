-- DmReport — user-initiated reporting of a direct message.
--
-- For PRIVATE_E2EE channels the server never holds plaintext: the reporting
-- client decrypts the message locally and submits an explicit "report
-- package" (plaintext body + the user-selected context that justified the
-- report). The package is stored verbatim and is intentionally
-- user-authorized data, so this remains consistent with the
-- "server never decrypts" E2EE model (spec #38).

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
CREATE UNIQUE INDEX "DmReport_messageId_reporterUserId_key" ON "DmReport"("messageId", "reporterUserId");

-- CreateIndex
CREATE INDEX "DmReport_channelId_idx" ON "DmReport"("channelId");

-- CreateIndex
CREATE INDEX "DmReport_targetUserId_idx" ON "DmReport"("targetUserId");

-- CreateIndex
CREATE INDEX "DmReport_status_idx" ON "DmReport"("status");

-- CreateIndex
CREATE INDEX "DmReport_reporterUserId_idx" ON "DmReport"("reporterUserId");

-- CreateIndex
CREATE INDEX "DmReport_handledByUserId_idx" ON "DmReport"("handledByUserId");

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
