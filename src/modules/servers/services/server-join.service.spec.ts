import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ServerJoinService } from './server-join.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { ServerRepository } from '../repositories/server.repository';
import { ServerMemberRepository } from '../repositories/server-member.repository';
import { ServerBanRepository } from '../repositories/server-ban.repository';
import { ServerMemberService } from './server-member.service';
import { ServerPermissionService } from './server-permission.service';

describe('ServerJoinService - leave', () => {
  let service: ServerJoinService;
  let prisma: { $transaction: jest.Mock };
  let memberRepository: {
    findByServerAndUser: jest.Mock;
    findOwner: jest.Mock;
    markRemoved: jest.Mock;
    findByServerAndUserIncludingRemoved: jest.Mock;
    restoreMembership: jest.Mock;
  };
  let permissionService: { clearUserCache: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(undefined)),
    };
    memberRepository = {
      findByServerAndUser: jest.fn(),
      findOwner: jest.fn(),
      markRemoved: jest.fn(),
      findByServerAndUserIncludingRemoved: jest.fn(),
      restoreMembership: jest.fn(),
    };
    permissionService = { clearUserCache: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerJoinService,
        { provide: PrismaService, useValue: prisma },
        { provide: ServerRepository, useValue: { findById: jest.fn() } },
        { provide: ServerMemberRepository, useValue: memberRepository },
        {
          provide: ServerBanRepository,
          useValue: { findByServerAndUser: jest.fn() },
        },
        {
          provide: ServerMemberService,
          useValue: { createMemberWithDefaultRole: jest.fn() },
        },
        { provide: ServerPermissionService, useValue: permissionService },
      ],
    }).compile();

    service = module.get(ServerJoinService);
  });

  describe('leaveServer', () => {
    it('should soft-remove the member and clear their permission cache', async () => {
      memberRepository.findByServerAndUser.mockResolvedValue({
        id: 'member-1',
        serverId: 'srv-1',
        userId: 'user-1',
      });
      memberRepository.findOwner.mockResolvedValue({ userId: 'user-owner' });

      const result = await service.leaveServer('srv-1', 'user-1');

      expect(memberRepository.markRemoved).toHaveBeenCalledWith(
        'member-1',
        expect.any(Date),
        undefined,
      );
      expect(permissionService.clearUserCache).toHaveBeenCalledWith(
        'srv-1',
        'user-1',
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFound when the caller is not a member', async () => {
      memberRepository.findByServerAndUser.mockResolvedValue(null);

      await expect(service.leaveServer('srv-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject the server owner from leaving', async () => {
      memberRepository.findByServerAndUser.mockResolvedValue({
        id: 'member-owner',
        serverId: 'srv-1',
        userId: 'user-owner',
      });
      memberRepository.findOwner.mockResolvedValue({ userId: 'user-owner' });

      await expect(service.leaveServer('srv-1', 'user-owner')).rejects.toThrow(
        BadRequestException,
      );
      expect(memberRepository.markRemoved).not.toHaveBeenCalled();
    });
  });
});
