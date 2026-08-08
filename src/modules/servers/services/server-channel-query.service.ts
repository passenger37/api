import { Injectable, NotFoundException } from '@nestjs/common';

import { ServerChannelRepository } from '../repositories/server-channel.repository';

@Injectable()
export class ServerChannelQueryService {
  constructor(private readonly repository: ServerChannelRepository) {}

  async getChannel(channelId: string) {
    const channel = await this.repository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Channel not found.');
    }

    return channel;
  }

  async getServerChannels(serverId: string) {
    return this.repository.findMany(serverId);
  }

  async getCategoryChannels(categoryId: string) {
    return this.repository.findByCategory(categoryId);
  }

  async searchChannels(serverId: string, keyword: string) {
    return this.repository.search(serverId, keyword);
  }

  async getChannelOrThrow(channelId: string) {
    return this.getChannel(channelId);
  }
}
