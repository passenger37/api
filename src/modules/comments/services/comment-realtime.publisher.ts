import { Injectable, Logger } from '@nestjs/common';
import { CommentStatus, CommentPostType, VoteType } from '@prisma/client';

import { RedisPubSubService } from '../../../core/redis/redis-pub-sub.service';
import { REALTIME_EVENT_CHANNEL } from '../../realtime/constants/realtime.constants';
import {
  RealtimeEventPayload,
  RealtimeEventType,
} from '../../realtime/types/realtime.types';
import { CommentResponseData } from '../types/comment.types';

/**
 * Publishes comment lifecycle events to the realtime bus
 * (`realtime:events`). RealtimeEventBridgeService forwards these to the
 * socket.io post room so connected clients receive live updates.
 */
@Injectable()
export class CommentRealtimePublisher {
  private readonly logger = new Logger(CommentRealtimePublisher.name);

  constructor(private readonly pubSub: RedisPubSubService) {}

  async publishCommentCreated(comment: CommentResponseData): Promise<void> {
    await this.publish({
      type: RealtimeEventType.COMMENT_CREATED,
      postId: comment.postId,
      postType: comment.postType,
      commentId: comment.id,
      comment: comment as unknown as Record<string, unknown>,
    });
  }

  async publishCommentUpdated(comment: CommentResponseData): Promise<void> {
    await this.publish({
      type: RealtimeEventType.COMMENT_UPDATED,
      postId: comment.postId,
      postType: comment.postType,
      commentId: comment.id,
      comment: comment as unknown as Record<string, unknown>,
    });
  }

  async publishCommentDeleted(input: {
    postId: string;
    postType: CommentPostType;
    commentId: string;
    status: CommentStatus;
  }): Promise<void> {
    await this.publish({
      type: RealtimeEventType.COMMENT_DELETED,
      postId: input.postId,
      postType: input.postType,
      commentId: input.commentId,
      status: input.status,
    });
  }

  async publishCommentReaction(input: {
    postId: string;
    postType: CommentPostType;
    commentId: string;
    vote: VoteType;
    scoreDelta: number;
  }): Promise<void> {
    await this.publish({
      type: RealtimeEventType.COMMENT_REACTION,
      postId: input.postId,
      postType: input.postType,
      commentId: input.commentId,
      vote: input.vote,
      scoreDelta: input.scoreDelta,
    });
  }

  private async publish(payload: RealtimeEventPayload): Promise<void> {
    try {
      await this.pubSub.publish<RealtimeEventPayload>(
        REALTIME_EVENT_CHANNEL,
        payload,
      );
    } catch (error) {
      this.logger.error('Failed to publish comment realtime event.', error);
    }
  }
}
