import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../core/database/prisma.service';

import { CreateServerInviteRequest } from '../dto/request/create-server-invite.request';
import { CreateServerInviteResponse } from '../dto/reponse/create-server-invite.response';

import { ServerInviteRepository } from '../repositories/server-invite.repository';

import { InviteCodeService } from './invite-code.service';
import { ServerInviteValidationService } from './server-invite-validation.service';

import { ServerInviteMapper } from '../mappers/server-invite.mapper';

import { ServerPermissionService } from '../../services/server-permission.service';

import { ServerPermission } from '@prisma/client';

@Injectable()
export class ServerInviteCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ServerInviteRepository,
    private readonly validation: ServerInviteValidationService,
    private readonly inviteCodeService: InviteCodeService,
    private readonly permissionService: ServerPermissionService,
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

    await this.permissionService.requirePermission(
      serverId,
      creatorId,
      ServerPermission.INVITE_CREATE,
    );

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

          temporary: request.isTemporary ?? false,

          uses: 0,

          server: {
            connect: {
              id: serverId,
            },
          },

          createdBy: {
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

  async revokeInvite(
    serverId: string,
    userId: string,
    inviteId: string,
  ): Promise<void> {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.INVITE_DELETE,
    );

    await this.validation.validateInviteExists(inviteId);

    await this.repository.revoke(inviteId);
  }

  async deleteInvite(
    serverId: string,
    userId: string,
    inviteId: string,
  ): Promise<void> {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.INVITE_DELETE,
    );

    await this.validation.validateInviteExists(inviteId);

    await this.repository.delete(inviteId);
  }
}
