import { Injectable } from '@nestjs/common';
import { CommunityModeratorRole } from '@prisma/client';

import { CommunityAccessDeniedException } from '../exceptions/community.exceptions';
import { CommunityRepository } from '../repositories/community.repository';
import { CommunityModeratorRepository } from '../repositories/community-moderator.repository';

@Injectable()
export class CommunityAccessService {
  constructor(
    private readonly communityRepository: CommunityRepository,
    private readonly moderatorRepository: CommunityModeratorRepository,
  ) {}

  async assertOwner(communityId: string, userId: string): Promise<void> {
    const community = await this.communityRepository.findById(communityId);

    if (!community) {
      return;
    }

    if (community.ownerId !== userId) {
      throw new CommunityAccessDeniedException(
        'Only the community owner can perform this action.',
      );
    }
  }

  async assertModerator(communityId: string, userId: string): Promise<void> {
    const ownerCheck = await this.communityRepository.findById(communityId);

    if (ownerCheck?.ownerId === userId) {
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
    const ownerCheck = await this.communityRepository.findById(communityId);

    if (ownerCheck?.ownerId === userId) {
      return;
    }

    const isAdmin = await this.moderatorRepository.isAdmin(communityId, userId);

    if (!isAdmin) {
      throw new CommunityAccessDeniedException(
        'Only the owner or an admin can perform this action.',
      );
    }
  }

  async isModerator(
    communityId: string,
    userId: string,
  ): Promise<boolean> {
    const ownerCheck = await this.communityRepository.findById(communityId);

    if (ownerCheck?.ownerId === userId) {
      return true;
    }

    const moderator = await this.moderatorRepository.find(communityId, userId);

    return Boolean(moderator);
  }

  async roleFor(
    communityId: string,
    userId: string,
  ): Promise<CommunityModeratorRole | null> {
    const ownerCheck = await this.communityRepository.findById(communityId);

    if (ownerCheck?.ownerId === userId) {
      return CommunityModeratorRole.ADMIN;
    }

    const moderator = await this.moderatorRepository.find(communityId, userId);

    return moderator?.role ?? null;
  }
}
