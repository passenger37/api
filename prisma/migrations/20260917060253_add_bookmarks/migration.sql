-- CreateEnum
CREATE TYPE "BookmarkTargetType" AS ENUM ('POST', 'COMMENT', 'MESSAGE', 'VIDEO', 'REEL', 'NEWS', 'MARKETPLACE_LISTING', 'BUSINESS', 'EVENT');

-- CreateEnum
CREATE TYPE "CommunityPostVisibility" AS ENUM ('COMMUNITY_MEMBERS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "CommunityPostContentType" AS ENUM ('TEXT', 'MEDIA', 'MIXED', 'LINK', 'POLL');

-- CreateEnum
CREATE TYPE "CommunityPostStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'LOCKED', 'MODERATION_PENDING', 'DELETED');

-- CreateEnum
CREATE TYPE "PostContentType" AS ENUM ('TEXT', 'MEDIA', 'MIXED', 'LINK', 'POLL');

-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'FRIENDS', 'COMMUNITY', 'SERVER', 'PRIVATE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('ACTIVE', 'DELETED', 'HIDDEN', 'MODERATION_PENDING', 'LOCKED');

-- CreateEnum
CREATE TYPE "PostReportReason" AS ENUM ('HARASSMENT', 'HATE_SPEECH', 'SPAM', 'NSFW_CONTENT', 'VIOLENCE', 'SELF_HARM', 'MISINFORMATION', 'COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "ShareDestinationType" AS ENUM ('DM', 'SERVER_CHANNEL', 'COPY_LINK', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'FIRE', 'CELEBRATE');

-- CreateEnum
CREATE TYPE "DirectMessageKind" AS ENUM ('STANDARD', 'CALL_MISSED', 'CALL_ENDED', 'CALL_REJECTED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "CommunityVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CommunityModerationActionType" AS ENUM ('WARN', 'MUTE', 'BAN', 'DELETE_POST', 'DELETE_COMMENT', 'PIN_POST', 'UNPIN_POST', 'POST_LOCKED', 'POST_UNLOCKED', 'POST_HIDDEN', 'POST_UNHIDDEN', 'POST_PINNED', 'POST_UNPINNED');

-- CreateEnum
CREATE TYPE "CommunityModeratorRole" AS ENUM ('ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "AnonymousChatEndReason" AS ENUM ('NEXT', 'DISCONNECT', 'REPORT', 'BLOCK', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AnonymousChatReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AnonymousChatRoomStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "AnonymousChatSessionStatus" AS ENUM ('WAITING', 'MATCHED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PollStatus" AS ENUM ('OPEN', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('POST', 'IMAGE', 'VIDEO', 'AUDIO', 'POLL', 'MIXED_MEDIA', 'LINK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServerPermission" ADD VALUE 'CHANNEL_CALL_START';
ALTER TYPE "ServerPermission" ADD VALUE 'CHANNEL_CALL_JOIN';
ALTER TYPE "ServerPermission" ADD VALUE 'CHANNEL_CALL_MANAGE';

-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "callId" TEXT,
ADD COLUMN     "kind" "DirectMessageKind" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "DirectMessageChannel" ADD COLUMN     "disappearingTtlSeconds" INTEGER;

-- AlterTable
ALTER TABLE "MessageAttachment" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "BookmarkTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "collectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookmarkCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookmarkCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "metadata" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "ReactionType" NOT NULL,

    CONSTRAINT "PostReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMention" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "length" INTEGER NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "PostMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostHashtag" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostHashtag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "type" "CallType" NOT NULL,
    "scope" "CallScope" NOT NULL,
    "scopeRef" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_participants" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "state" "CallParticipantState" NOT NULL DEFAULT 'JOINED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "NotificationType" NOT NULL,
    "entityType" "NotificationEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "NotificationDeliveryChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "visibility" "CommunityVisibility" NOT NULL DEFAULT 'PUBLIC',
    "discoveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rules" JSONB,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityCategory" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunitySubscription" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunitySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityModerator" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CommunityModeratorRole" NOT NULL DEFAULT 'MODERATOR',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityModerator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "categoryId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookmarkCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "contentType" "CommunityPostContentType" NOT NULL DEFAULT 'TEXT',
    "contentWarning" TEXT,
    "downvoteCount" INTEGER NOT NULL DEFAULT 0,
    "hiddenAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedReason" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderatedByUserId" TEXT,
    "originalPostId" TEXT,
    "quotedPostId" TEXT,
    "repostCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CommunityPostStatus" NOT NULL DEFAULT 'ACTIVE',
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "visibility" "CommunityPostVisibility" NOT NULL DEFAULT 'COMMUNITY_MEMBERS',
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityModerationAction" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "moderatorUserId" TEXT NOT NULL,
    "actionType" "CommunityModerationActionType" NOT NULL,
    "targetUserId" TEXT,
    "objectType" TEXT,
    "objectId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostVote" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" "VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPostVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "mediaId" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "altText" TEXT,
    "focalPointX" DOUBLE PRECISION,
    "focalPointY" DOUBLE PRECISION,
    "userId" TEXT,
    "duration" INTEGER,
    "height" INTEGER,
    "mimeType" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER,

    CONSTRAINT "CommunityPostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostHashtag" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "CommunityPostHashtag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostMention" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "length" INTEGER NOT NULL,

    CONSTRAINT "CommunityPostMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostReport" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" "PostReportReason" NOT NULL,
    "detailText" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "handledByUserId" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPostReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostBookmark" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPostBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostEditHistory" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "previousContent" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedByUserId" TEXT NOT NULL,

    CONSTRAINT "CommunityPostEditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousChatBan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT,
    "reason" TEXT,
    "bannedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AnonymousChatBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousChatMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderParticipantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousChatParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "displayColor" TEXT NOT NULL,
    "avatarEmoji" TEXT,
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "displayId" TEXT NOT NULL,

    CONSTRAINT "AnonymousChatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousChatReport" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "reporterParticipantId" TEXT NOT NULL,
    "targetParticipantId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "status" "AnonymousChatReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),
    "handledByUserId" TEXT,

    CONSTRAINT "AnonymousChatReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousChatRoom" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'general',
    "status" "AnonymousChatRoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "endReason" "AnonymousChatEndReason",
    "endedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),

    CONSTRAINT "AnonymousChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'general',
    "status" "AnonymousChatSessionStatus" NOT NULL DEFAULT 'WAITING',
    "matchedRoomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "AnonymousChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "isMultipleChoice" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" "PollStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "PostType" NOT NULL DEFAULT 'POST',
    "content" TEXT,
    "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "serverId" TEXT,
    "communityId" TEXT,
    "channelId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "contentType" "PostContentType" NOT NULL DEFAULT 'TEXT',
    "contentWarning" TEXT,
    "editedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    "hiddenReason" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT,
    "originalPostId" TEXT,
    "quotedPostId" TEXT,
    "reactionCount" INTEGER NOT NULL DEFAULT 0,
    "repostCount" INTEGER NOT NULL DEFAULT 0,
    "status" "PostStatus" NOT NULL DEFAULT 'ACTIVE',
    "viewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAudio" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "waveform" TEXT,
    "duration" INTEGER,
    "title" TEXT,
    "artist" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostAudio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostImage" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "blurHash" TEXT,
    "dominantColor" TEXT,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSave" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostShare" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT NOT NULL,
    "clientRequestId" TEXT,
    "destinationId" TEXT,
    "destinationType" "ShareDestinationType" NOT NULL,

    CONSTRAINT "PostShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostReport" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" "PostReportReason" NOT NULL,
    "detailText" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "handledByUserId" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostVideo" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "hlsUrl" TEXT,
    "posterUrl" TEXT,
    "duration" INTEGER,
    "codec" TEXT,
    "bitrate" INTEGER,
    "framerate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Bookmark_userId_targetType_createdAt_idx" ON "Bookmark"("userId", "targetType", "createdAt");

-- CreateIndex
CREATE INDEX "Bookmark_collectionId_createdAt_idx" ON "Bookmark"("collectionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_targetType_targetId_key" ON "Bookmark"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "BookmarkCollection_userId_createdAt_idx" ON "BookmarkCollection"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookmarkCollection_userId_name_key" ON "BookmarkCollection"("userId", "name");

-- CreateIndex
CREATE INDEX "PostMedia_postId_idx" ON "PostMedia"("postId");

-- CreateIndex
CREATE INDEX "PostReaction_postId_createdAt_idx" ON "PostReaction"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PostReaction_userId_idx" ON "PostReaction"("userId");

-- CreateIndex
CREATE INDEX "PostReaction_type_idx" ON "PostReaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PostReaction_postId_userId_key" ON "PostReaction"("postId", "userId");

-- CreateIndex
CREATE INDEX "PostMention_postId_idx" ON "PostMention"("postId");

-- CreateIndex
CREATE INDEX "PostMention_mentionedUserId_idx" ON "PostMention"("mentionedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PostMention_postId_mentionedUserId_key" ON "PostMention"("postId", "mentionedUserId");

-- CreateIndex
CREATE INDEX "PostHashtag_tag_idx" ON "PostHashtag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "PostHashtag_postId_tag_key" ON "PostHashtag"("postId", "tag");

-- CreateIndex
CREATE INDEX "calls_creatorUserId_idx" ON "calls"("creatorUserId");

-- CreateIndex
CREATE INDEX "calls_scope_scopeRef_idx" ON "calls"("scope", "scopeRef");

-- CreateIndex
CREATE INDEX "calls_status_idx" ON "calls"("status");

-- CreateIndex
CREATE INDEX "call_participants_userId_idx" ON "call_participants"("userId");

-- CreateIndex
CREATE INDEX "call_participants_callId_idx" ON "call_participants"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "call_participants_callId_userId_deviceId_key" ON "call_participants"("callId", "userId", "deviceId");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_createdAt_idx" ON "Notification"("recipientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_readAt_idx" ON "Notification"("recipientUserId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_type_createdAt_idx" ON "Notification"("recipientUserId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_recipientUserId_dedupeKey_key" ON "Notification"("recipientUserId", "dedupeKey");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_notificationType_key" ON "NotificationPreference"("userId", "notificationType");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");

-- CreateIndex
CREATE INDEX "NotificationDelivery_channel_status_idx" ON "NotificationDelivery"("channel", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_ownerId_idx" ON "Community"("ownerId");

-- CreateIndex
CREATE INDEX "Community_visibility_discoveryEnabled_idx" ON "Community"("visibility", "discoveryEnabled");

-- CreateIndex
CREATE INDEX "Community_name_idx" ON "Community"("name");

-- CreateIndex
CREATE INDEX "CommunityCategory_communityId_position_idx" ON "CommunityCategory"("communityId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityCategory_communityId_name_key" ON "CommunityCategory"("communityId", "name");

-- CreateIndex
CREATE INDEX "CommunitySubscription_userId_idx" ON "CommunitySubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunitySubscription_communityId_userId_key" ON "CommunitySubscription"("communityId", "userId");

-- CreateIndex
CREATE INDEX "CommunityModerator_communityId_idx" ON "CommunityModerator"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityModerator_communityId_userId_key" ON "CommunityModerator"("communityId", "userId");

-- CreateIndex
CREATE INDEX "CommunityPost_communityId_createdAt_idx" ON "CommunityPost"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_communityId_isPinned_createdAt_idx" ON "CommunityPost"("communityId", "isPinned", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_communityId_status_createdAt_idx" ON "CommunityPost"("communityId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_communityId_visibility_createdAt_idx" ON "CommunityPost"("communityId", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_authorUserId_idx" ON "CommunityPost"("authorUserId");

-- CreateIndex
CREATE INDEX "CommunityPost_categoryId_idx" ON "CommunityPost"("categoryId");

-- CreateIndex
CREATE INDEX "CommunityPost_originalPostId_idx" ON "CommunityPost"("originalPostId");

-- CreateIndex
CREATE INDEX "CommunityPost_quotedPostId_idx" ON "CommunityPost"("quotedPostId");

-- CreateIndex
CREATE INDEX "CommunityPost_status_createdAt_idx" ON "CommunityPost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityComment_parentId_createdAt_idx" ON "CommunityComment"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityComment_authorUserId_idx" ON "CommunityComment"("authorUserId");

-- CreateIndex
CREATE INDEX "CommunityModerationAction_communityId_createdAt_idx" ON "CommunityModerationAction"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityModerationAction_targetUserId_idx" ON "CommunityModerationAction"("targetUserId");

-- CreateIndex
CREATE INDEX "CommunityModerationAction_actionType_idx" ON "CommunityModerationAction"("actionType");

-- CreateIndex
CREATE INDEX "CommunityPostVote_postId_idx" ON "CommunityPostVote"("postId");

-- CreateIndex
CREATE INDEX "CommunityPostVote_userId_idx" ON "CommunityPostVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostVote_postId_userId_key" ON "CommunityPostVote"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostMedia_mediaId_key" ON "CommunityPostMedia"("mediaId");

-- CreateIndex
CREATE INDEX "CommunityPostMedia_postId_idx" ON "CommunityPostMedia"("postId");

-- CreateIndex
CREATE INDEX "CommunityPostMedia_mediaId_idx" ON "CommunityPostMedia"("mediaId");

-- CreateIndex
CREATE INDEX "CommunityPostMedia_userId_idx" ON "CommunityPostMedia"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostMedia_postId_sortOrder_key" ON "CommunityPostMedia"("postId", "sortOrder");

-- CreateIndex
CREATE INDEX "CommunityPostHashtag_tag_idx" ON "CommunityPostHashtag"("tag");

-- CreateIndex
CREATE INDEX "CommunityPostHashtag_postId_idx" ON "CommunityPostHashtag"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostHashtag_postId_tag_key" ON "CommunityPostHashtag"("postId", "tag");

-- CreateIndex
CREATE INDEX "CommunityPostMention_postId_idx" ON "CommunityPostMention"("postId");

-- CreateIndex
CREATE INDEX "CommunityPostMention_mentionedUserId_idx" ON "CommunityPostMention"("mentionedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostMention_postId_mentionedUserId_key" ON "CommunityPostMention"("postId", "mentionedUserId");

-- CreateIndex
CREATE INDEX "CommunityPostReport_postId_idx" ON "CommunityPostReport"("postId");

-- CreateIndex
CREATE INDEX "CommunityPostReport_reporterUserId_idx" ON "CommunityPostReport"("reporterUserId");

-- CreateIndex
CREATE INDEX "CommunityPostReport_status_idx" ON "CommunityPostReport"("status");

-- CreateIndex
CREATE INDEX "CommunityPostReport_handledByUserId_idx" ON "CommunityPostReport"("handledByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostReport_postId_reporterUserId_key" ON "CommunityPostReport"("postId", "reporterUserId");

-- CreateIndex
CREATE INDEX "CommunityPostBookmark_userId_createdAt_idx" ON "CommunityPostBookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPostBookmark_postId_idx" ON "CommunityPostBookmark"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostBookmark_postId_userId_key" ON "CommunityPostBookmark"("postId", "userId");

-- CreateIndex
CREATE INDEX "CommunityPostEditHistory_postId_editedAt_idx" ON "CommunityPostEditHistory"("postId", "editedAt");

-- CreateIndex
CREATE INDEX "CommunityPostEditHistory_editedByUserId_idx" ON "CommunityPostEditHistory"("editedByUserId");

-- CreateIndex
CREATE INDEX "AnonymousChatBan_roomId_idx" ON "AnonymousChatBan"("roomId");

-- CreateIndex
CREATE INDEX "AnonymousChatBan_userId_idx" ON "AnonymousChatBan"("userId");

-- CreateIndex
CREATE INDEX "AnonymousChatMessage_roomId_createdAt_idx" ON "AnonymousChatMessage"("roomId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousChatMessage_roomId_clientMessageId_key" ON "AnonymousChatMessage"("roomId", "clientMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousChatParticipant_sessionId_key" ON "AnonymousChatParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "AnonymousChatParticipant_sessionId_idx" ON "AnonymousChatParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "AnonymousChatParticipant_userId_idx" ON "AnonymousChatParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousChatParticipant_roomId_anonId_key" ON "AnonymousChatParticipant"("roomId", "anonId");

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousChatParticipant_roomId_userId_key" ON "AnonymousChatParticipant"("roomId", "userId");

-- CreateIndex
CREATE INDEX "AnonymousChatReport_roomId_idx" ON "AnonymousChatReport"("roomId");

-- CreateIndex
CREATE INDEX "AnonymousChatReport_status_createdAt_idx" ON "AnonymousChatReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AnonymousChatReport_targetParticipantId_idx" ON "AnonymousChatReport"("targetParticipantId");

-- CreateIndex
CREATE INDEX "AnonymousChatRoom_status_topic_createdAt_idx" ON "AnonymousChatRoom"("status", "topic", "createdAt");

-- CreateIndex
CREATE INDEX "AnonymousChatSession_status_topic_createdAt_idx" ON "AnonymousChatSession"("status", "topic", "createdAt");

-- CreateIndex
CREATE INDEX "AnonymousChatSession_userId_status_idx" ON "AnonymousChatSession"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Poll_postId_key" ON "Poll"("postId");

-- CreateIndex
CREATE INDEX "PollOption_pollId_idx" ON "PollOption"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "PollOption_pollId_order_key" ON "PollOption"("pollId", "order");

-- CreateIndex
CREATE INDEX "PollVote_optionId_idx" ON "PollVote"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_userId_key" ON "PollVote"("pollId", "userId");

-- CreateIndex
CREATE INDEX "Post_authorId_createdAt_id_idx" ON "Post"("authorId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Post_status_createdAt_id_idx" ON "Post"("status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Post_visibility_createdAt_id_idx" ON "Post"("visibility", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Post_authorId_status_idx" ON "Post"("authorId", "status");

-- CreateIndex
CREATE INDEX "Post_isSensitive_idx" ON "Post"("isSensitive");

-- CreateIndex
CREATE INDEX "Post_originalPostId_idx" ON "Post"("originalPostId");

-- CreateIndex
CREATE INDEX "Post_quotedPostId_idx" ON "Post"("quotedPostId");

-- CreateIndex
CREATE INDEX "Post_channelId_createdAt_idx" ON "Post"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_communityId_createdAt_idx" ON "Post"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_serverId_createdAt_idx" ON "Post"("serverId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_type_createdAt_idx" ON "Post"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostAudio_mediaId_key" ON "PostAudio"("mediaId");

-- CreateIndex
CREATE INDEX "PostAudio_postId_idx" ON "PostAudio"("postId");

-- CreateIndex
CREATE INDEX "PostComment_authorId_idx" ON "PostComment"("authorId");

-- CreateIndex
CREATE INDEX "PostComment_parentId_createdAt_idx" ON "PostComment"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "PostComment_postId_createdAt_idx" ON "PostComment"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostImage_mediaId_key" ON "PostImage"("mediaId");

-- CreateIndex
CREATE INDEX "PostImage_postId_idx" ON "PostImage"("postId");

-- CreateIndex
CREATE INDEX "PostSave_userId_idx" ON "PostSave"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSave_postId_userId_key" ON "PostSave"("postId", "userId");

-- CreateIndex
CREATE INDEX "PostShare_actorUserId_createdAt_idx" ON "PostShare"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PostShare_destinationType_createdAt_idx" ON "PostShare"("destinationType", "createdAt");

-- CreateIndex
CREATE INDEX "PostShare_postId_createdAt_idx" ON "PostShare"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostShare_actorUserId_clientRequestId_key" ON "PostShare"("actorUserId", "clientRequestId");

-- CreateIndex
CREATE INDEX "PostReport_postId_idx" ON "PostReport"("postId");

-- CreateIndex
CREATE INDEX "PostReport_reporterUserId_idx" ON "PostReport"("reporterUserId");

-- CreateIndex
CREATE INDEX "PostReport_status_idx" ON "PostReport"("status");

-- CreateIndex
CREATE INDEX "PostReport_handledByUserId_idx" ON "PostReport"("handledByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PostReport_postId_reporterUserId_key" ON "PostReport"("postId", "reporterUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PostVideo_mediaId_key" ON "PostVideo"("mediaId");

-- CreateIndex
CREATE INDEX "PostVideo_postId_idx" ON "PostVideo"("postId");

-- CreateIndex
CREATE INDEX "MessageAttachment_userId_idx" ON "MessageAttachment"("userId");

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "BookmarkCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkCollection" ADD CONSTRAINT "BookmarkCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMention" ADD CONSTRAINT "PostMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMention" ADD CONSTRAINT "PostMention_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashtag" ADD CONSTRAINT "PostHashtag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityCategory" ADD CONSTRAINT "CommunityCategory_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySubscription" ADD CONSTRAINT "CommunitySubscription_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityModerator" ADD CONSTRAINT "CommunityModerator_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CommunityCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_moderatedByUserId_fkey" FOREIGN KEY ("moderatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_originalPostId_fkey" FOREIGN KEY ("originalPostId") REFERENCES "CommunityPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_quotedPostId_fkey" FOREIGN KEY ("quotedPostId") REFERENCES "CommunityPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityModerationAction" ADD CONSTRAINT "CommunityModerationAction_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostVote" ADD CONSTRAINT "CommunityPostVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostVote" ADD CONSTRAINT "CommunityPostVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostMedia" ADD CONSTRAINT "CommunityPostMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MessageAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostMedia" ADD CONSTRAINT "CommunityPostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostMedia" ADD CONSTRAINT "CommunityPostMedia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostHashtag" ADD CONSTRAINT "CommunityPostHashtag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostMention" ADD CONSTRAINT "CommunityPostMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostMention" ADD CONSTRAINT "CommunityPostMention_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostReport" ADD CONSTRAINT "CommunityPostReport_handledByUserId_fkey" FOREIGN KEY ("handledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostReport" ADD CONSTRAINT "CommunityPostReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostReport" ADD CONSTRAINT "CommunityPostReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostBookmark" ADD CONSTRAINT "CommunityPostBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostBookmark" ADD CONSTRAINT "CommunityPostBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostEditHistory" ADD CONSTRAINT "CommunityPostEditHistory_editedByUserId_fkey" FOREIGN KEY ("editedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostEditHistory" ADD CONSTRAINT "CommunityPostEditHistory_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousChatBan" ADD CONSTRAINT "AnonymousChatBan_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "AnonymousChatRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousChatBan" ADD CONSTRAINT "AnonymousChatBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousChatMessage" ADD CONSTRAINT "AnonymousChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "AnonymousChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousChatMessage" ADD CONSTRAINT "AnonymousChatMessage_senderParticipantId_fkey" FOREIGN KEY ("senderParticipantId") REFERENCES "AnonymousChatParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousChatParticipant" ADD CONSTRAINT "AnonymousChatParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "AnonymousChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousChatParticipant" ADD CONSTRAINT "AnonymousChatParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AnonymousChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousChatParticipant" ADD CONSTRAINT "AnonymousChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousChatReport" ADD CONSTRAINT "AnonymousChatReport_reporterParticipantId_fkey" FOREIGN KEY ("reporterParticipantId") REFERENCES "AnonymousChatParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousChatReport" ADD CONSTRAINT "AnonymousChatReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "AnonymousChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousChatReport" ADD CONSTRAINT "AnonymousChatReport_targetParticipantId_fkey" FOREIGN KEY ("targetParticipantId") REFERENCES "AnonymousChatParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousChatSession" ADD CONSTRAINT "AnonymousChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ServerChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_originalPostId_fkey" FOREIGN KEY ("originalPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_quotedPostId_fkey" FOREIGN KEY ("quotedPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAudio" ADD CONSTRAINT "PostAudio_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "PostMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAudio" ADD CONSTRAINT "PostAudio_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PostComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "PostMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSave" ADD CONSTRAINT "PostSave_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSave" ADD CONSTRAINT "PostSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostShare" ADD CONSTRAINT "PostShare_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostShare" ADD CONSTRAINT "PostShare_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReport" ADD CONSTRAINT "PostReport_handledByUserId_fkey" FOREIGN KEY ("handledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReport" ADD CONSTRAINT "PostReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReport" ADD CONSTRAINT "PostReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVideo" ADD CONSTRAINT "PostVideo_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "PostMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVideo" ADD CONSTRAINT "PostVideo_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
