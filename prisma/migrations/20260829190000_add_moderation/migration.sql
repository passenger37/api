-- Messaging Audit and Moderation (40.47).
--
-- Server-scoped moderation, designed around the project's retention stance:
-- member removal is a SOFT operation (ServerMember.removedAt) so message
-- history authored by the removed member is preserved. A banned user cannot
-- rejoin (ServerBan), and every moderation action writes a ModerationAuditLog
-- row for the audit trail.
--
-- E2EE (Type C/D) moderation stance: server-side plaintext moderation of
-- private E2EE content is impossible by design; moderation of encrypted
-- content is client-side / metadata-only and we never decrypt server-side.

CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

CREATE TYPE "MessageReportReason" AS ENUM ('HARASSMENT', 'HATE_SPEECH', 'SPAM', 'NSFW_CONTENT', 'VIOLENCE_OR_GORE', 'SELF_HARM', 'IMPERSONATION', 'COPYRIGHT_VIOLATION', 'MISINFORMATION', 'TOS_VIOLATION', 'OTHER');

CREATE TYPE "UserReportReason" AS ENUM ('HARASSMENT', 'DISRUPTIVE_CONDUCT', 'SPAM_OR_UNWANTED_CONTENT', 'BAN_EVASION', 'INAPPROPRIATE_NAME_OR_AVATAR', 'IMPERSONATION', 'SUSPICIOUS_BEHAVIOR', 'OTHER');

CREATE TYPE "ModerationAction" AS ENUM ('MEMBER_KICKED', 'MEMBER_BANNED', 'MEMBER_UNBANNED', 'MESSAGE_REPORT_RESOLVED', 'USER_REPORT_RESOLVED');

ALTER TABLE "ServerMember" ADD COLUMN "removedAt" TIMESTAMP(3);

CREATE TABLE "ServerBan" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bannedById" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServerBan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServerBan_serverId_userId_key" ON "ServerBan"("serverId", "userId");

CREATE INDEX "ServerBan_serverId_idx" ON "ServerBan"("serverId");

CREATE INDEX "ServerBan_userId_idx" ON "ServerBan"("userId");

CREATE INDEX "ServerBan_bannedById_idx" ON "ServerBan"("bannedById");

ALTER TABLE "ServerBan"
  ADD CONSTRAINT "ServerBan_serverId_fkey" FOREIGN KEY ("serverId")
  REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServerBan"
  ADD CONSTRAINT "ServerBan_userId_fkey" FOREIGN KEY ("userId")
  REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServerBan"
  ADD CONSTRAINT "ServerBan_bannedById_fkey" FOREIGN KEY ("bannedById")
  REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MessageReport" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "reporterMemberId" TEXT NOT NULL,
  "reason" "MessageReportReason" NOT NULL,
  "detailText" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "handledByMemberId" TEXT,
  "handledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageReport_messageId_reporterMemberId_key" ON "MessageReport"("messageId", "reporterMemberId");

CREATE INDEX "MessageReport_serverId_idx" ON "MessageReport"("serverId");

CREATE INDEX "MessageReport_channelId_idx" ON "MessageReport"("channelId");

CREATE INDEX "MessageReport_messageId_idx" ON "MessageReport"("messageId");

CREATE INDEX "MessageReport_status_idx" ON "MessageReport"("status");

CREATE INDEX "MessageReport_reporterMemberId_idx" ON "MessageReport"("reporterMemberId");

CREATE INDEX "MessageReport_handledByMemberId_idx" ON "MessageReport"("handledByMemberId");

ALTER TABLE "MessageReport"
  ADD CONSTRAINT "MessageReport_serverId_fkey" FOREIGN KEY ("serverId")
  REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageReport"
  ADD CONSTRAINT "MessageReport_channelId_fkey" FOREIGN KEY ("channelId")
  REFERENCES "ServerChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageReport"
  ADD CONSTRAINT "MessageReport_messageId_fkey" FOREIGN KEY ("messageId")
  REFERENCES "ChannelMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageReport"
  ADD CONSTRAINT "MessageReport_reporterMemberId_fkey" FOREIGN KEY ("reporterMemberId")
  REFERENCES "ServerMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageReport"
  ADD CONSTRAINT "MessageReport_handledByMemberId_fkey" FOREIGN KEY ("handledByMemberId")
  REFERENCES "ServerMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserReport" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "reporterMemberId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "reason" "UserReportReason" NOT NULL,
  "detailText" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "handledByMemberId" TEXT,
  "handledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserReport_reporterMemberId_targetUserId_key" ON "UserReport"("reporterMemberId", "targetUserId");

CREATE INDEX "UserReport_serverId_idx" ON "UserReport"("serverId");

CREATE INDEX "UserReport_targetUserId_idx" ON "UserReport"("targetUserId");

CREATE INDEX "UserReport_status_idx" ON "UserReport"("status");

CREATE INDEX "UserReport_reporterMemberId_idx" ON "UserReport"("reporterMemberId");

CREATE INDEX "UserReport_handledByMemberId_idx" ON "UserReport"("handledByMemberId");

ALTER TABLE "UserReport"
  ADD CONSTRAINT "UserReport_serverId_fkey" FOREIGN KEY ("serverId")
  REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserReport"
  ADD CONSTRAINT "UserReport_reporterMemberId_fkey" FOREIGN KEY ("reporterMemberId")
  REFERENCES "ServerMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserReport"
  ADD CONSTRAINT "UserReport_targetUserId_fkey" FOREIGN KEY ("targetUserId")
  REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserReport"
  ADD CONSTRAINT "UserReport_handledByMemberId_fkey" FOREIGN KEY ("handledByMemberId")
  REFERENCES "ServerMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ModerationAuditLog" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "actorMemberId" TEXT NOT NULL,
  "action" "ModerationAction" NOT NULL,
  "targetUserId" TEXT,
  "targetMemberId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModerationAuditLog_serverId_createdAt_idx" ON "ModerationAuditLog"("serverId", "createdAt");

CREATE INDEX "ModerationAuditLog_actorMemberId_idx" ON "ModerationAuditLog"("actorMemberId");

CREATE INDEX "ModerationAuditLog_action_idx" ON "ModerationAuditLog"("action");

ALTER TABLE "ModerationAuditLog"
  ADD CONSTRAINT "ModerationAuditLog_serverId_fkey" FOREIGN KEY ("serverId")
  REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationAuditLog"
  ADD CONSTRAINT "ModerationAuditLog_actorMemberId_fkey" FOREIGN KEY ("actorMemberId")
  REFERENCES "ServerMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;