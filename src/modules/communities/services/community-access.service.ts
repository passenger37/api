import { Injectable } from '@nestjs/common';
import {
  CommunityModerationActionType,
  CommunityModeratorRole,
} from '@prisma/client';

import { CommunityAccessDeniedException } from '../exceptions/community.exceptions';
import { CommunityRepository } from '../repositories/community.repository';
import { CommunityModeratorRepository } from '../repositories/community-moderator.repository';
import { CommunityModerationActionRepository } from '../repositories/community-moderation-action.repository';

@Injectable()
export class CommunityAccessService {
  constructor(
    private readonly communityRepository: CommunityRepository,
    private readonly moderatorRepository: CommunityModeratorRepository,
    private readonly moderationActionRepository: CommunityModerationActionRepository,
  ) {}

  async assertOwner(communityId: string, userId: string): Promise<void> {
    const ownerId = await this.communityRepository.findOwnerId(communityId);

    if (ownerId === null) {
      return;
    }

    if (ownerId !== userId) {
      throw new CommunityAccessDeniedException(
        'Only the community owner can perform this action.',
      );
    }
  }

  async assertModerator(communityId: string, userId: string): Promise<void> {
    const ownerId = await this.communityRepository.findOwnerId(communityId);

    if (ownerId === userId) {
      return;
    }

    const moderator = await this.moderatorRepository.find(communityId, userId);

    if (!moderator) {
      throw new CommunityAccessDeniedException(
        'You must be a moderator to perform this action.',
      );
    }
  }

  async assertAdmin(communityId: string, userId: string): Promise<void> {
    const ownerId = await this.communityRepository.findOwnerId(communityId);

    if (ownerId === userId) {
      return;
    }

    const isAdmin = await this.moderatorRepository.isAdmin(communityId, userId);

    if (!isAdmin) {
      throw new CommunityAccessDeniedException(
        'Only the owner or an admin can perform this action.',
      );
    }
  }

  async isModerator(communityId: string, userId: string): Promise<boolean> {
    const ownerId = await this.communityRepository.findOwnerId(communityId);

    if (ownerId === userId) {
      return true;
    }

    const moderator = await this.moderatorRepository.find(communityId, userId);

    return Boolean(moderator);
  }

  async roleFor(
    communityId: string,
    userId: string,
  ): Promise<CommunityModeratorRole | null> {
    const ownerId = await this.communityRepository.findOwnerId(communityId);

    if (ownerId === userId) {
      return CommunityModeratorRole.ADMIN;
    }

    const moderator = await this.moderatorRepository.find(communityId, userId);

    return moderator?.role ?? null;
  }

  async isBanned(communityId: string, userId: string): Promise<boolean> {
    // The schema has no CommunityBan model yet. A member is considered
    // banned while a BAN moderation action is recorded against them.
    const latest = await this.moderationActionRepository.findLatest(
      communityId,
      userId,
      CommunityModerationActionType.BAN,
    );

    return Boolean(latest);
  }

  async isBannedFromPosting(
    communityId: string,
    userId: string,
  ): Promise<boolean> {
    return this.isBanned(communityId, userId);
  }

  async isBannedFromVoting(
    communityId: string,
    userId: string,
  ): Promise<boolean> {
    return this.isBanned(communityId, userId);
  }
}
