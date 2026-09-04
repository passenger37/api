import { Injectable } from '@nestjs/common';

import { CommunitySubscriptionRepository } from '../repositories/community-subscription.repository';
import { CommunityModeratorRepository } from '../repositories/community-moderator.repository';
import { CommunityRepository } from '../repositories/community.repository';

/**
 * Lecture 51.12 — audience computation for community realtime events.
 *
 * The transport-agnostic rule: subscribers + moderators + the owner. Muted
 * subscribers are filtered out so a muted user doesn't receive realtime
 * notifications for new posts. Moderators and the owner always receive so
 * they can act on moderation-relevant events (e.g. PIN_POST) regardless of
 * their subscription state.
 */
@Injectable()
export class CommunityRoomResolverService {
  constructor(
    private readonly communityRepository: CommunityRepository,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
    private readonly moderatorRepository: CommunityModeratorRepository,
  ) {}

  /**
   * Resolve the set of userIds that should receive realtime events for a
   * given community.
   *
   * - Always includes the owner.
   * - Includes all moderators.
   * - Includes all non-muted subscribers.
   * - De-duplicates (the owner is also a subscriber row by default, but we
   *   don't want to rely on that being true across data migrations).
   */
  async resolveAudience(communityId: string): Promise<Set<string>> {
    const audience = new Set<string>();

    const ownerId = await this.communityRepository.findOwnerId(communityId);

    if (ownerId) {
      audience.add(ownerId);
    }

    const moderators = await this.moderatorRepository.list(communityId);

    for (const moderator of moderators) {
      audience.add(moderator.userId);
    }

    // Subscriptions are loaded "as is" — the muted filter is applied here
    // so the repository stays a thin wrapper.
    const subscriptions = await this.subscriptionRepository.listForCommunity(
      communityId,
    );

    for (const subscription of subscriptions) {
      if (subscription.isMuted) {
        continue;
      }
      audience.add(subscription.userId);
    }

    return audience;
  }
}
