import { CommunityModerationActionType } from '@prisma/client';

import {
  CommunityCommentNotFoundException,
  CommunityNotFoundException,
  CommunityPostNotFoundException,
} from '../exceptions/community.exceptions';
import { CommunityModerationService } from './community-moderation.service';

describe('CommunityModerationService', () => {
  let service: CommunityModerationService;
  let repository: any;
  let actionRepository: any;
  let postRepository: any;
  let commentRepository: any;
  let subscriptionRepository: any;
  let access: any;

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

  beforeEach(() => {
    repository = { findBySlugWithRelations: jest.fn() };
    actionRepository = {
      create: jest.fn(),
      list: jest.fn(),
      listByActionType: jest.fn(),
    };
    postRepository = { findById: jest.fn(), softDelete: jest.fn() };
    commentRepository = { findById: jest.fn(), softDelete: jest.fn() };
    subscriptionRepository = { setMuted: jest.fn() };
    access = { assertModerator: jest.fn() };

    service = new CommunityModerationService(
      repository,
      actionRepository,
      postRepository,
      commentRepository,
      subscriptionRepository,
      access,
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
    });

    it('should mute a target user', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      subscriptionRepository.setMuted.mockResolvedValue({ id: 'sub1' });

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

    it('should delete a post in the community', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      postRepository.findById.mockResolvedValue({
        id: 'p1',
        communityId: 'c1',
      });

      await service.record('nexus', 'u1', {
        actionType: CommunityModerationActionType.DELETE_POST,
        objectType: 'POST',
        objectId: 'p1',
      });

      expect(postRepository.softDelete).toHaveBeenCalledWith('p1');
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
    });

    it('should delete a comment', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      commentRepository.findById.mockResolvedValue({ id: 'cm1' });

      await service.record('nexus', 'u1', {
        actionType: CommunityModerationActionType.DELETE_COMMENT,
        objectId: 'cm1',
      });

      expect(commentRepository.softDelete).toHaveBeenCalledWith('cm1');
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
    });
  });

  describe('list', () => {
    it('should list moderation actions with a next cursor', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      actionRepository.list.mockResolvedValue([
        { id: 'a1', createdAt: now },
        { id: 'a2', createdAt: now },
      ]);

      const result = await service.list('nexus', 'u1', undefined, undefined, 2);

      expect(actionRepository.list).toHaveBeenCalledWith('c1', 2, undefined);
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('a2');
    });

    it('should filter by action type', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      actionRepository.listByActionType.mockResolvedValue([{ id: 'a1', createdAt: now }]);

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
        20,
        undefined,
      );
    });
  });
});
