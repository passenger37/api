import { Injectable } from '@nestjs/common';
import { CommunityModerationActionType } from '@prisma/client';

import { CommunityAccessService } from './community-access.service';
import {
  CommunityCommentNotFoundException,
  CommunityInvalidCursorException,
  CommunityModerationInvalidTargetException,
  CommunityMuteTargetNotSubscribedException,
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
import { encodeTwoFieldCursor, decodeTwoFieldCursor } from '../pagination/community-cursor';
import { serializeModerationAction } from '../mappers/community.mapper';
import { CommunityEventPublisher } from '../events/community-event-publisher';
import { COMMUNITY_REALTIME_EVENTS } from '../realtime/community-realtime.constants';

@Injectable()
export class CommunityModerationService {
  constructor(
    private readonly repository: CommunityRepository,
    private readonly actionRepository: CommunityModerationActionRepository,
    private readonly postRepository: CommunityPostRepository,
    private readonly commentRepository: CommunityCommentRepository,
    private readonly subscriptionRepository: CommunitySubscriptionRepository,
    private readonly access: CommunityAccessService,
    private readonly eventPublisher: CommunityEventPublisher,
  ) {}

  async record(
    slug: string,
    userId: string,
    request: CreateModerationActionRequest,
  ): Promise<void> {
    const community = await this.communityBySlug(slug);

    await this.access.assertModerator(community.id, userId);

    await this.applyEffect(community.id, request);

    const action = await this.actionRepository.create({
      community: { connect: { id: community.id } },
      moderatorUserId: userId,
      actionType: request.actionType,
      targetUserId: request.targetUserId ?? null,
      objectType: request.objectType ?? null,
      objectId: request.objectId ?? null,
      reason: request.reason ?? null,
    });

    await this.eventPublisher.publish(community.id, COMMUNITY_REALTIME_EVENTS.MODERATION_RECORDED, {
      action: serializeModerationAction(action),
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

    const decoded = cursor ? this.decodeCursor(cursor) : null;

    const actions = actionType
      ? await this.actionRepository.listByActionType(
          community.id,
          actionType,
          limit,
          decoded,
        )
      : await this.actionRepository.list(community.id, limit, decoded);

    const nextCursor =
      actions.length === limit && actions.length > 0
        ? encodeTwoFieldCursor({
            createdAt: actions[actions.length - 1]!.createdAt,
            id: actions[actions.length - 1]!.id,
          })
        : null;

    return {
      items: actions.map(serializeModerationAction),
      nextCursor,
    };
  }

  private decodeCursor(cursor: string) {
    try {
      return decodeTwoFieldCursor(cursor);
    } catch {
      throw new CommunityInvalidCursorException();
    }
  }

  private async applyEffect(
    communityId: string,
    request: CreateModerationActionRequest,
  ): Promise<void> {
    switch (request.actionType) {
      case CommunityModerationActionType.MUTE: {
        if (!request.targetUserId) {
          throw new CommunityModerationInvalidTargetException(
            'MUTE requires a targetUserId.',
          );
        }

        const updated = await this.subscriptionRepository.setMuted(
          communityId,
          request.targetUserId,
          true,
        );

        if (!updated) {
          throw new CommunityMuteTargetNotSubscribedException();
        }

        break;
      }

      case CommunityModerationActionType.BAN: {
        if (!request.targetUserId) {
          throw new CommunityModerationInvalidTargetException(
            'BAN requires a targetUserId.',
          );
        }

        // The schema has no CommunityBan model yet, so a BAN is recorded as
        // an audit row only. Future work: add a CommunityBan model and effect
        // an unsubscribe + write here.
        break;
      }

      case CommunityModerationActionType.DELETE_POST: {
        if (!request.objectId) {
          throw new CommunityModerationInvalidTargetException(
            'DELETE_POST requires an objectId.',
          );
        }

        const post = await this.postRepository.findById(request.objectId);

        if (!post || post.communityId !== communityId) {
          throw new CommunityPostNotFoundException();
        }

        await this.postRepository.softDelete(post.id);

        await this.eventPublisher.publish(communityId, COMMUNITY_REALTIME_EVENTS.POST_DELETED, {
          postId: post.id,
          communityId,
          reason: 'moderation',
        });

        break;
      }

      case CommunityModerationActionType.DELETE_COMMENT: {
        if (!request.objectId) {
          throw new CommunityModerationInvalidTargetException(
            'DELETE_COMMENT requires an objectId.',
          );
        }

        const comment = await this.commentRepository.findById(
          request.objectId,
        );

        if (!comment) {
          throw new CommunityCommentNotFoundException();
        }

        const post = await this.postRepository.findById(comment.postId);

        if (!post || post.communityId !== communityId) {
          throw new CommunityCommentNotFoundException();
        }

        await this.commentRepository.softDelete(comment.id);

        await this.eventPublisher.publish(communityId, COMMUNITY_REALTIME_EVENTS.COMMENT_DELETED, {
          postId: post.id,
          commentId: comment.id,
          communityId,
          reason: 'moderation',
        });

        break;
      }

      case CommunityModerationActionType.PIN_POST: {
        if (!request.objectId) {
          throw new CommunityModerationInvalidTargetException(
            'PIN_POST requires an objectId.',
          );
        }

        const post = await this.postRepository.findById(request.objectId);

        if (!post || post.communityId !== communityId) {
          throw new CommunityPostNotFoundException();
        }

        await this.postRepository.update(post.id, {
          isPinned: true,
          pinnedAt: new Date(),
        });

        await this.eventPublisher.publish(communityId, COMMUNITY_REALTIME_EVENTS.POST_UPDATED, {
          postId: post.id,
          communityId,
          isPinned: true,
          reason: 'moderation',
        });

        break;
      }

      case CommunityModerationActionType.UNPIN_POST: {
        if (!request.objectId) {
          throw new CommunityModerationInvalidTargetException(
            'UNPIN_POST requires an objectId.',
          );
        }

        const post = await this.postRepository.findById(request.objectId);

        if (!post || post.communityId !== communityId) {
          throw new CommunityPostNotFoundException();
        }

        await this.postRepository.update(post.id, {
          isPinned: false,
          pinnedAt: null,
        });

        await this.eventPublisher.publish(communityId, COMMUNITY_REALTIME_EVENTS.POST_UPDATED, {
          postId: post.id,
          communityId,
          isPinned: false,
          reason: 'moderation',
        });

        break;
      }

      case CommunityModerationActionType.WARN: {
        if (!request.targetUserId) {
          throw new CommunityModerationInvalidTargetException(
            'WARN requires a targetUserId.',
          );
        }

        // Pure metadata; the audit row captures the warning.
        break;
      }

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
