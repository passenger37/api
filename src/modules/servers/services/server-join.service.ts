import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, ServerVisibility } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { ServerRepository } from '../repositories/server.repository';
import { ServerMemberRepository } from '../repositories/server-member.repository';
import { ServerMemberService } from './server-member.service';

@Injectable()
export class ServerJoinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
    private readonly memberRepository: ServerMemberRepository,
    private readonly memberService: ServerMemberService,
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

    const existingMember = await this.memberRepository.findByUser(
      serverId,
      userId,
    );

    if (existingMember) {
      return existingMember;
    }

    return this.prisma.$transaction((tx: Prisma.TransactionClient) =>
      this.memberService.createMemberWithDefaultRole(serverId, userId, tx),
    );
  }
}
