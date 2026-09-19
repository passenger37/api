import { CommentCommandService } from './comment-command.service';
import { CommentRepository } from '../repositories/comment.repository';
import { CommentReactionRepository } from '../repositories/comment-reaction.repository';
import { CommentAuthorizationService } from './comment-authorization.service';
import { CommentNotificationPublisher } from './comment-notification.publisher';
import { CommentRealtimePublisher } from './comment-realtime.publisher';
import { CommentPostType } from '@prisma/client';

describe('CommentCommandService (reactions & tree integrity)', () => {
  let service: CommentCommandService;
  let prisma: { $transaction: jest.Mock; user: { findMany: jest.Mock } };
  let commentRepository: {
    findById: jest.Mock;
    create: jest.Mock;
    incrementReplyCount: jest.Mock;
    update: jest.Mock;
    findByIdWithAuthor: jest.Mock;
  };
  let reactionRepository: {
    upsert: jest.Mock;
    remove: jest.Mock;
    updateCommentCounts: jest.Mock;
  };
  let authorizationService: {
    resolvePost: jest.Mock;
    resolvePostType: jest.Mock;
    assertCanAccessPost: jest.Mock;
    canModerate: jest.Mock;
  };
  let notificationPublisher: {
    publishCommentOnPost: jest.Mock;
    publishCommentReply: jest.Mock;
    publishCommentReaction: jest.Mock;
    publishCommentMentions: jest.Mock;
  };
  let realtimePublisher: {
    publishCommentCreated: jest.Mock;
    publishCommentUpdated: jest.Mock;
    publishCommentDeleted: jest.Mock;
    publishCommentReaction: jest.Mock;
  };

  const baseComment = {
    id: 'c1',
    postId: 'p1',
    postType: 'PERSONAL' as CommentPostType,
    parentCommentId: null,
    authorId: 'u1',
    content: 'hello',
    status: 'ACTIVE',
    upvoteCount: 0,
    downvoteCount: 0,
    replyCount: 0,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    editedAt: null,
    deletedAt: null,
  };

  beforeEach(() => {
    const tx = {
      comment: { update: jest.fn() },
      post: { update: jest.fn() },
      communityPost: { update: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn((fn) => fn(tx)),
      user: { findMany: jest.fn() },
    };
    commentRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      incrementReplyCount: jest.fn(),
      update: jest.fn(),
      findByIdWithAuthor: jest.fn(),
    };
    reactionRepository = {
      upsert: jest.fn(),
      remove: jest.fn(),
      updateCommentCounts: jest.fn(),
    };
    authorizationService = {
      resolvePost: jest
        .fn()
        .mockResolvedValue({ postId: 'p1', postType: 'PERSONAL' }),
      resolvePostType: jest.fn(),
      assertCanAccessPost: jest.fn(),
      canModerate: jest.fn().mockResolvedValue(false),
    };
    notificationPublisher = {
      publishCommentOnPost: jest.fn(),
      publishCommentReply: jest.fn(),
      publishCommentReaction: jest.fn(),
      publishCommentMentions: jest.fn(),
    };
    realtimePublisher = {
      publishCommentCreated: jest.fn(),
      publishCommentUpdated: jest.fn(),
      publishCommentDeleted: jest.fn(),
      publishCommentReaction: jest.fn(),
    };

    service = new CommentCommandService(
      prisma as any,
      commentRepository as any,
      reactionRepository as any,
      authorizationService as any,
      notificationPublisher as any,
      realtimePublisher as any,
    );
  });

  describe('reactToComment', () => {
    it('handles a fresh upvote: +1 upvote, scoreDelta +1', async () => {
      commentRepository.findById.mockResolvedValue(baseComment);
      reactionRepository.upsert.mockResolvedValue({
        reaction: { vote: 'UPVOTE' },
        isNew: true,
      });

      const result = await service.reactToComment({
        commentId: 'c1',
        userId: 'u2',
        vote: 'UPVOTE',
      });

      expect(reactionRepository.updateCommentCounts).toHaveBeenCalledWith(
        'c1',
        { upvotes: 1, downvotes: 0 },
        expect.any(Object),
      );
      expect(result.scoreDelta).toBe(1);
      expect(notificationPublisher.publishCommentReaction).toHaveBeenCalledWith(
        {
          commentId: 'c1',
          commentAuthorId: 'u1',
          actorUserId: 'u2',
          vote: 'UPVOTE',
        },
      );
    });

    it('handles a fresh downvote: +1 downvote, scoreDelta -1', async () => {
      commentRepository.findById.mockResolvedValue(baseComment);
      reactionRepository.upsert.mockResolvedValue({
        reaction: { vote: 'DOWNVOTE' },
        isNew: true,
      });

      const result = await service.reactToComment({
        commentId: 'c1',
        userId: 'u2',
        vote: 'DOWNVOTE',
      });

      expect(reactionRepository.updateCommentCounts).toHaveBeenCalledWith(
        'c1',
        { upvotes: 0, downvotes: 1 },
        expect.any(Object),
      );
      expect(result.scoreDelta).toBe(-1);
    });

    it('switches upvote to downvote: -1 upvote, +1 downvote, scoreDelta -2', async () => {
      commentRepository.findById.mockResolvedValue(baseComment);
      reactionRepository.upsert.mockResolvedValue({
        reaction: { vote: 'DOWNVOTE' },
        isNew: false,
        previousVote: 'UPVOTE',
      });

      const result = await service.reactToComment({
        commentId: 'c1',
        userId: 'u2',
        vote: 'DOWNVOTE',
      });

      expect(reactionRepository.updateCommentCounts).toHaveBeenCalledWith(
        'c1',
        { upvotes: -1, downvotes: 1 },
        expect.any(Object),
      );
      expect(result.scoreDelta).toBe(-2);
    });

    it('switches downvote to upvote: +1 upvote, -1 downvote, scoreDelta +2', async () => {
      commentRepository.findById.mockResolvedValue(baseComment);
      reactionRepository.upsert.mockResolvedValue({
        reaction: { vote: 'UPVOTE' },
        isNew: false,
        previousVote: 'DOWNVOTE',
      });

      const result = await service.reactToComment({
        commentId: 'c1',
        userId: 'u2',
        vote: 'UPVOTE',
      });

      expect(reactionRepository.updateCommentCounts).toHaveBeenCalledWith(
        'c1',
        { upvotes: 1, downvotes: -1 },
        expect.any(Object),
      );
      expect(result.scoreDelta).toBe(2);
    });

    it('does not double-count when the same vote is resubmitted', async () => {
      commentRepository.findById.mockResolvedValue(baseComment);
      reactionRepository.upsert.mockResolvedValue({
        reaction: { vote: 'UPVOTE' },
        isNew: false,
      });

      const result = await service.reactToComment({
        commentId: 'c1',
        userId: 'u2',
        vote: 'UPVOTE',
      });

      expect(reactionRepository.updateCommentCounts).toHaveBeenCalledWith(
        'c1',
        { upvotes: 0, downvotes: 0 },
        expect.any(Object),
      );
      expect(result.scoreDelta).toBe(0);
    });
  });

  describe('removeReaction', () => {
    it('removes an upvote: -1 upvote, scoreDelta -1', async () => {
      commentRepository.findById.mockResolvedValue(baseComment);
      reactionRepository.remove.mockResolvedValue({ vote: 'UPVOTE' });

      const result = await service.removeReaction('c1', 'u2');

      expect(reactionRepository.updateCommentCounts).toHaveBeenCalledWith(
        'c1',
        { upvotes: -1, downvotes: 0 },
        expect.any(Object),
      );
      expect(result.scoreDelta).toBe(-1);
    });

    it('removes a downvote: -1 downvote, scoreDelta +1', async () => {
      commentRepository.findById.mockResolvedValue(baseComment);
      reactionRepository.remove.mockResolvedValue({ vote: 'DOWNVOTE' });

      const result = await service.removeReaction('c1', 'u2');

      expect(reactionRepository.updateCommentCounts).toHaveBeenCalledWith(
        'c1',
        { upvotes: 0, downvotes: -1 },
        expect.any(Object),
      );
      expect(result.scoreDelta).toBe(1);
    });

    it('is a no-op when the reaction does not exist', async () => {
      commentRepository.findById.mockResolvedValue(baseComment);
      reactionRepository.remove.mockResolvedValue(null);

      const result = await service.removeReaction('c1', 'u2');

      expect(reactionRepository.updateCommentCounts).not.toHaveBeenCalled();
      expect(result.scoreDelta).toBe(0);
    });
  });

  describe('cross-post reply protection', () => {
    it('rejects a reply whose parent belongs to a different post', async () => {
      commentRepository.findById.mockResolvedValue({
        ...baseComment,
        id: 'parent1',
        postId: 'post-A',
      });
      authorizationService.resolvePost.mockResolvedValue({
        postId: 'post-B',
        postType: 'PERSONAL',
      });

      await expect(
        service.createComment({
          postId: 'post-B',
          postType: 'PERSONAL',
          authorId: 'u2',
          content: 'reply',
          parentCommentId: 'parent1',
        }),
      ).rejects.toThrow(
        'Reply parent comment does not belong to the same post',
      );
    });

    it('rejects creation on a post the user cannot access', async () => {
      authorizationService.assertCanAccessPost.mockImplementation(() => {
        throw new Error(
          'You do not have permission to view or comment on this post',
        );
      });

      await expect(
        service.createComment({
          postId: 'p1',
          postType: 'PERSONAL',
          authorId: 'u2',
          content: 'hello',
        }),
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('notifications', () => {
    it('notifies the post author on a new root comment', async () => {
      commentRepository.findById.mockResolvedValue(null);
      commentRepository.create.mockResolvedValue({ ...baseComment, id: 'c2' });
      commentRepository.findByIdWithAuthor.mockResolvedValue({
        ...baseComment,
        id: 'c2',
        author: { id: 'u2', username: 'u2' },
      });
      prisma.user.findMany.mockResolvedValue([]);
      authorizationService.resolvePost.mockResolvedValue({
        postId: 'p1',
        postType: 'PERSONAL',
        authorId: 'u1',
      });

      await service.createComment({
        postId: 'p1',
        postType: 'PERSONAL',
        authorId: 'u2',
        content: 'hello',
      });

      expect(notificationPublisher.publishCommentOnPost).toHaveBeenCalledWith({
        postId: 'p1',
        postType: 'PERSONAL',
        commentId: 'c2',
        postAuthorId: 'u1',
        actorUserId: 'u2',
      });
    });

    it('notifies the parent author on a reply instead of the post author', async () => {
      commentRepository.findById.mockResolvedValue({
        ...baseComment,
        id: 'parent1',
        postId: 'p1',
        authorId: 'u1',
      });
      commentRepository.create.mockResolvedValue({
        ...baseComment,
        id: 'c3',
        parentCommentId: 'parent1',
      });
      commentRepository.findByIdWithAuthor.mockResolvedValue({
        ...baseComment,
        id: 'c3',
        parentCommentId: 'parent1',
        author: { id: 'u2', username: 'u2' },
      });
      prisma.user.findMany.mockResolvedValue([]);
      commentRepository.incrementReplyCount.mockResolvedValue(undefined);

      await service.createComment({
        postId: 'p1',
        postType: 'PERSONAL',
        authorId: 'u2',
        content: 'reply to parent',
        parentCommentId: 'parent1',
      });

      expect(notificationPublisher.publishCommentReply).toHaveBeenCalledWith({
        postId: 'p1',
        postType: 'PERSONAL',
        parentCommentId: 'parent1',
        commentId: 'c3',
        parentAuthorId: 'u1',
        actorUserId: 'u2',
      });
    });

    it('notifies mentioned users but not the actor', async () => {
      commentRepository.findById.mockResolvedValue(null);
      commentRepository.create.mockResolvedValue({ ...baseComment, id: 'c4' });
      commentRepository.findByIdWithAuthor.mockResolvedValue({
        ...baseComment,
        id: 'c4',
        author: { id: 'u2', username: 'u2' },
      });
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u3' }]);

      await service.createComment({
        postId: 'p1',
        postType: 'PERSONAL',
        authorId: 'u2',
        content: 'hi @u1 and @u3',
      });

      expect(notificationPublisher.publishCommentMentions).toHaveBeenCalledWith(
        {
          commentId: 'c4',
          mentionedUserIds: ['u1', 'u3'],
          actorUserId: 'u2',
        },
      );
    });
  });
});
