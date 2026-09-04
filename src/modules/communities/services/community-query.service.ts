import { Injectable } from '@nestjs/common';

import { CommunityAccessService } from './community-access.service';
import {
  CommunityNotFoundException,
  CommunityAccessDeniedException,
} from '../exceptions/community.exceptions';
import { CommunityRepository } from '../repositories/community.repository';
import { CommunityCategoryRepository } from '../repositories/community-category.repository';
import { CommunitySubscriptionRepository } from '../repositories/community-subscription.repository';
import {
  CommunityListResponse,
  CategoryResponse,
} from '../dto/response';
import { CommunityWithCounts } from '../types/community.types';
import { serializeCommunity, serializeCategory } from '../mappers/community.mapper';

@Injectable()
export class CommunityQueryService {
  constructor(
    private readonly repository: CommunityRepository,
    private readonly categoryRepository: CommunityCategoryRepository,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
    private readonly access: CommunityAccessService,
  ) {}

  async getBySlug(slug: string, userId?: string): Promise<CommunityWithCounts> {
    const community = await this.repository.findBySlugWithRelations(slug);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    await this.assertViewable(community, userId);

    return community;
  }

  async listCategories(slug: string): Promise<CategoryResponse[]> {
    const community = await this.repository.findBySlugWithRelations(slug);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    const categories = await this.categoryRepository.list(community.id);

    return categories.map(serializeCategory);
  }

  async listSubscribed(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<CommunityListResponse> {
    const subscriptions = await this.repository.listSubscribed(
      userId,
      limit,
      cursor,
    );

    const communities = subscriptions.map(
      (subscription) => subscription.community,
    );

    const nextCursor =
      subscriptions.length === limit
        ? (subscriptions[subscriptions.length - 1]?.id ?? null)
        : null;

    return {
      items: communities.map(serializeCommunity),
      nextCursor,
    };
  }

  async isSubscribed(slug: string, userId: string): Promise<boolean> {
    const community = await this.repository.findBySlugWithRelations(slug);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    return this.subscriptionRepository.isSubscribed(community.id, userId);
  }

  async getSubscriptionState(slug: string, userId: string) {
    const community = await this.repository.findBySlugWithRelations(slug);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    const subscription = await this.subscriptionRepository.find(
      community.id,
      userId,
    );

    return {
      subscribed: Boolean(subscription),
      isMuted: subscription?.isMuted ?? false,
    };
  }

  private async assertViewable(
    community: CommunityWithCounts,
    userId?: string,
  ): Promise<void> {
    if (community.visibility === 'PUBLIC') {
      return;
    }

    if (!userId) {
      throw new CommunityAccessDeniedException();
    }

    const isModerator = await this.access.isModerator(community.id, userId);

    if (isModerator) {
      return;
    }

    const subscribed = await this.subscriptionRepository.isSubscribed(
      community.id,
      userId,
    );

    if (!subscribed) {
      throw new CommunityAccessDeniedException();
    }
  }
}
