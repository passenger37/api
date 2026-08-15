import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../core/database/prisma.service';

import { ServerInviteValidationService } from './server-invite-validation.service';

import { ServerInviteRepository } from '../repositories/server-invite.repository';

import { ServerMemberRepository } from '../../repositories/server-member.repository';
import { ServerMemberService } from '../../services/server-member.service';

@Injectable()
export class ServerInviteJoinService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly inviteRepository: ServerInviteRepository,

    private readonly memberRepository: ServerMemberRepository,

    private readonly memberService: ServerMemberService,

    private readonly validation: ServerInviteValidationService,
  ) {}

  async join(code: string, userId: string) {
    // ---------------------------------------
    // Resolve Invite
    // ---------------------------------------

    const invite = await this.validation.validateInviteCode(code);

    this.validation.validateInvite(invite);

    // ---------------------------------------
    // Already Joined?
    // ---------------------------------------

    const existingMember = await this.memberRepository.findByUser(
      invite.serverId,
      userId,
    );

    if (existingMember) {
      return existingMember;
    }

    // ---------------------------------------
    // Transaction
    // ---------------------------------------

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const member = await this.memberService.createMemberWithDefaultRole(
        invite.serverId,
        userId,
        tx,
      );

      await this.inviteRepository.incrementUses(invite.id, tx);

      return member;
    });
  }
}
