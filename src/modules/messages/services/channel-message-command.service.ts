import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { toClientMessage } from '../utils/message.mapper';
import { ChannelMessageEditRepository } from '../repositories/channel-message-edit.repository';
import { ChannelMentionRepository } from '../repositories/channel-message-mention.repository';
import { ChannelReadStateRepository } from '../repositories/channel-read-state.repository';
import { ChannelMentionResolver } from './channel-mention-resolver.service';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageGateway } from '../gateways/channel-message.gateway';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { OutboxEventRepository } from '../repositories/outbox-event.repository';
import { MessageAttachmentService } from './message-attachment.service';
import { MessageSpamControlService } from './message-spam-control.service';
import { ChannelMessageCacheService } from './channel-message-cache.service';

import { SearchService } from '../../search/services/search.service';

@Injectable()
export class ChannelMessageCommandService {
  private readonly logger = new Logger(ChannelMessageCommandService.name);

  constructor(
    private readonly prisma: PrismaService,

    @Inject(forwardRef(() => ChannelMessageGateway))
    private readonly gateway: ChannelMessageGateway,

    private readonly repository: ChannelMessageRepository,

    private readonly editRepository: ChannelMessageEditRepository,

    private readonly mentionRepository: ChannelMentionRepository,

    private readonly mentionResolver: ChannelMentionResolver,

    private readonly readStateRepository: ChannelReadStateRepository,

    private readonly queryService: ChannelMessageQueryService,

    private readonly validation: ChannelMessageValidationService,

    private readonly memberQueryService: ServerMemberQueryService,

    private readonly outboxRepository: OutboxEventRepository,

    private readonly attachmentService: MessageAttachmentService,

    private readonly spamControl: MessageSpamControlService,

    private readonly cache: ChannelMessageCacheService,

    private readonly searchService: SearchService,
  ) {}

  async createMessage(
    channelId: string,
    userId: string,
    content: string,
    parentMessageId?: string,
    clientMessageId?: string,
    attachmentIds?: string[],
  ) {
    const channel = await this.validation.validateSendPermission(
      channelId,
      userId,
    );

    const serverId = channel.serverId;

    await this.validation.validateParentMessage(parentMessageId, channelId);

    this.validation.validateContent(content);

    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    if (clientMessageId) {
      const existing = await this.repository.findByClientMessageId(
        clientMessageId,
        member.id,
      );

      if (existing) {
        return {
          message: toClientMessage(existing),
          deduplicated: true,
        };
      }
    }

    await this.spamControl.checkSend(channelId, member.id, content);

    const mentions = await this.mentionResolver.resolve(
      content,
      serverId,
      channelId,
      userId,
    );

    try {
      const message = await this.prisma.$transaction(async (tx) => {
        const counter = await tx.serverChannel.update({
          where: {
            id: channelId,
          },

          data: {
            lastMessageSeq: {
              increment: 1,
            },
          },
        });

        const created = await this.repository.create(
          {
            content,

            messageSeq: counter.lastMessageSeq,

            server: {
              connect: {
                id: serverId,
              },
            },

            channel: {
              connect: {
                id: channelId,
              },
            },

            author: {
              connect: {
                id: member.id,
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

        let message = created;

        if (attachmentIds?.length) {
          await this.attachmentService.attachToMessage(
            created.id,
            channelId,
            member.id,
            attachmentIds,
            tx,
          );

          message = (await this.repository.findById(created.id, tx)) ?? created;
        }

        await this.mentionRepository.createMany(
          created.id,
          serverId,
          channelId,
          mentions,
          tx,
        );

        await this.outboxRepository.create(
          {
            eventType: 'message-created',
            channelId,
            payload: this.toTransportMessage(message),
          },
          tx,
        );

        return message;
      });

      await this.indexMessage({
        id: message.id,
        serverId: message.serverId,
        channelId: message.channelId,
        content: message.content,
        createdAt: message.createdAt,
        authorId: member.userId,
      });

      await this.cache.invalidateChannel(channelId);

      return {
        message: toClientMessage(message),
        deduplicated: false,
      };
    } catch (error) {
      if (clientMessageId && this.isUniqueViolation(error)) {
        const existing = await this.repository.findByClientMessageId(
          clientMessageId,
          member.id,
        );

        if (existing) {
          return {
            message: toClientMessage(existing),
            deduplicated: true,
          };
        }
      }

      throw error;
    }
  }

  private async indexMessage(message: {
    id: string;
    serverId: string;
    channelId: string;
    content: string;
    createdAt: Date;
    authorId: string;
  }) {
    try {
      await this.searchService.indexChannelMessage(message.id, {
        serverId: message.serverId,
        channelId: message.channelId,
        authorId: message.authorId,
        content: message.content,
        createdAt: message.createdAt,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to index message ${message.id} in search: ${(error as Error).message}`,
      );
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  async editMessage(
    messageId: string,
    userId: string,
    content: string,
    expectedVersion?: number,
  ) {
    this.validation.validateContent(content);

    const message = await this.queryService.getMessage(messageId);
    const serverId = message.serverId;
    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    await this.validation.validateEditPermission(
      message.authorMemberId,
      member.id,
      serverId,
      userId,
    );

    if (expectedVersion && message.version !== expectedVersion) {
      throw new BadRequestException(
        'Message was updated elsewhere; please refresh and retry.',
      );
    }

    const editedAt = new Date();

    const mentions = await this.mentionResolver.resolve(
      content,
      serverId,
      message.channelId,
      userId,
    );

    const edited = await this.prisma.$transaction(async (tx) => {
      await this.editRepository.create(
        {
          message: {
            connect: {
              id: messageId,
            },
          },

          previousContent: message.content,

          editedAt,

          editedBy: {
            connect: {
              id: member.id,
            },
          },
        },
        tx,
      );

      await this.mentionRepository.deleteManyByMessage(messageId, tx);

      await this.mentionRepository.createMany(
        messageId,
        serverId,
        message.channelId,
        mentions,
        tx,
      );

      const edited = await this.repository.update(
        messageId,
        {
          content,

          isEdited: true,

          editedAt,

          version: {
            increment: 1,
          },
        },
        tx,
      );

      await this.outboxRepository.create(
        {
          eventType: 'message-updated',
          channelId: message.channelId,
          payload: {
            messageId,
            content: edited.content,
            serverTimestamp: editedAt.toISOString(),
            version: edited.version,
            expectedVersion: expectedVersion ?? null,
          },
        },
        tx,
      );

      return edited;
    });

    await this.cache.invalidateChannel(message.channelId);

    return edited;
  }

  private toTransportMessage(message: {
    id: string;
    content: string;
    serverId: string;
    channelId: string;
    authorMemberId: string;
    parentMessageId: string | null;
    isEdited: boolean;
    editedAt: Date | null;
    isDeleted: boolean;
    deletedAt: Date | null;
    isPinned: boolean;
    pinnedAt: Date | null;
    clientMessageId: string | null;
    version: number;
    messageSeq: number;
    createdAt: Date;
    updatedAt: Date;
    attachments?: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      status: string;
    }>;
  }) {
    return {
      id: message.id,
      content: message.content,
      serverId: message.serverId,
      channelId: message.channelId,
      authorMemberId: message.authorMemberId,
      parentMessageId: message.parentMessageId,
      isEdited: message.isEdited,
      editedAt: message.editedAt?.toISOString() ?? null,
      isDeleted: message.isDeleted,
      deletedAt: message.deletedAt?.toISOString() ?? null,
      isPinned: message.isPinned,
      pinnedAt: message.pinnedAt?.toISOString() ?? null,
      clientMessageId: message.clientMessageId,
      version: message.version,
      messageSeq: message.messageSeq,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      attachments:
        message.attachments?.map((attachment) => ({
          id: attachment.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          status: attachment.status,
        })) ?? [],
    };
  }

  async deleteMessage(messageId: string, serverId: string, userId: string) {
    const message = await this.queryService.getMessage(messageId);

    const member = await this.memberQueryService.getMemberOrThrow(
      serverId,
      userId,
    );

    await this.validation.validateDeletePermission(
      message.authorMemberId,
      member.id,
      serverId,
      userId,
    );

    await this.repository.softDelete(messageId);

    await this.cache.invalidateChannel(message.channelId);

    return {
      success: true,
    };
  }

  async pinMessage(messageId: string, serverId: string, userId: string) {
    await this.validation.validatePinPermission(serverId, userId);

    const pinned = await this.repository.pin(messageId);

    await this.cache.invalidateChannel(pinned.channelId);

    return pinned;
  }

  async unpinMessage(messageId: string, serverId: string, userId: string) {
    await this.validation.validatePinPermission(serverId, userId);

    const unpinned = await this.repository.unpin(messageId);

    await this.cache.invalidateChannel(unpinned.channelId);

    return unpinned;
  }

  async markChannelRead(
    channelId: string,
    userId: string,
    lastReadMessageId?: string,
  ) {
    const { member } = await this.validation.validateChannelAccess(
      channelId,
      userId,
    );

    const existing = await this.readStateRepository.findByChannelAndMember(
      channelId,
      member.id,
    );

    const candidate = lastReadMessageId
      ? await this.repository.findById(lastReadMessageId)
      : await this.readStateRepository.findLatestMessage(channelId);

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

    const state = canAdvance
      ? await this.readStateRepository.upsert(channelId, member.id, cursor)
      : existing;

    const unreadCount = await this.readStateRepository.countUnreadAfter(
      channelId,
      state.lastReadAt,
    );

    const version = await this.cache.getChannelVersion(channelId);
    await this.cache.cacheUnread(channelId, member.id, version, unreadCount);

    return {
      channelId,
      lastReadMessageId: state.lastReadMessageId,
      lastReadAt: state.lastReadAt,
      unreadCount,
    };
  }
}
