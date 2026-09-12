import { Injectable } from '@nestjs/common';
import { CommunityModerationActionType, CommunityPost, CommunityPostStatus } from '@prisma/client';

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
import {
  COMMUNITY_REALTIME_EVENTS,
  CommunityRealtimeEventName,
} from '../realtime/community-realtime.constants';

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

    const sideEffects = await this.applyEffect(community.id, request);

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

    // Resource-level side-effect events (POST_DELETED, COMMENT_DELETED,
    // POST_UPDATED) fire only AFTER the audit row is durably written, so
    // the audience can always reconcile an event against the moderation
    // history list. See PR #6.
    for (const { event, payload } of sideEffects) {
      await this.eventPublisher.publish(community.id, event, payload);
    }
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

    // Fetch one extra row so we can tell whether another page exists
    // without issuing a count query. The repository takes `limit` as
    // written (no +1), so we do the +1 here to keep the repository
    // signature honest.
    const actions = actionType
      ? await this.actionRepository.listByActionType(
          community.id,
          actionType,
          limit + 1,
          decoded ?? undefined,
        )
      : await this.actionRepository.list(community.id, limit + 1, decoded ?? undefined);

    const hasMore = actions.length > limit;
    const page = hasMore ? actions.slice(0, limit) : actions;
    const last = page[page.length - 1];

    return {
      items: page.map(serializeModerationAction),
      nextCursor:
        hasMore && last
          ? encodeTwoFieldCursor({
              createdAt: last.createdAt,
              id: last.id,
            })
          : null,
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
  ): Promise<
    Array<{ event: CommunityRealtimeEventName; payload: Record<string, unknown> }>
  > {
    const sideEffects: Array<{
      event: CommunityRealtimeEventName;
      payload: Record<string, unknown>;
    }> = [];

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

        sideEffects.push({
          event: COMMUNITY_REALTIME_EVENTS.POST_DELETED,
          payload: {
            postId: post.id,
            communityId,
            reason: 'moderation',
          },
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

        sideEffects.push({
          event: COMMUNITY_REALTIME_EVENTS.COMMENT_DELETED,
          payload: {
            postId: post.id,
            commentId: comment.id,
            communityId,
            reason: 'moderation',
          },
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

        sideEffects.push({
          event: COMMUNITY_REALTIME_EVENTS.POST_UPDATED,
          payload: {
            postId: post.id,
            communityId,
            isPinned: true,
            reason: 'moderation',
          },
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

        sideEffects.push({
          event: COMMUNITY_REALTIME_EVENTS.POST_UPDATED,
          payload: {
            postId: post.id,
            communityId,
            isPinned: false,
            reason: 'moderation',
          },
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

    return sideEffects;
  }

  private async communityBySlug(slug: string) {
    const community = await this.repository.findBySlugWithRelations(slug);

    if (!community) {
      throw new CommunityNotFoundException();
    }

    return community;
  }

  async lockPost(
    postId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<CommunityPost> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new CommunityPostNotFoundException();
    }

    return this.postRepository.update(postId, {
      status: CommunityPostStatus.LOCKED,
      lockedAt: new Date(),
      lockedReason: reason ?? null,
      version: { increment: 1 },
    });
  }

  async unlockPost(
    postId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<CommunityPost> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new CommunityPostNotFoundException();
    }

    return this.postRepository.update(postId, {
      status: CommunityPostStatus.ACTIVE,
      lockedAt: null,
      lockedReason: null,
      version: { increment: 1 },
    });
  }

  async hidePost(
    postId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<CommunityPost> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new CommunityPostNotFoundException();
    }

    return this.postRepository.update(postId, {
      status: CommunityPostStatus.HIDDEN,
      hiddenAt: new Date(),
      hiddenReason: reason ?? null,
      version: { increment: 1 },
    });
  }

  async unhidePost(
    postId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<CommunityPost> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new CommunityPostNotFoundException();
    }

    return this.postRepository.update(postId, {
      status: CommunityPostStatus.ACTIVE,
      hiddenAt: null,
      hiddenReason: null,
      version: { increment: 1 },
    });
  }

  async pinPost(postId: string, moderatorId: string): Promise<CommunityPost> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new CommunityPostNotFoundException();
    }

    return this.postRepository.update(postId, {
      isPinned: true,
      pinnedAt: new Date(),
    });
  }

  async unpinPost(postId: string, moderatorId: string): Promise<CommunityPost> {
    const post = await this.postRepository.findById(postId);

    if (!post) {
      throw new CommunityPostNotFoundException();
    }

    return this.postRepository.update(postId, {
      isPinned: false,
      pinnedAt: null,
    });
  }
}
