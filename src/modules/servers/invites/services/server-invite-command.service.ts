import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../core/database/prisma.service';

import { CreateServerInviteRequest } from '../dto/request/create-server-invite.request';
import { CreateServerInviteResponse } from '../dto/reponse/create-server-invite.response';

import { ServerInviteRepository } from '../repositories/server-invite.repository';

import { InviteCodeService } from './invite-code.service';
import { ServerInviteValidationService } from './server-invite-validation.service';

import { ServerInviteMapper } from '../mappers/server-invite.mapper';

@Injectable()
export class ServerInviteCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ServerInviteRepository,
    private readonly validation: ServerInviteValidationService,
    private readonly inviteCodeService: InviteCodeService,
  ) {}

  private async generateUniqueCode(): Promise<string> {
    while (true) {
      const code = this.inviteCodeService.generate();

      const exists = await this.repository.existsByCode(code);

      if (!exists) {
        return code;
      }
    }
  }

  async createInvite(
    serverId: string,
    creatorId: string,
    request: CreateServerInviteRequest,
  ): Promise<CreateServerInviteResponse> {
    await this.validation.validateServer(serverId);

    await this.validation.validateMember(serverId, creatorId);

    // Permission validation will be added
    // after the Permission Engine is implemented.

    await this.validation.validateRequest(
      request.maxUses,
      request.expiresInHours,
    );

    const code = await this.generateUniqueCode();

    const expiresAt = request.expiresInHours
      ? new Date(Date.now() + request.expiresInHours * 60 * 60 * 1000)
      : null;

    const invite = await this.prisma.$transaction(async (tx) => {
      return this.repository.create(
        {
          code,
          maxUses: request.maxUses,
          expiresAt,
          isTemporary: request.isTemporary ?? false,
          uses: 0,

          server: {
            connect: {
              id: serverId,
            },
          },

          creator: {
            connect: {
              id: creatorId,
            },
          },
        },
        tx,
      );
    });

    return ServerInviteMapper.toResponse(invite);
  }
}
