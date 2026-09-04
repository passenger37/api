/**
 * Community realtime transport constants.
 *
 * Lecture 51.12 — WebSocket integration for the Communities module.
 *
 * Events are published on a per-community Redis channel so that a future
 * Socket.IO gateway (or any other fan-out consumer) can subscribe once and
 * reach all the gateway nodes that hold sockets for subscribers/moderators
 * of that community. The publish side has no knowledge of the gateway.
 */
export const COMMUNITY_REALTIME_EVENTS = {
  COMMUNITY_CREATED: 'community:created',
  COMMUNITY_UPDATED: 'community:updated',
  COMMUNITY_SOFT_DELETED: 'community:soft-deleted',
  CATEGORY_CREATED: 'community:category:created',
  CATEGORY_UPDATED: 'community:category:updated',
  CATEGORY_DELETED: 'community:category:deleted',
  POST_CREATED: 'community:post:created',
  POST_UPDATED: 'community:post:updated',
  POST_DELETED: 'community:post:deleted',
  COMMENT_CREATED: 'community:comment:created',
  COMMENT_UPDATED: 'community:comment:updated',
  COMMENT_DELETED: 'community:comment:deleted',
  MODERATION_RECORDED: 'community:moderation:recorded',
  MODERATOR_ADDED: 'community:moderator:added',
  MODERATOR_REMOVED: 'community:moderator:removed',
  SUBSCRIPTION_CHANGED: 'community:subscription:changed',
} as const;

export type CommunityRealtimeEventName =
  (typeof COMMUNITY_REALTIME_EVENTS)[keyof typeof COMMUNITY_REALTIME_EVENTS];

/**
 * Build the Redis channel name a community's events are published to.
 * Uses the community id (not the slug) so slug renames don't strand
 * subscribers.
 */
export function communityEventChannel(communityId: string): string {
  return `community:${communityId}:events`;
}
