import { Injectable } from '@nestjs/common';

import { Prisma, ServerChannelType } from '@prisma/client';

import { ServerCategoryRepository } from '../repositories/server-category.repository';
import { ServerChannelRepository } from '../repositories/server-channel.repository';

import { ServerStructure } from '../domain/server-structure.interface';

@Injectable()
export class ServerStructureService {
  constructor(
    private readonly categoryRepository: ServerCategoryRepository,
    private readonly channelRepository: ServerChannelRepository,
  ) {}

  async createStructure(
    serverId: string,
    structure: ServerStructure,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    let categoryPosition = 0;

    for (const category of structure.categories) {
      const createdCategory =
        await this.categoryRepository.create(
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

      let channelPosition = 0;

      for (const channel of category.channels) {
        await this.channelRepository.create(
          {
            name: channel.name,

            type:
              channel.type as ServerChannelType,

            topic: channel.topic,

            position: channelPosition++,

            category: {
              connect: {
                id: createdCategory.id,
              },
            },
          },
          tx,
        );
      }
    }
  }
}