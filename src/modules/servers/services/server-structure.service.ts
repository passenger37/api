import { Injectable, Logger } from '@nestjs/common';

import { Prisma, ServerChannelType } from '@prisma/client';

import { ServerCategoryRepository } from '../repositories/server-category.repository';
import { ServerChannelRepository } from '../repositories/server-channel.repository';

import { ServerStructure } from '../domain/server-structure.interface';

import { SearchService } from '../../search/services/search.service';

@Injectable()
export class ServerStructureService {
  private readonly logger = new Logger(ServerStructureService.name);

  constructor(
    private readonly categoryRepository: ServerCategoryRepository,
    private readonly channelRepository: ServerChannelRepository,
    private readonly searchService: SearchService,
  ) {}

  async createStructure(
    serverId: string,
    ownerId: string,
    structure: ServerStructure,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    let categoryPosition = 0;
    let channelPosition = 0;

    for (const category of structure.categories) {
      const createdCategory = await this.categoryRepository.create(
        {
          name: category.name,
          position: categoryPosition++,

          server: {
            connect: {
              id: serverId,
            },
          },
        },
        tx,
      );

      for (const channel of category.channels) {
        const createdChannel = await this.channelRepository.create(
          {
            name: channel.name,

            type: channel.type,

            position: channelPosition++,

            server: {
              connect: {
                id: serverId,
              },
            },

            createdBy: {
              connect: {
                id: ownerId,
              },
            },

            category: {
              connect: {
                id: createdCategory.id,
              },
            },
          },
          tx,
        );

        await this.indexChannel(createdChannel);
      }
    }
  }

  private async indexChannel(channel: {
    id: string;
    serverId: string;
    name: string;
    description: string | null;
    type: ServerChannelType;
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
}
