import { Injectable } from '@nestjs/common';

import { Prisma, ServerPermission } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { ServerChannelRepository } from '../repositories/server-channel.repository';

import { ServerChannelValidationService } from './server-channel-validation.service';

import { ServerPermissionService } from './server-permission.service';

import { CreateServerChannelRequest } from '../dto/request/create-server-channel.request';
import { UpdateServerChannelRequest } from '../dto/request/update-server-channel.request';

@Injectable()
export class ServerChannelCommandService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly repository: ServerChannelRepository,

    private readonly validation: ServerChannelValidationService,

    private readonly permissionService: ServerPermissionService,
  ) {}

  async createChannel(
    serverId: string,
    userId: string,
    request: CreateServerChannelRequest,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.CHANNEL_CREATE,
    );

    this.validation.validateReservedName(request.name);

    await this.validation.validateUniqueName(serverId, request.name);

    await this.validation.validateChannelLimit(serverId);

    if (request.categoryId) {
      await this.validation.validateCategoryExists(request.categoryId);
    }

    const highestPosition = await this.repository.getHighestPosition(serverId);

    return this.prisma.$transaction(async (tx) => {
      return this.repository.create(
        {
          name: request.name,

          description: request.description,

          type: request.type,

          position: highestPosition + 1,

          server: {
            connect: {
              id: serverId,
            },
          },

          createdBy: {
            connect: {
              id: userId,
            },
          },

          ...(request.categoryId && {
            category: {
              connect: {
                id: request.categoryId,
              },
            },
          }),
        },
        tx,
      );
    });
  }

  async updateChannel(
    serverId: string,
    channelId: string,
    userId: string,
    request: UpdateServerChannelRequest,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.CHANNEL_UPDATE,
    );

    await this.validation.validateChannelExists(channelId);

    return this.prisma.$transaction(async (tx) => {
      return this.repository.update(
        channelId,
        {
          ...(request.name && {
            name: request.name,
          }),

          ...(request.description !== undefined && {
            description: request.description,
          }),
        },
        tx,
      );
    });
  }

  async deleteChannel(serverId: string, channelId: string, userId: string) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      ServerPermission.CHANNEL_DELETE,
    );

    await this.validation.validateChannelExists(channelId);

    return this.prisma.$transaction(async (tx) => {
      return this.repository.delete(channelId, tx);
    });
  }
}
