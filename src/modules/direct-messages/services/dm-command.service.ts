import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserStatus, DirectMessageMode } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { UserQueryService } from '../../users/services/user-query.service';
import { UserSocialRepository } from '../../users/repositories/user-social.repository';
import { MessageSpamControlService } from '../../messages/services/message-spam-control.service';
import { SearchService } from '../../search/services/search.service';

import { DirectMessageChannelRepository } from '../repositories/direct-message-channel.repository';
import { DirectMessageRepository } from '../repositories/direct-message.repository';
import { DirectMessageReadStateRepository } from '../repositories/direct-message-read-state.repository';
import { DirectMessageChannelSettingsRepository } from '../repositories/direct-message-channel-settings.repository';
import { serializeDirectMessage } from '../serializers/dm.serializer';
import { DmGateway } from '../gateways/dm.gateway';
import { DmAttachmentService } from './dm-attachment.service';

@Injectable()
export class DmCommandService {
  private readonly logger = new Logger(DmCommandService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly channelRepository: DirectMessageChannelRepository,
    private readonly messageRepository: DirectMessageRepository,
    private readonly readStateRepository: DirectMessageReadStateRepository,
    private readonly channelSettingsRepository: DirectMessageChannelSettingsRepository,
    private readonly userQueryService: UserQueryService,
    private readonly userSocialRepository: UserSocialRepository,
    private readonly spamControl: MessageSpamControlService,
    private readonly attachmentService: DmAttachmentService,
    @Inject(forwardRef(() => DmGateway))
    private readonly gateway: DmGateway,
    private readonly searchService: SearchService,
  ) {}

  async open(
    userId: string,
    targetUserId: string,
    mode: DirectMessageMode = DirectMessageMode.STANDARD,
  ) {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot message yourself.');
    }

    await this.assertNotBlockedPair(userId, targetUserId);

    const target = await this.userQueryService.findById(targetUserId);

    if (!target || target.status !== UserStatus.ACTIVE || !!target.deletedAt) {
      throw new NotFoundException('User not found.');
    }

    const existing = await this.channelRepository.findPair(
      userId,
      targetUserId,
    );

    if (existing) {
      if (existing.mode !== mode) {
        throw new BadRequestException(
          mode === DirectMessageMode.PRIVATE_E2EE
            ? 'You already have a standard (unencrypted) conversation with this user.'
            : 'You already have an end-to-end encrypted conversation with this user.',
        );
      }
      return existing;
    }

    return this.channelRepository.create(userId, targetUserId, mode);
  }

  async send(
    channelId: string,
    senderId: string,
    content: string,
    clientMessageId?: string,
    parentMessageId?: string,
    attachmentIds?: string[],
  ) {
    const channel = await this.channelRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== senderId && channel.userBId !== senderId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    if (channel.mode === DirectMessageMode.PRIVATE_E2EE) {
      throw new BadRequestException(
        'This channel is end-to-end encrypted. Use the E2EE message endpoint.',
      );
    }

    await this.assertNotBlocked(channel, senderId);

    this.assertContent(content);

    await this.spamControl.checkSend(channelId, senderId, content);

    if (parentMessageId) {
      await this.validateReplyTarget(parentMessageId, channelId);
    }

    if (clientMessageId) {
      const existing = await this.messageRepository.findByClientMessageId(
        clientMessageId,
        senderId,
      );

      if (existing) {
        return {
          message: serializeDirectMessage(existing),
          deduplicated: true,
        };
      }
    }

    try {
      const message = await this.prisma.$transaction(async (tx) => {
        const messageSeq =
          await this.channelRepository.incrementCounterAndTouch(
            channelId,
            new Date(),
            tx,
          );

        const created = await this.messageRepository.create(
          {
            content,
            messageSeq,
            channel: {
              connect: {
                id: channelId,
              },
            },
            author: {
              connect: {
                id: senderId,
              },
            },
            ...(clientMessageId && { clientMessageId }),
            ...(parentMessageId && {
              parentMessage: {
                connect: {
                  id: parentMessageId,
                },
              },
            }),
          },
          tx,
        );

        if (attachmentIds?.length) {
          await this.attachmentService.attachToMessage(
            created.id,
            channelId,
            senderId,
            attachmentIds,
            tx,
          );
        }

        return created;
      });

      await this.indexDirectMessage({
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        authorId: senderId,
      });

      const payload = serializeDirectMessage(message);

      this.gateway.broadcastMessageCreated(channelId, payload);

      return {
        message: payload,
        deduplicated: false,
      };
    } catch (error) {
      if (clientMessageId && this.isUniqueViolation(error)) {
        const existing = await this.messageRepository.findByClientMessageId(
          clientMessageId,
          senderId,
        );

        if (existing) {
          return {
            message: serializeDirectMessage(existing),
            deduplicated: true,
          };
        }
      }

      throw error;
    }
  }

  private async validateReplyTarget(
    parentMessageId: string,
    channelId: string,
  ) {
    const parent = await this.messageRepository.findById(parentMessageId);

    if (!parent || parent.isDeleted) {
      throw new BadRequestException('Reply target message not found.');
    }

    if (parent.channelId !== channelId) {
      throw new BadRequestException(
        'Cannot reply to a message from another conversation.',
      );
    }
  }

  private async indexDirectMessage(message: {
    id: string;
    content: string;
    createdAt: Date;
    authorId: string;
  }) {
    try {
      await this.searchService.indexDirectMessage(message.id, {
        authorId: message.authorId,
        content: message.content,
        createdAt: message.createdAt,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to index direct message ${message.id} in search: ${(error as Error).message}`,
      );
    }
  }

  async edit(
    messageId: string,
    userId: string,
    content: string,
    expectedVersion?: number,
  ) {
    this.assertContent(content);

    const message = await this.messageRepository.findById(messageId);

    if (!message || message.isDeleted) {
      throw new NotFoundException('Message not found.');
    }

    if (message.authorUserId !== userId) {
      throw new BadRequestException('You can only edit your own messages.');
    }

    if (message.isE2ee) {
      throw new BadRequestException(
        'This message is end-to-end encrypted and cannot be edited via the plaintext endpoint.',
      );
    }

    if (expectedVersion && message.version !== expectedVersion) {
      throw new BadRequestException(
        'Message was updated elsewhere; please refresh and retry.',
      );
    }

    const edited = await this.messageRepository.update(messageId, {
      content,
      isEdited: true,
      editedAt: new Date(),
      version: {
        increment: 1,
      },
    });

    const payload = {
      messageId: edited.id,
      content: edited.content,
      version: edited.version,
    };

    this.gateway.broadcastMessageUpdated(message.channelId, payload);

    return serializeDirectMessage(edited);
  }

  async delete(messageId: string, userId: string) {
    const message = await this.messageRepository.findById(messageId);

    if (!message || message.isDeleted) {
      throw new NotFoundException('Message not found.');
    }

    if (message.authorUserId !== userId) {
      throw new BadRequestException('You can only delete your own messages.');
    }

    await this.messageRepository.softDelete(messageId);

    this.gateway.broadcastMessageDeleted(message.channelId, messageId);

    return {
      success: true,
      messageId,
    };
  }

  async markRead(
    channelId: string,
    userId: string,
    lastReadMessageId?: string,
  ) {
    const channel = await this.channelRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    const existing = await this.readStateRepository.find(channelId, userId);

    const candidate = lastReadMessageId
      ? await this.messageRepository.findById(lastReadMessageId)
      : await this.messageRepository.findLatestForRead(channelId);

    if (lastReadMessageId && !candidate) {
      throw new BadRequestException(
        'Read cursor references an unknown message.',
      );
    }

    if (candidate && candidate.channelId !== channelId) {
      throw new BadRequestException(
        'Read cursor message belongs to another channel.',
      );
    }

    const cursor = candidate
      ? {
          lastReadMessageId: candidate.id,
          lastReadAt: candidate.createdAt,
        }
      : {
          lastReadMessageId: null,
          lastReadAt: new Date(),
        };

    const canAdvance =
      !existing?.lastReadAt || cursor.lastReadAt > existing.lastReadAt;

    const unreadCount = await this.readStateRepository.countUnreadAfter(
      channelId,
      canAdvance
        ? cursor.lastReadAt
        : (existing?.lastReadAt ?? cursor.lastReadAt),
      userId,
    );

    const state = canAdvance
      ? await this.readStateRepository.upsert(channelId, userId, {
          ...cursor,
          unreadCount,
        })
      : existing;

    const result = {
      channelId,
      lastReadMessageId: state?.lastReadMessageId ?? null,
      lastReadAt: state?.lastReadAt ?? cursor.lastReadAt,
      unreadCount,
    };

    this.gateway.broadcastMessageRead(channelId, {
      channelId,
      userId,
      lastReadMessageId: result.lastReadMessageId,
      lastReadAt: result.lastReadAt,
      unreadCount,
    });

    return result;
  }

  /**
   * Per-participant conversation preferences (archive, mute, hide, pin).
   */
  async updateSettings(
    channelId: string,
    userId: string,
    settings: {
      isMuted?: boolean;
      isArchived?: boolean;
      isHidden?: boolean;
      isPinned?: boolean;
    },
  ) {
    const channel = await this.channelRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    return this.channelSettingsRepository.upsert(channelId, userId, settings);
  }

  /**
   * Block enforcement — both directions are authoritative: if either
   * participant has blocked the other, messaging is rejected.
   */
  async assertNotBlocked(
    channel: { userAId: string; userBId: string },
    senderId: string,
  ): Promise<void> {
    const recipientId =
      channel.userAId === senderId ? channel.userBId : channel.userAId;

    await this.assertNotBlockedPair(senderId, recipientId);
  }

  async assertNotBlockedForChannel(
    channelId: string,
    userId: string,
  ): Promise<void> {
    const channel = await this.channelRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    await this.assertNotBlocked(channel, userId);
  }

  private async assertNotBlockedPair(
    userAId: string,
    userBId: string,
  ): Promise<void> {
    const [recipientBlocksSender, senderBlocksRecipient] = await Promise.all([
      this.userSocialRepository.existsBlock(userAId, userBId),
      this.userSocialRepository.existsBlock(userBId, userAId),
    ]);

    if (recipientBlocksSender || senderBlocksRecipient) {
      throw new ForbiddenException(
        'Message cannot be sent to a user with an active block relationship.',
      );
    }
  }

  private assertContent(content: string) {
    if (!content || content.length < 1 || content.length > 4000) {
      throw new BadRequestException('Message content is invalid.');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
