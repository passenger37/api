import { CommunityModeratorRole } from '@prisma/client';

import {
  CommunityCategoryConflictException,
  CommunityNotFoundException,
} from '../exceptions/community.exceptions';
import { CommunityCommandService } from './community-command.service';

describe('CommunityCommandService', () => {
  let service: CommunityCommandService;
  let prisma: any;
  let slugService: any;
  let repository: any;
  let categoryRepository: any;
  let moderatorRepository: any;
  let serverMemberRepository: any;
  let serverPermissionService: any;
  let eventPublisher: any;
  let access: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const communityRecord = {
    id: 'c1',
    serverId: 'srv1',
    ownerId: 'u1',
    name: 'Nexus',
    slug: 'nexus',
    description: null,
    iconUrl: null,
    visibility: 'PUBLIC',
    discoveryEnabled: true,
    rules: null,
    createdAt: now,
    updatedAt: now,
    _count: { posts: 0, subscriptions: 0 },
  };

  beforeEach(() => {
    prisma = { $transaction: jest.fn() };
    slugService = { generate: jest.fn() };
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlugWithRelations: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    categoryRepository = {
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    moderatorRepository = {
      upsert: jest.fn(),
      remove: jest.fn(),
    };
    serverMemberRepository = { findByServerAndUser: jest.fn() };
    serverPermissionService = {
      hasPermission: jest.fn(),
      clearUserCache: jest.fn(),
    };
    eventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    access = {
      assertOwner: jest.fn(),
      assertModerator: jest.fn(),
      assertAdmin: jest.fn(),
      roleFor: jest.fn(),
    };

    service = new CommunityCommandService(
      prisma,
      slugService,
      repository,
      categoryRepository,
      moderatorRepository,
      serverMemberRepository,
      serverPermissionService,
      access,
      eventPublisher,
    );
  });

  describe('create', () => {
    it('should create a community and assign the owner as admin', async () => {
      slugService.generate.mockResolvedValue('nexus');
      serverMemberRepository.findByServerAndUser.mockResolvedValue({ id: 'm1' });
      serverPermissionService.hasPermission.mockResolvedValue(true);
      repository.create.mockResolvedValue({ ...communityRecord, id: 'c1' });
      moderatorRepository.upsert.mockResolvedValue({ id: 'm1' });
      prisma.$transaction.mockImplementation(async (cb) => cb({}));
      repository.findById.mockResolvedValue(communityRecord);

      const result = await service.create('u1', {
        serverId: 'srv1',
        name: 'Nexus',
        visibility: 'PUBLIC',
      });

      expect(slugService.generate).toHaveBeenCalledWith('Nexus');
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: 'srv1',
          ownerId: 'u1',
          name: 'Nexus',
          slug: 'nexus',
          visibility: 'PUBLIC',
        }),
        expect.anything(),
      );
      expect(moderatorRepository.upsert).toHaveBeenCalledWith(
        'c1',
        'u1',
        CommunityModeratorRole.ADMIN,
        expect.anything(),
      );
      expect(result.id).toBe('c1');
    });
  });

  describe('update', () => {
    it('should require ownership before updating', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      repository.update.mockResolvedValue(communityRecord);
      repository.findById.mockResolvedValue(communityRecord);

      await service.update('nexus', 'u1', { name: 'Updated' });

      expect(access.assertOwner).toHaveBeenCalledWith('c1', 'u1');
      expect(repository.update).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ name: 'Updated' }),
      );
    });

    it('should throw when the community does not exist', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(null);

      await expect(service.update('nope', 'u1', {})).rejects.toBeInstanceOf(
        CommunityNotFoundException,
      );
    });
  });

  describe('createCategory', () => {
    it('should reject a duplicate category name', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      categoryRepository.findByName.mockResolvedValue({ id: 'cat1' });

      await expect(
        service.createCategory('nexus', 'u1', { name: 'General' }),
      ).rejects.toBeInstanceOf(CommunityCategoryConflictException);
    });

    it('should create a category at the next position', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertModerator.mockResolvedValue(undefined);
      categoryRepository.findByName.mockResolvedValue(null);
      prisma.communityCategory = { count: jest.fn().mockResolvedValue(2) };
      access.roleFor.mockResolvedValue(CommunityModeratorRole.MODERATOR);
      categoryRepository.create.mockResolvedValue({
        id: 'cat1',
        communityId: 'c1',
        name: 'General',
        description: null,
        position: 2,
        createdAt: now,
        updatedAt: now,
      });

      await service.createCategory('nexus', 'u1', { name: 'General' });

      expect(categoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'General',
          position: 2,
        }),
      );
    });
  });

  describe('addModerator / removeModerator', () => {
    it('should require admin to add a moderator', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertAdmin.mockResolvedValue(undefined);
      moderatorRepository.upsert.mockResolvedValue({ id: 'm1' });

      await service.addModerator(
        'nexus',
        'u1',
        'u2',
        CommunityModeratorRole.MODERATOR,
      );

      expect(access.assertAdmin).toHaveBeenCalledWith('c1', 'u1');
      expect(moderatorRepository.upsert).toHaveBeenCalledWith(
        'c1',
        'u2',
        CommunityModeratorRole.MODERATOR,
      );
    });

    it('should require admin to remove a moderator', async () => {
      repository.findBySlugWithRelations.mockResolvedValue(communityRecord);
      access.assertAdmin.mockResolvedValue(undefined);

      await service.removeModerator('nexus', 'u1', 'u2');

      expect(moderatorRepository.remove).toHaveBeenCalledWith('c1', 'u2');
    });
  });
});
