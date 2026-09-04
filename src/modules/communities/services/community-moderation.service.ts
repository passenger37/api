import { Injectable } from '@nestjs/common';
import { CommunityModerationActionType } from '@prisma/client';

import { CommunityAccessService } from './community-access.service';
import {
  CommunityCommentNotFoundException,
  CommunityNotFoundException,
  CommunityPostNotFoundException,
} from '../exceptions/community.exceptions';
import { CommunityRepository } from '../repositories/community.repository';
import { CommunityPostRepository } from '../repositories/community-post.repository';
import { CommunityCommentRepository } from '../repositories/community-comment.repository';
import { CommunitySubscriptionRepository } from '../repositories/community-subscription.repository';
import { CommunityModerationActionRepository } from '../repositories/community-moderation-action.repository';
import { CreateModerationActionRequest } from '../dto/request/create-moderation-action.request';
import { ModerationListResponse } from '../dto/response';
import { serializeModerationAction } from '../mappers/community.mapper';

@Injectable()
export class CommunityModerationService {
  constructor(
    private readonly repository: CommunityRepository,
    private readonly actionRepository: CommunityModerationActionRepository,
    private readonly postRepository: CommunityPostRepository,
    private readonly commentRepository: CommunityCommentRepository,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
    private readonly access: CommunityAccessService,
  ) {}

  async record(
    slug: string,
    userId: string,
    request: CreateModerationActionRequest,
  ): Promise<void> {
    const community = await this.communityBySlug(slug);

    await this.access.assertModerator(community.id, userId);

    await this.applyEffect(community.id, request);

    await this.actionRepository.create({
      community: { connect: { id: community.id } },
      moderatorUserId: userId,
      actionType: request.actionType,
      targetUserId: request.targetUserId ?? null,
      objectType: request.objectType ?? null,
      objectId: request.objectId ?? null,
      reason: request.reason ?? null,
    });
  }

  async list(
    slug: string,
    userId: string,
    actionType?: CommunityModerationActionType,
    cursor?: string,
    limit = 20,
  ): Promise<ModerationListResponse> {
    const community = await this.communityBySlug(slug);

    await this.access.assertModerator(community.id, userId);

    const actions = actionType
      ? await this.actionRepository.listByActionType(
          community.id,
          actionType,
          limit,
          cursor,
        )
      : await this.actionRepository.list(community.id, limit, cursor);

    const nextCursor =
      actions.length === limit ? (actions[actions.length - 1]?.id ?? null) : null;

    return {
      items: actions.map(serializeModerationAction),
      nextCursor,
    };
  }

  private async applyEffect(
    communityId: string,
    request: CreateModerationActionRequest,
  ): Promise<void> {
    switch (request.actionType) {
      case CommunityModerationActionType.MUTE:
        if (request.targetUserId) {
          await this.subscriptionRepository.setMuted(
            communityId,
            request.targetUserId,
            true,
          );
        }
        break;

      case CommunityModerationActionType.DELETE_POST:
        if (!request.objectId) {
          return;
        }

        {
          const post = await this.postRepository.findById(request.objectId);

          if (!post || post.communityId !== communityId) {
            throw new CommunityPostNotFoundException();
          }

          await this.postRepository.softDelete(post.id);
        }
        break;

      case CommunityModerationActionType.DELETE_COMMENT:
        if (!request.objectId) {
          return;
        }

        {
          const comment = await this.commentRepository.findById(
            request.objectId,
          );

          if (!comment) {
            throw new CommunityCommentNotFoundException();
          }

          await this.commentRepository.softDelete(comment.id);
        }
        break;

      default:
        break;
    }
  }

  private async communityBySlug(slug: string) {
    const community = await this.repository.findBySlugWithRelations(slug);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    return community;
  }
}
