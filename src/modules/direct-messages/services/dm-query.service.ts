import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DirectMessage, DirectMessageAttachment } from '@prisma/client';

import { DirectMessageChannelRepository } from '../repositories/direct-message-channel.repository';
import { DirectMessageRepository } from '../repositories/direct-message.repository';
import { DirectMessageReadStateRepository } from '../repositories/direct-message-read-state.repository';
import { DirectMessageReactionRepository } from '../repositories/direct-message-reaction.repository';
import { DirectMessageAttachmentRepository } from '../repositories/direct-message-attachment.repository';
import { DirectMessageChannelSettingsRepository } from '../repositories/direct-message-channel-settings.repository';
import {
  serializeDirectMessage,
  serializeDirectMessageChannel,
  serializeReactionSummary,
  serializeAttachments,
} from '../serializers/dm.serializer';
import { DirectMessageResponse } from '../responses';

@Injectable()
export class DmQueryService {
  constructor(
    private readonly channelRepository: DirectMessageChannelRepository,
    private readonly messageRepository: DirectMessageRepository,
    private readonly readStateRepository: DirectMessageReadStateRepository,
    private readonly settingsRepository: DirectMessageChannelSettingsRepository,
    private readonly reactionRepository: DirectMessageReactionRepository,
    private readonly attachmentRepository: DirectMessageAttachmentRepository,
  ) {}

  async listChannels(userId: string, cursor?: string, limit = 50) {
    const channels = await this.channelRepository.listForUser(
      userId,
      cursor,
      limit,
    );

    const channelIds = channels.map((channel) => channel.id);

    const [readStates, settings] = await Promise.all([
      this.readStateRepository.findForUser(userId, channelIds),
      this.settingsRepository.findForUser(userId, channelIds),
    ]);

    const readStateByChannel = new Map(
      readStates.map((state) => [state.channelId, state]),
    );
    const settingsByChannel = new Map(
      settings.map((setting) => [setting.channelId, setting]),
    );

    return channels
      .filter((channel) => !settingsByChannel.get(channel.id)?.isHidden)
      .map((channel) =>
        serializeDirectMessageChannel(
          channel,
          userId,
          readStateByChannel.get(channel.id),
          settingsByChannel.get(channel.id),
        ),
      );
  }

  async getChannel(channelId: string, userId: string) {
    const channel = await this.channelRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    this.assertMember(channel, userId);

    const [readState, settings] = await Promise.all([
      this.readStateRepository.find(channelId, userId),
      this.settingsRepository.find(channelId, userId),
    ]);

    return serializeDirectMessageChannel(channel, userId, readState, settings);
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

    const hydrated = await this.hydrateMessages(messages, userId);

    return hydrated.reverse();
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

    return this.hydrateMessages(messages, userId);
  }

  private async hydrateMessages(
    messages: DirectMessage[],
    viewerUserId: string,
  ): Promise<DirectMessageResponse[]> {
    if (messages.length === 0) {
      return [];
    }

    const messageIds = messages.map((message) => message.id);

    const [counts, viewer, attachments] = await Promise.all([
      this.reactionRepository.countReactionsByMessages(messageIds),
      this.reactionRepository.viewerReactions(messageIds, viewerUserId),
      this.attachmentRepository.findByMessageIds(messageIds),
    ]);

    const attachmentsByMessage = new Map<string, DirectMessageAttachment[]>();

    for (const attachment of attachments) {
      const list = attachmentsByMessage.get(attachment.messageId!) ?? [];
      list.push(attachment);
      attachmentsByMessage.set(attachment.messageId!, list);
    }

    return messages.map((message) => {
      const response = serializeDirectMessage(message);

      const byEmoji = counts.get(message.id);
      response.reactions = byEmoji
        ? serializeReactionSummary(byEmoji, viewer.get(message.id) ?? new Set())
        : [];

      const messageAttachments = attachmentsByMessage.get(message.id);
      response.attachments = messageAttachments
        ? serializeAttachments(messageAttachments)
        : [];

      return response;
    });
  }

  assertMember(channel: { userAId: string; userBId: string }, userId: string) {
    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }
  }
}
