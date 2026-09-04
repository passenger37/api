import { Injectable } from '@nestjs/common';

import {
  CommunityAlreadySubscribedException,
  CommunityNotSubscribedException,
  CommunityNotFoundException,
} from '../exceptions/community.exceptions';
import { CommunityRepository } from '../repositories/community.repository';
import { CommunitySubscriptionRepository } from '../repositories/community-subscription.repository';
import { SubscriptionResponse } from '../dto/response';
import { serializeSubscription } from '../mappers/community.mapper';

@Injectable()
export class CommunityMembershipService {
  constructor(
    private readonly repository: CommunityRepository,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
  ) {}

  async subscribe(slug: string, userId: string): Promise<SubscriptionResponse> {
    const community = await this.communityBySlug(slug);

    const already = await this.subscriptionRepository.isSubscribed(
      community.id,
      userId,
    );

    if (already) {
      throw new CommunityAlreadySubscribedException();
    }

    const subscription = await this.subscriptionRepository.subscribe(
      community.id,
      userId,
    );

    return serializeSubscription(subscription, {
      id: community.id,
      name: community.name,
      slug: community.slug,
    });
  }

  async unsubscribe(slug: string, userId: string): Promise<void> {
    const community = await this.communityBySlug(slug);

    const subscribed = await this.subscriptionRepository.isSubscribed(
      community.id,
      userId,
    );

    if (!subscribed) {
      throw new CommunityNotSubscribedException();
    }

    await this.subscriptionRepository.unsubscribe(community.id, userId);
  }

  async setMuted(
    slug: string,
    userId: string,
    isMuted: boolean,
  ): Promise<SubscriptionResponse> {
    const community = await this.communityBySlug(slug);

    const subscription = await this.subscriptionRepository.setMuted(
      community.id,
      userId,
      isMuted,
    );

    if (!subscription) {
      throw new CommunityNotSubscribedException();
    }

    return serializeSubscription(subscription, {
      id: community.id,
      name: community.name,
      slug: community.slug,
    });
  }

  private async communityBySlug(slug: string) {
    const community = await this.repository.findBySlugWithRelations(slug);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    return community;
  }
}
