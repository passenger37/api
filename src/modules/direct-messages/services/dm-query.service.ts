import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DirectMessageChannelRepository } from '../repositories/direct-message-channel.repository';
import { DirectMessageRepository } from '../repositories/direct-message.repository';
import { DirectMessageReadStateRepository } from '../repositories/direct-message-read-state.repository';
import {
  serializeDirectMessage,
  serializeDirectMessageChannel,
} from '../serializers/dm.serializer';

@Injectable()
export class DmQueryService {
  constructor(
    private readonly channelRepository: DirectMessageChannelRepository,
    private readonly messageRepository: DirectMessageRepository,
    private readonly readStateRepository: DirectMessageReadStateRepository,
  ) {}

  async listChannels(userId: string, cursor?: string, limit = 50) {
    const channels = await this.channelRepository.listForUser(
      userId,
      cursor,
      limit,
    );

    const rows: Array<ReturnType<typeof serializeDirectMessageChannel>> = [];

    for (const channel of channels) {
      const readState = await this.readStateRepository.find(channel.id, userId);

      rows.push(serializeDirectMessageChannel(channel, userId, readState));
    }

    return rows;
  }

  async getChannel(channelId: string, userId: string) {
    const channel = await this.channelRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    this.assertMember(channel, userId);

    const readState = await this.readStateRepository.find(channelId, userId);

    return serializeDirectMessageChannel(channel, userId, readState);
  }

  async getHistory(
    channelId: string,
    userId: string,
    cursor?: string,
    limit = 50,
  ) {
    await this.getChannel(channelId, userId);

    const messages = await this.messageRepository.findPage(
      channelId,
      cursor,
      limit,
    );

    return messages.map(serializeDirectMessage).reverse();
  }

  async getMessagesAfter(
    channelId: string,
    userId: string,
    afterMessageId: string,
  ) {
    await this.getChannel(channelId, userId);

    const anchor = await this.messageRepository.findById(afterMessageId);

    if (!anchor || anchor.channelId !== channelId || anchor.isDeleted) {
      throw new BadRequestException(
        'Last known message does not belong to this channel.',
      );
    }

    const messages = await this.messageRepository.findAfter(
      channelId,
      afterMessageId,
    );

    return messages.map(serializeDirectMessage);
  }

  assertMember(channel: { userAId: string; userBId: string }, userId: string) {
    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }
  }
}
