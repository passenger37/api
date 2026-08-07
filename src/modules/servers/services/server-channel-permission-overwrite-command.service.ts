import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

import { UpsertChannelPermissionOverwriteRequest } from '../dto/request/upsert-channel-permission-overwrite.request';

import { ServerChannelPermissionOverwriteRepository } from '../repositories/server-channel-permission-overwrite.repository';

import { ServerChannelPermissionOverwriteValidationService } from './server-channel-permission-overwrite-validation.service';

@Injectable()
export class ServerChannelPermissionOverwriteCommandService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly repository: ServerChannelPermissionOverwriteRepository,

    private readonly validation: ServerChannelPermissionOverwriteValidationService,
  ) {}

  async upsertOverwrite(
    channelId: string,
    request: UpsertChannelPermissionOverwriteRequest,
  ) {
    await this.validation.validateChannelExists(channelId);

    await this.validation.validateOverwriteTarget(
      request.roleId,
      request.memberId,
    );

    await this.validation.validateAllowDeny(request.allow, request.deny);

    if (request.roleId) {
      await this.validation.validateRoleExists(request.roleId);

      await this.validation.validateDuplicateRoleOverwrite(
        channelId,
        request.roleId,
        request.permission,
      );
    }

    if (request.memberId) {
      await this.validation.validateMemberExists(request.memberId);

      await this.validation.validateDuplicateMemberOverwrite(
        channelId,
        request.memberId,
        request.permission,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      return this.repository.create(
        {
          channel: {
            connect: {
              id: channelId,
            },
          },

          permission: request.permission,

          allow: request.allow,

          deny: request.deny,

          ...(request.roleId && {
            role: {
              connect: {
                id: request.roleId,
              },
            },
          }),

          ...(request.memberId && {
            member: {
              connect: {
                id: request.memberId,
              },
            },
          }),
        },
        tx,
      );
    });
  }

  async deleteOverwrite(overwriteId: string) {
    await this.repository.findById(overwriteId);

    return this.prisma.$transaction(async (tx) => {
      await this.repository.delete(overwriteId, tx);
    });
  }
}
