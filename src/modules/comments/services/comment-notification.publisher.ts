import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NotificationEntityType, NotificationType } from '@prisma/client';

import { RedisPubSubService } from '../../../core/redis/redis-pub-sub.service';
import { DOMAIN_EVENT_CHANNEL } from '../../notifications/constants/notification.constants';
import { DomainNotificationEvent } from '../../notifications/types/notification.types';
import { CommentPostType } from '@prisma/client';

/**
 * Publishes comment lifecycle domain events to the notifications bus
 * (`notifications:domain-events`). The comment module never writes to the
 * notification store directly; NotificationEventListenerService consumes these
 * events.
 */
@Injectable()
export class CommentNotificationPublisher {
  private readonly logger = new Logger(CommentNotificationPublisher.name);

  constructor(private readonly pubSub: RedisPubSubService) {}

  async publishCommentOnPost(input: {
    postId: string;
    postType: CommentPostType;
    commentId: string;
    postAuthorId: string;
    actorUserId: string;
  }): Promise<void> {
    if (input.postAuthorId === input.actorUserId) {
      return;
    }

    await this.publish({
      recipientUserId: input.postAuthorId,
      actorUserId: input.actorUserId,
      type: NotificationType.COMMENT_ON_POST,
      entityType: NotificationEntityType.COMMENT,
      entityId: input.commentId,
      payload: {
        postId: input.postId,
        postType: input.postType,
        commentId: input.commentId,
      },
      expiresInSeconds: 60 * 60 * 24 * 30,
    });
  }

  async publishCommentReply(input: {
    postId: string;
    postType: CommentPostType;
    parentCommentId: string;
    commentId: string;
    parentAuthorId: string;
    actorUserId: string;
  }): Promise<void> {
    if (input.parentAuthorId === input.actorUserId) {
      return;
    }

    await this.publish({
      recipientUserId: input.parentAuthorId,
      actorUserId: input.actorUserId,
      type: NotificationType.COMMENT_REPLY,
      entityType: NotificationEntityType.COMMENT,
      entityId: input.commentId,
      payload: {
        postId: input.postId,
        postType: input.postType,
        parentCommentId: input.parentCommentId,
        commentId: input.commentId,
      },
      expiresInSeconds: 60 * 60 * 24 * 30,
    });
  }

  async publishCommentReaction(input: {
    commentId: string;
    commentAuthorId: string;
    actorUserId: string;
    vote: 'UPVOTE' | 'DOWNVOTE';
  }): Promise<void> {
    if (input.commentAuthorId === input.actorUserId) {
      return;
    }

    await this.publish({
      recipientUserId: input.commentAuthorId,
      actorUserId: input.actorUserId,
      type: NotificationType.COMMENT_REACTION,
      entityType: NotificationEntityType.COMMENT,
      entityId: input.commentId,
      payload: {
        commentId: input.commentId,
        vote: input.vote,
      },
      expiresInSeconds: 60 * 60 * 24 * 30,
    });
  }

  async publishCommentMentions(input: {
    commentId: string;
    mentionedUserIds: string[];
    actorUserId: string;
  }): Promise<void> {
    const recipientIds = new Set(input.mentionedUserIds);
    recipientIds.delete(input.actorUserId);

    for (const recipientUserId of recipientIds) {
      await this.publish({
        recipientUserId,
        actorUserId: input.actorUserId,
        type: NotificationType.COMMENT_MENTION,
        entityType: NotificationEntityType.COMMENT,
        entityId: input.commentId,
        payload: {
          commentId: input.commentId,
        },
        expiresInSeconds: 60 * 60 * 24 * 30,
      });
    }
  }

  private async publish(event: Omit<DomainNotificationEvent, 'eventId'>): Promise<void> {
    try {
      await this.pubSub.publish<DomainNotificationEvent>(
        DOMAIN_EVENT_CHANNEL,
        { eventId: randomUUID(), ...event },
      );
    } catch (error) {
      this.logger.error('Failed to publish comment notification event.', error);
    }
  }
}