import { Injectable, Logger } from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { ServerChannelRepository } from '../repositories/server-channel.repository';

import { ServerChannelValidationService } from './server-channel-validation.service';

import { ServerPermissionService } from './server-permission.service';

import { CreateServerChannelRequest } from '../dto/request/create-server-channel.request';
import { UpdateServerChannelRequest } from '../dto/request/update-server-channel.request';

import { SearchService } from '../../search/services/search.service';

@Injectable()
export class ServerChannelCommandService {
  private readonly logger = new Logger(ServerChannelCommandService.name);

  constructor(
    private readonly prisma: PrismaService,

    private readonly repository: ServerChannelRepository,

    private readonly validation: ServerChannelValidationService,

    private readonly permissionService: ServerPermissionService,

    private readonly searchService: SearchService,
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

    const channel = await this.prisma.$transaction(async (tx) => {
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

    await this.indexChannel(channel);

    return channel;
  }

  private async indexChannel(channel: {
    id: string;
    serverId: string;
    name: string;
    description: string | null;
    type: string;
    createdAt: Date;
  }) {
    try {
      await this.searchService.indexChannel(channel.id, {
        serverId: channel.serverId,
        name: channel.name,
        description: channel.description || undefined,
        type: channel.type,
        createdAt: channel.createdAt,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to index channel ${channel.id} in search: ${(error as Error).message}`,
      );
    }
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
