import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, ServerVisibility } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { ServerRepository } from '../repositories/server.repository';
import { ServerMemberRepository } from '../repositories/server-member.repository';
import { ServerBanRepository } from '../repositories/server-ban.repository';
import { ServerMemberService } from './server-member.service';
import { ServerPermissionService } from './server-permission.service';

@Injectable()
export class ServerJoinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
    private readonly memberRepository: ServerMemberRepository,
    private readonly banRepository: ServerBanRepository,
    private readonly memberService: ServerMemberService,
    private readonly permissionService: ServerPermissionService,
  ) {}

  /**
   * Lets any authenticated user join a PUBLIC server directly.
   * Private and invite-only servers must be joined via invite.
   */
  async joinPublic(serverId: string, userId: string) {
    const server = await this.serverRepository.findById(serverId);

    if (!server) {
      throw new NotFoundException('Server not found.');
    }

    if (server.visibility !== ServerVisibility.PUBLIC) {
      throw new ForbiddenException(
        'This server cannot be joined directly. Use an invite link instead.',
      );
    }

    const ban = await this.banRepository.findByServerAndUser(serverId, userId);

    if (ban) {
      throw new ForbiddenException(
        ban.reason
          ? `You are banned from this server: ${ban.reason}`
          : 'You are banned from this server.',
      );
    }

    const existingMember = await this.memberRepository.findByUser(
      serverId,
      userId,
    );

    if (existingMember) {
      return existingMember;
    }

    const previouslyRemoved =
      await this.memberRepository.findByServerAndUserIncludingRemoved(
        serverId,
        userId,
      );

    if (previouslyRemoved) {
      this.permissionService.clearUserCache(serverId, userId);

      return this.prisma.$transaction(async (tx: Prisma.TransactionClient) =>
        this.memberRepository.restoreMembership(previouslyRemoved.id, tx),
      );
    }

    return this.prisma.$transaction((tx: Prisma.TransactionClient) =>
      this.memberService.createMemberWithDefaultRole(serverId, userId, tx),
    );
  }
}
