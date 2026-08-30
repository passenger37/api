import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { ServerModerationService } from './server-moderation.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { ServerMemberRepository } from '../repositories/server-member.repository';
import { ServerBanRepository } from '../repositories/server-ban.repository';
import { ModerationAuditRepository } from '../repositories/moderation-audit.repository';
import { ServerMemberQueryService } from './server-member-query.service';
import { ServerHierarchyService } from './server-hierarchy.service';
import { ServerPermissionService } from './server-permission.service';

describe('ServerModerationService', () => {
  let service: ServerModerationService;
  let prisma: { $transaction: jest.Mock };
  let memberQueryService: { getMemberOrThrow: jest.Mock };
  let memberRepository: {
    findById: jest.Mock;
    markRemoved: jest.Mock;
    findHighestRoleAny: jest.Mock;
  };
  let banRepository: {
    findByServerAndUser: jest.Mock;
    create: jest.Mock;
    deleteByServerAndUser: jest.Mock;
    listByServer: jest.Mock;
  };
  let auditRepository: { create: jest.Mock };
  let hierarchyService: { requireHigherRole: jest.Mock };
  let permissionService: {
    requirePermission: jest.Mock;
    clearUserCache: jest.Mock;
  };

  const actor = { id: 'actor-member', serverId: 'srv-1', userId: 'actor-user' };
  const target = {
    id: 'target-member',
    serverId: 'srv-1',
    userId: 'target-user',
    removedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(undefined)),
    };
    memberQueryService = { getMemberOrThrow: jest.fn() };
    memberRepository = {
      findById: jest.fn(),
      markRemoved: jest.fn(),
      findHighestRoleAny: jest.fn(),
    };
    banRepository = {
      findByServerAndUser: jest.fn(),
      create: jest.fn(),
      deleteByServerAndUser: jest.fn(),
      listByServer: jest.fn(),
    };
    auditRepository = { create: jest.fn() };
    hierarchyService = { requireHigherRole: jest.fn() };
    permissionService = {
      requirePermission: jest.fn(),
      clearUserCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerModerationService,
        { provide: PrismaService, useValue: prisma },
        { provide: ServerMemberQueryService, useValue: memberQueryService },
        { provide: ServerMemberRepository, useValue: memberRepository },
        { provide: ServerBanRepository, useValue: banRepository },
        { provide: ModerationAuditRepository, useValue: auditRepository },
        { provide: ServerHierarchyService, useValue: hierarchyService },
        { provide: ServerPermissionService, useValue: permissionService },
      ],
    }).compile();

    service = module.get(ServerModerationService);
  });

  describe('kickMember', () => {
    it('should soft-remove the member and write an audit entry', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue(actor);
      memberRepository.findById.mockResolvedValue(target);
      memberRepository.findHighestRoleAny.mockResolvedValue({
        name: 'Member',
        position: 1,
      });
      hierarchyService.requireHigherRole.mockResolvedValue(undefined);

      const result = await service.kickMember(
        'srv-1',
        'actor-user',
        'target-member',
        'repeated spam',
      );

      expect(memberRepository.markRemoved).toHaveBeenCalledWith(
        'target-member',
        expect.any(Date),
        undefined,
      );
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MEMBER_KICKED',
          actorMemberId: 'actor-member',
          targetUserId: 'target-user',
          targetMemberId: 'target-member',
          reason: 'repeated spam',
        }),
        undefined,
      );
      expect(permissionService.clearUserCache).toHaveBeenCalledWith(
        'srv-1',
        'target-user',
      );
      expect(result.success).toBe(true);
    });

    it('should require MEMBER_KICK', async () => {
      permissionService.requirePermission.mockRejectedValue(
        new ForbiddenException('Missing permission: MEMBER_KICK'),
      );

      await expect(
        service.kickMember('srv-1', 'actor-user', 'target-member'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject self-moderation', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue({
        ...actor,
        userId: 'target-user',
      });
      memberRepository.findById.mockResolvedValue(target);

      await expect(
        service.kickMember('srv-1', 'target-user', 'target-member'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject kicking an already-removed member', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue(actor);
      memberRepository.findById.mockResolvedValue({
        ...target,
        removedAt: new Date(),
      });

      await expect(
        service.kickMember('srv-1', 'actor-user', 'target-member'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject moderating the owner', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue(actor);
      memberRepository.findById.mockResolvedValue(target);
      memberRepository.findHighestRoleAny.mockResolvedValue({
        name: 'Owner',
        position: 10,
      });

      await expect(
        service.kickMember('srv-1', 'actor-user', 'target-member'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject a target from another server', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue(actor);
      memberRepository.findById.mockResolvedValue({
        ...target,
        serverId: 'other',
      });

      await expect(
        service.kickMember('srv-1', 'actor-user', 'target-member'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('banMember', () => {
    it('should create a ban, soft-remove membership, and audit', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue(actor);
      memberRepository.findById.mockResolvedValue(target);
      banRepository.findByServerAndUser.mockResolvedValue(null);
      memberRepository.findHighestRoleAny.mockResolvedValue(null);

      const result = await service.banMember(
        'srv-1',
        'actor-user',
        'target-member',
        'harassment',
      );

      expect(banRepository.create).toHaveBeenCalledWith(
        {
          serverId: 'srv-1',
          userId: 'target-user',
          bannedById: 'actor-user',
          reason: 'harassment',
        },
        undefined,
      );
      expect(memberRepository.markRemoved).toHaveBeenCalledWith(
        'target-member',
        expect.any(Date),
        undefined,
      );
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MEMBER_BANNED' }),
        undefined,
      );
      expect(permissionService.clearUserCache).toHaveBeenCalledWith(
        'srv-1',
        'target-user',
      );
      expect(result.success).toBe(true);
    });

    it('should reject re-banning an already banned user', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue(actor);
      memberRepository.findById.mockResolvedValue(target);
      banRepository.findByServerAndUser.mockResolvedValue({ id: 'ban-1' });

      await expect(
        service.banMember('srv-1', 'actor-user', 'target-member'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unbanMember', () => {
    it('should remove the ban and audit', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue(actor);
      memberRepository.findById.mockResolvedValue(target);
      banRepository.findByServerAndUser.mockResolvedValue({ id: 'ban-1' });

      const result = await service.unbanMember(
        'srv-1',
        'actor-user',
        'target-member',
      );

      expect(banRepository.deleteByServerAndUser).toHaveBeenCalledWith(
        'srv-1',
        'target-user',
        undefined,
      );
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MEMBER_UNBANNED' }),
        undefined,
      );
      expect(result.success).toBe(true);
    });

    it('should reject unbanning a member without an active ban', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      memberQueryService.getMemberOrThrow.mockResolvedValue(actor);
      memberRepository.findById.mockResolvedValue(target);
      banRepository.findByServerAndUser.mockResolvedValue(null);

      await expect(
        service.unbanMember('srv-1', 'actor-user', 'target-member'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listBans', () => {
    it('should require MEMBER_BAN and serialize results', async () => {
      permissionService.requirePermission.mockResolvedValue(undefined);
      banRepository.listByServer.mockResolvedValue([
        {
          id: 'ban-1',
          serverId: 'srv-1',
          userId: 'target-user',
          reason: 'spam',
          bannedById: 'actor-user',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          user: {
            id: 'target-user',
            username: 'troll',
            displayName: 'Troll',
            avatarUrl: null,
          },
        },
      ]);

      const result = await service.listBans('srv-1', 'actor-user', {
        limit: 50,
      });

      expect(result.items[0]).toMatchObject({
        id: 'ban-1',
        userId: 'target-user',
        reason: 'spam',
        bannedById: 'actor-user',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      expect(result.items[0].user?.username).toBe('troll');
    });
  });
});
