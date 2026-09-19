import { CommunityModerationActionType } from '@prisma/client';

import {
  CommunityCommentNotFoundException,
  CommunityNotFoundException,
  CommunityPostNotFoundException,
} from '../exceptions/community.exceptions';
import { CommunityModerationService } from './community-moderation.service';

/**
 * Unit tests for CommunityModerationService.
 *
 * Coverage priorities:
 * - Domain exceptions are thrown for missing community / wrong target.
 * - Effects (mute, delete-post, delete-comment) call the right repository.
 * - The audit row is created with the right shape.
 * - Realtime events fire AFTER the audit row is durably written, in the
 *   right order (MODERATION_RECORDED first, then the resource-level
 *   side-effect event). See PR #6 — the previous implementation published
 *   DELETE_POST/DELETE_COMMENT before the audit row existed, which broke
 *   the "audience is told only after the action is reconcilable from
 *   durable storage" contract.
 */
describe('CommunityModerationService', () => {
  let service: CommunityModerationService;
  let repository: any;
  let actionRepository: any;
  let postRepository: any;
  let commentRepository: any;
  let subscriptionRepository: any;
  let access: any;
  let eventPublisher: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const communityRecord = {
    id: 'c1',
    serverId: 'srv1',
    ownerId: 'u1',
    name: 'Nexus',
    slug: 'nexus',
    createdAt: now,
    updatedAt: now,
  };

  const auditRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'a1',
    communityId: 'c1',
    moderatorUserId: 'u1',
    actionType: CommunityModerationActionType.MUTE,
    targetUserId: 'u2',
    objectType: null,
    objectId: null,
    reason: null,
    createdAt: now,
    ...overrides,
  });

  beforeEach(() => {
    repository = { findBySlugWithRelations: jest.fn() };
    actionRepository = {
      create: jest.fn(),
      list: jest.fn(),
      listByActionType: jest.fn(),
    };
    postRepository = {
      findById: jest.fn(),
      softDelete: jest.fn(),
      update: jest.fn(),
    };
    commentRepository = {
      findById: jest.fn(),
      softDelete: jest.fn(),
    };
    subscriptionRepository = { setMuted: jest.fn() };
    access = { assertModerator: jest.fn() };
    eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    service = new CommunityModerationService(
      repository,
      actionRepository,
      postRepository,
      commentRepository,
      subscriptionRepository,
      access,
      eventPublisher,
    );
  });

  describe('record', () => {
    it('should throw when the community does not exist', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(null);

      await expect(
        service.record('nope', 'u1', {
          actionType: CommunityModerationActionType.WARN,
        }),
      ).rejects.toBeInstanceOf(CommunityNotFoundException);

      expect(actionRepository.create).not.toHaveBeenCalled();
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should mute a target user and record an audit action', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      subscriptionRepository.setMuted.mockResolvedValue({ id: 'sub1' });
      actionRepository.create.mockResolvedValue(auditRow());

      await service.record('nexus', 'u1', {
        actionType: CommunityModerationActionType.MUTE,
        targetUserId: 'u2',
      });

      expect(subscriptionRepository.setMuted).toHaveBeenCalledWith(
        'c1',
        'u2',
        true,
      );
      expect(actionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          community: { connect: { id: 'c1' } },
          moderatorUserId: 'u1',
          actionType: CommunityModerationActionType.MUTE,
          targetUserId: 'u2',
        }),
      );
    });

    it('should publish MODERATION_RECORDED after the audit row is written', async () => {
      const calls: string[] = [];

      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      subscriptionRepository.setMuted.mockImplementation(async () => {
        calls.push('effect');
        return { id: 'sub1' };
      });
      actionRepository.create.mockImplementation(async () => {
        calls.push('audit');
        return auditRow();
      });
      eventPublisher.publish.mockImplementation(async () => {
        calls.push('publish');
      });

      await service.record('nexus', 'u1', {
        actionType: CommunityModerationActionType.MUTE,
        targetUserId: 'u2',
      });

      // Effect + audit must run before any publish; the publish happens
      // only after both are durable.
      expect(calls[0]).not.toBe('publish');
      expect(calls[1]).not.toBe('publish');
      expect(calls[calls.length - 1]).toBe('publish');

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'c1',
        'community:moderation:recorded',
        expect.objectContaining({
          action: expect.objectContaining({ id: 'a1' }),
        }),
      );
    });

    it('should NOT publish a resource-level event for MUTE', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      subscriptionRepository.setMuted.mockResolvedValue({ id: 'sub1' });
      actionRepository.create.mockResolvedValue(auditRow());

      await service.record('nexus', 'u1', {
        actionType: CommunityModerationActionType.MUTE,
        targetUserId: 'u2',
      });

      // Only MODERATION_RECORDED is published; MUTE has no post/comment
      // side effect.
      expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        'c1',
        'community:moderation:recorded',
        expect.any(Object),
      );
    });

    it('should delete a post and publish POST_DELETED after the audit row', async () => {
      const calls: string[] = [];

      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      postRepository.findById.mockImplementation(async () => {
        calls.push('read-post');
        return { id: 'p1', communityId: 'c1' };
      });
      postRepository.softDelete.mockImplementation(async () => {
        calls.push('soft-delete');
      });
      actionRepository.create.mockImplementation(async () => {
        calls.push('audit');
        return auditRow({
          actionType: CommunityModerationActionType.DELETE_POST,
          objectType: 'POST',
          objectId: 'p1',
        });
      });
      eventPublisher.publish.mockImplementation(async () => {
        calls.push('publish');
      });

      await service.record('nexus', 'u1', {
        actionType: CommunityModerationActionType.DELETE_POST,
        objectType: 'POST',
        objectId: 'p1',
      });

      // Soft delete must happen before the audit row; the publish must
      // happen after the audit row.
      expect(calls.indexOf('soft-delete')).toBeLessThan(calls.indexOf('audit'));
      expect(calls.indexOf('audit')).toBeLessThan(calls.indexOf('publish'));

      // Two publishes: MODERATION_RECORDED first, POST_DELETED second.
      expect(eventPublisher.publish).toHaveBeenCalledTimes(2);
      expect(eventPublisher.publish).toHaveBeenNthCalledWith(
        1,
        'c1',
        'community:moderation:recorded',
        expect.any(Object),
      );
      expect(eventPublisher.publish).toHaveBeenNthCalledWith(
        2,
        'c1',
        'community:post:deleted',
        expect.objectContaining({ postId: 'p1', communityId: 'c1' }),
      );
    });

    it('should throw when the post is not in the community', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      postRepository.findById.mockResolvedValue({
        id: 'p1',
        communityId: 'other',
      });

      await expect(
        service.record('nexus', 'u1', {
          actionType: CommunityModerationActionType.DELETE_POST,
          objectId: 'p1',
        }),
      ).rejects.toBeInstanceOf(CommunityPostNotFoundException);

      expect(actionRepository.create).not.toHaveBeenCalled();
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should delete a comment and publish COMMENT_DELETED after the audit row', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      commentRepository.findById.mockResolvedValue({ id: 'cm1' });
      postRepository.findById.mockResolvedValue({
        id: 'p1',
        communityId: 'c1',
      });
      actionRepository.create.mockResolvedValue(auditRow());

      await service.record('nexus', 'u1', {
        actionType: CommunityModerationActionType.DELETE_COMMENT,
        objectId: 'cm1',
      });

      expect(commentRepository.softDelete).toHaveBeenCalledWith('cm1');

      expect(eventPublisher.publish).toHaveBeenCalledTimes(2);
      expect(eventPublisher.publish).toHaveBeenNthCalledWith(
        1,
        'c1',
        'community:moderation:recorded',
        expect.any(Object),
      );
      expect(eventPublisher.publish).toHaveBeenNthCalledWith(
        2,
        'c1',
        'community:comment:deleted',
        expect.objectContaining({ commentId: 'cm1', communityId: 'c1' }),
      );
    });

    it('should throw when the comment does not exist', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      commentRepository.findById.mockResolvedValue(null);

      await expect(
        service.record('nexus', 'u1', {
          actionType: CommunityModerationActionType.DELETE_COMMENT,
          objectId: 'cm1',
        }),
      ).rejects.toBeInstanceOf(CommunityCommentNotFoundException);

      expect(actionRepository.create).not.toHaveBeenCalled();
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should pin a post and publish POST_UPDATED with isPinned=true', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      postRepository.findById.mockResolvedValue({
        id: 'p1',
        communityId: 'c1',
      });
      actionRepository.create.mockResolvedValue(auditRow());

      await service.record('nexus', 'u1', {
        actionType: CommunityModerationActionType.PIN_POST,
        objectId: 'p1',
      });

      expect(postRepository.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ isPinned: true, pinnedAt: expect.any(Date) }),
      );

      expect(eventPublisher.publish).toHaveBeenCalledTimes(2);
      expect(eventPublisher.publish).toHaveBeenNthCalledWith(
        2,
        'c1',
        'community:post:updated',
        expect.objectContaining({ postId: 'p1', isPinned: true }),
      );
    });

    it('should unpin a post and publish POST_UPDATED with isPinned=false', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      postRepository.findById.mockResolvedValue({
        id: 'p1',
        communityId: 'c1',
      });
      actionRepository.create.mockResolvedValue(auditRow());

      await service.record('nexus', 'u1', {
        actionType: CommunityModerationActionType.UNPIN_POST,
        objectId: 'p1',
      });

      expect(postRepository.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ isPinned: false, pinnedAt: null }),
      );

      expect(eventPublisher.publish).toHaveBeenCalledTimes(2);
      expect(eventPublisher.publish).toHaveBeenNthCalledWith(
        2,
        'c1',
        'community:post:updated',
        expect.objectContaining({ postId: 'p1', isPinned: false }),
      );
    });
  });

  describe('list', () => {
    it('should list moderation actions with a next cursor when hasMore', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      actionRepository.list.mockResolvedValue([
        { id: 'a1', createdAt: now },
        { id: 'a2', createdAt: now },
        { id: 'a3', createdAt: now },
      ]);

      const result = await service.list('nexus', 'u1', undefined, undefined, 2);

      expect(actionRepository.list).toHaveBeenCalledWith('c1', 3, undefined);
      expect(result.items).toHaveLength(2);
      // Encoded two-field cursor, not a raw id.
      expect(typeof result.nextCursor).toBe('string');
      expect(result.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should return null nextCursor when the page is not full', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      actionRepository.list.mockResolvedValue([{ id: 'a1', createdAt: now }]);

      const result = await service.list(
        'nexus',
        'u1',
        undefined,
        undefined,
        20,
      );

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('should filter by action type', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      actionRepository.listByActionType.mockResolvedValue([
        { id: 'a1', createdAt: now },
      ]);

      await service.list(
        'nexus',
        'u1',
        CommunityModerationActionType.WARN,
        undefined,
        20,
      );

      expect(actionRepository.listByActionType).toHaveBeenCalledWith(
        'c1',
        CommunityModerationActionType.WARN,
        21,
        undefined,
      );
    });
  });
});
