import { Injectable } from '@nestjs/common';
import { CommunityVisibility } from '@prisma/client';

import { CommunityAccessService } from './community-access.service';
import {
  CommunityInvalidCursorException,
  CommunityNotFoundException,
  CommunityAccessDeniedException,
} from '../exceptions/community.exceptions';
import { CommunityRepository } from '../repositories/community.repository';
import { CommunityCategoryRepository } from '../repositories/community-category.repository';
import { CommunitySubscriptionRepository } from '../repositories/community-subscription.repository';
import {
  CommunityListResponse,
  CommunityResponse,
  CategoryResponse,
} from '../dto/response';
import {
  serializeCommunity,
  serializeCategory,
} from '../mappers/community.mapper';
import {
  decodeTwoFieldCursor,
  encodeTwoFieldCursor,
} from '../pagination/community-cursor';

@Injectable()
export class CommunityQueryService {
  constructor(
    private readonly repository: CommunityRepository,
    private readonly categoryRepository: CommunityCategoryRepository,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
    private readonly access: CommunityAccessService,
  ) {}

  async getBySlug(slug: string, userId?: string): Promise<CommunityResponse> {
    const community = await this.repository.findBySlugWithRelations(slug);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    await this.assertViewable(community.visibility, community.id, userId);

    return serializeCommunity(community);
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
    const decoded = cursor ? this.decodeCursorSafe(cursor) : undefined;

    const rows = await this.repository.listSubscribed(userId, limit, decoded);

    const hasMore = rows.length > limit;
    const subscriptions = hasMore ? rows.slice(0, limit) : rows;
    const last = subscriptions[subscriptions.length - 1];

    const communities = subscriptions.map(
      (subscription) => subscription.community,
    );

    return {
      items: communities.map(serializeCommunity),
      nextCursor:
        hasMore && last
          ? encodeTwoFieldCursor({
              createdAt: last.subscribedAt,
              id: last.id,
            })
          : null,
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

  private decodeCursorSafe(cursor: string) {
    try {
      return decodeTwoFieldCursor(cursor);
    } catch {
      throw new CommunityInvalidCursorException();
    }
  }

  private async assertViewable(
    visibility: CommunityVisibility,
    communityId: string,
    userId?: string,
  ): Promise<void> {
    if (visibility === CommunityVisibility.PUBLIC) {
      return;
    }

    if (!userId) {
      throw new CommunityAccessDeniedException();
    }

    const isModerator = await this.access.isModerator(communityId, userId);

    if (isModerator) {
      return;
    }

    const subscribed = await this.subscriptionRepository.isSubscribed(
      communityId,
      userId,
    );

    if (!subscribed) {
      throw new CommunityAccessDeniedException();
    }
  }
}
