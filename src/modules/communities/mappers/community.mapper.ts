import { CommunityCategory, CommunitySubscription } from '@prisma/client';

import {
  CommunityWithCounts,
  CommunityPostWithRelations,
  CommunityCommentWithRelations,
  CommunityModerationHistoryRow,
} from '../types/community.types';
import {
  CategoryResponse,
  CommentResponse,
  CommunityResponse,
  ModerationActionResponse,
  PostResponse,
  SubscriptionResponse,
} from '../dto/response';

export function serializeCommunity(
  community: CommunityWithCounts,
): CommunityResponse {
  return {
    id: community.id,
    serverId: community.serverId,
    name: community.name,
    slug: community.slug,
    description: community.description ?? null,
    iconUrl: community.iconUrl ?? null,
    visibility: community.visibility,
    discoveryEnabled: community.discoveryEnabled,
    ownerId: community.ownerId,
    rules: (community.rules as Record<string, unknown>) ?? null,
    postCount: community._count?.posts ?? 0,
    subscriptionCount: community._count?.subscriptions ?? 0,
    createdAt: community.createdAt.toISOString(),
    updatedAt: community.updatedAt.toISOString(),
  };
}

export function serializeCategory(
  category: CommunityCategory,
): CategoryResponse {
  return {
    id: category.id,
    communityId: category.communityId,
    name: category.name,
    description: category.description ?? null,
    position: category.position,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function serializeCommentMap(comment: CommunityCommentWithRelations): CommentResponse {
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    authorUserId: comment.authorUserId,
    content: comment.isDeleted ? '' : comment.content,
    isDeleted: comment.isDeleted,
    version: comment.version,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    replies: (comment.replies ?? []).map(serializeCommentMap),
  };
}

export function serializeComment(comment: CommunityCommentWithRelations): CommentResponse {
  return serializeCommentMap(comment);
}

export function serializePost(post: CommunityPostWithRelations): PostResponse {
  return {
    id: post.id,
    communityId: post.communityId,
    categoryId: post.categoryId,
    authorUserId: post.authorUserId,
    title: post.isDeleted ? '' : post.title,
    content: post.isDeleted ? '' : post.content,
    isPinned: post.isPinned,
    isDeleted: post.isDeleted,
    version: post.version,
    commentCount: post._count?.comments ?? 0,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    category: post.category
      ? { id: post.category.id, name: post.category.name }
      : null,
  };
}

export function serializeSubscription(
  subscription: CommunitySubscription,
  community?: { id: string; name: string; slug: string },
): SubscriptionResponse {
  return {
    id: subscription.id,
    communityId: subscription.communityId,
    isMuted: subscription.isMuted,
    subscribedAt: subscription.subscribedAt.toISOString(),
    community,
  };
}

export function serializeModerationAction(
  action: CommunityModerationHistoryRow,
): ModerationActionResponse {
  return {
    id: action.id,
    communityId: action.communityId,
    moderatorUserId: action.moderatorUserId,
    actionType: action.actionType,
    targetUserId: action.targetUserId,
    objectType: action.objectType,
    objectId: action.objectId,
    reason: action.reason,
    createdAt: action.createdAt.toISOString(),
  };
}
