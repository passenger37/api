import {
  BadRequestException,
  forwardRef,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DirectMessageMode } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';
import { DirectMessageChannelRepository } from '../repositories/direct-message-channel.repository';
import { DirectMessageRepository } from '../repositories/direct-message.repository';
import { E2eeEnvelopeRepository } from '../../e2ee-transport/repositories/e2ee-envelope.repository';
import { E2eeSessionRepository } from '../../e2ee-sessions/repositories/e2ee-session.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { E2eeAttachmentCommandService } from '../../e2ee-attachments/services/e2ee-attachment-command.service';
import { serializeDirectMessage } from '../serializers/dm.serializer';
import { serializeEnvelope } from '../../e2ee-transport/serializers/e2ee-envelope.serializer';
import { serializeE2eeAttachment } from '../serializers/dm.serializer';
import { DmGateway } from '../gateways/dm.gateway';
import { DmCommandService } from './dm-command.service';
import { DmE2eeSendRequest } from '../dto/request/dm-e2ee-send.request';
import { DmE2eeEditRequest } from '../dto/request/dm-e2ee-edit.request';
import { DmE2eeDeleteRequest } from '../dto/request/dm-e2ee-delete.request';
import { DmE2eeReactionRequest } from '../dto/request/dm-e2ee-reaction.request';
import { DmE2eeReadRequest } from '../dto/request/dm-e2ee-read.request';
import { DmE2eeTypingStartRequest } from '../dto/request/dm-e2ee-typing-start.request';
import { DmE2eeTypingStopRequest } from '../dto/request/dm-e2ee-typing-stop.request';
import { DmE2eeDisappearingSettingsRequest } from '../dto/request/dm-e2ee-disappearing.request';
import { DmE2eeSendAttachmentRequest } from '../dto/request/dm-e2ee-attachment.request';

/**
 * E2EE direct message transport. This service never sees plaintext: the
 * client encrypts locally and uploads only the per-device ciphertext
 * envelopes. The server persists an empty-content DirectMessage row plus the
 * opaque envelopes and relays them to the channel members.
 */
@Injectable()
export class E2eeDmCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channelRepository: DirectMessageChannelRepository,
    private readonly messageRepository: DirectMessageRepository,
    private readonly envelopeRepo: E2eeEnvelopeRepository,
    private readonly sessionRepo: E2eeSessionRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly e2eeAttachmentService: E2eeAttachmentCommandService,
    @Inject(forwardRef(() => DmCommandService))
    private readonly dmCommandService: DmCommandService,
    @Inject(forwardRef(() => DmGateway))
    private readonly gateway: DmGateway,
  ) {}

  async sendText(userId: string, dto: DmE2eeSendRequest) {
    const channel = await this.channelRepository.findById(dto.channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    if (channel.mode !== DirectMessageMode.PRIVATE_E2EE) {
      throw new BadRequestException(
        'This channel is not end-to-end encrypted.',
      );
    }

    await this.dmCommandService.assertNotBlockedForChannel(
      dto.channelId,
      userId,
    );

    const senderDevice = await this.deviceRepo.findById(dto.senderDeviceId);
    if (!senderDevice || senderDevice.userId !== userId) {
      throw new ForbiddenException(
        'Sender device does not belong to the caller',
      );
    }
    if (senderDevice.isRevoked) {
      throw new BadRequestException('Sender device is revoked');
    }

    if (dto.envelopes.length === 0) {
      throw new BadRequestException('At least one envelope is required.');
    }

    const partnerUserId =
      channel.userAId === userId ? channel.userBId : channel.userAId;

    if (dto.clientMessageId) {
      const existing = await this.messageRepository.findByClientMessageId(
        dto.clientMessageId,
        userId,
      );

      if (existing) {
        const envelopes = await this.envelopeRepo.findByClientMessageId(
          dto.channelId,
          dto.clientMessageId,
        );

        return {
          message: serializeDirectMessage(existing),
          envelopes: envelopes.map(serializeEnvelope),
          deduplicated: true,
        };
      }
    }

    await this.validateEnvelopes(userId, partnerUserId, dto);

    const { message, envelopes } = await this.prisma.$transaction(
      async (tx) => {
        const messageSeq =
          await this.channelRepository.incrementCounterAndTouch(
            dto.channelId,
            new Date(),
            tx,
          );

        const created = await this.messageRepository.create(
          {
            content: '',
            isE2ee: true,
            senderDeviceId: dto.senderDeviceId,
            protocolVersion: dto.protocolVersion,
            messageSeq,
            channel: { connect: { id: dto.channelId } },
            author: { connect: { id: userId } },
            ...(dto.clientMessageId && {
              clientMessageId: dto.clientMessageId,
            }),
          },
          tx,
        );

        const createdEnvelopes = await Promise.all(
          dto.envelopes.map((envelope) =>
            this.envelopeRepo.create(
              {
                session: { connect: { id: envelope.sessionId } },
                type: envelope.type,
                ciphertext: envelope.ciphertext,
                protocolVersion:
                  envelope.protocolVersion ?? dto.protocolVersion,
                associatedData: envelope.associatedData,
                senderDevice: { connect: { id: dto.senderDeviceId } },
                recipientDevice: {
                  connect: { id: envelope.recipientDeviceId },
                },
                channelId: dto.channelId,
                ...(dto.clientMessageId && {
                  clientMessageId: dto.clientMessageId,
                }),
              },
              tx,
            ),
          ),
        );

        return { message: created, envelopes: createdEnvelopes };
      },
    );

    const messagePayload = serializeDirectMessage(message);
    const envelopesPayload = envelopes.map(serializeEnvelope);

    this.gateway.broadcastE2eeMessageCreated(dto.channelId, {
      message: messagePayload,
      envelopes: envelopesPayload,
    });

    return {
      message: messagePayload,
      envelopes: envelopesPayload,
      deduplicated: false,
    };
  }

  async sendAttachment(userId: string, dto: DmE2eeSendAttachmentRequest) {
    const channel = await this.channelRepository.findById(dto.channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    if (channel.mode !== DirectMessageMode.PRIVATE_E2EE) {
      throw new BadRequestException(
        'This channel is not end-to-end encrypted.',
      );
    }

    await this.dmCommandService.assertNotBlockedForChannel(
      dto.channelId,
      userId,
    );

    const senderDevice = await this.deviceRepo.findById(dto.senderDeviceId);
    if (!senderDevice || senderDevice.userId !== userId) {
      throw new ForbiddenException(
        'Sender device does not belong to the caller',
      );
    }
    if (senderDevice.isRevoked) {
      throw new BadRequestException('Sender device is revoked');
    }

    const partnerUserId =
      channel.userAId === userId ? channel.userBId : channel.userAId;

    if (dto.clientMessageId) {
      const existing = await this.messageRepository.findByClientMessageId(
        dto.clientMessageId,
        userId,
      );

      if (existing) {
        const envelopes = await this.envelopeRepo.findByClientMessageId(
          dto.channelId,
          dto.clientMessageId,
        );

        return {
          message: serializeDirectMessage(existing),
          envelopes: envelopes.map(serializeEnvelope),
          deduplicated: true,
        };
      }
    }

    await this.validateAttachmentEnvelopes(userId, partnerUserId, dto);

    const attachmentResult = await this.e2eeAttachmentService.createAttachment(
      userId,
      {
        sessionId: dto.attachment.envelopes[0]?.sessionId,
        fileName: dto.attachment.fileName,
        mimeType: dto.attachment.mimeType,
        sizeBytes: dto.attachment.sizeBytes,
        encryptedFileKey: dto.attachment.encryptedFileKey,
        fileHash: dto.attachment.fileHash,
        encryptedThumbnailKey: dto.attachment.encryptedThumbnailKey,
        thumbnailHash: dto.attachment.thumbnailHash,
        senderDeviceId: dto.senderDeviceId,
        messageId: undefined,
      },
    );

    const attachment = attachmentResult.attachment;

    if (dto.clientMessageId) {
      const existing = await this.messageRepository.findByClientMessageId(
        dto.clientMessageId,
        userId,
      );

      if (existing) {
        const envelopes = await this.envelopeRepo.findByClientMessageId(
          dto.channelId,
          dto.clientMessageId,
        );

        return {
          message: serializeDirectMessage(existing),
          envelopes: envelopes.map(serializeEnvelope),
          deduplicated: true,
        };
      }
    }

    const partnerUserIdForValidation =
      channel.userAId === userId ? channel.userBId : channel.userAId;

    if (dto.envelopes && dto.envelopes.length > 0) {
      await this.validateEnvelopes(userId, partnerUserIdForValidation, {
        channelId: dto.channelId,
        senderDeviceId: dto.senderDeviceId,
        protocolVersion: dto.protocolVersion,
        envelopes: dto.envelopes,
      });
    }

    const { message, envelopes } = await this.prisma.$transaction(
      async (tx) => {
        const messageSeq =
          await this.channelRepository.incrementCounterAndTouch(
            dto.channelId,
            new Date(),
            tx,
          );

        const created = await this.messageRepository.create(
          {
            content: '',
            isE2ee: true,
            senderDeviceId: dto.senderDeviceId,
            protocolVersion: dto.protocolVersion,
            messageSeq,
            channel: { connect: { id: dto.channelId } },
            author: { connect: { id: userId } },
            ...(dto.clientMessageId && {
              clientMessageId: dto.clientMessageId,
            }),
          },
          tx,
        );

        await this.e2eeAttachmentService.linkMessage({
          attachmentId: attachment.id,
          messageId: created.id,
        });

        const createdEnvelopes = await Promise.all(
          (dto.envelopes ?? []).map((envelope) =>
            this.envelopeRepo.create(
              {
                session: { connect: { id: envelope.sessionId } },
                type: envelope.type,
                ciphertext: envelope.ciphertext,
                protocolVersion:
                  envelope.protocolVersion ?? dto.protocolVersion,
                associatedData: envelope.associatedData,
                senderDevice: { connect: { id: dto.senderDeviceId } },
                recipientDevice: {
                  connect: { id: envelope.recipientDeviceId },
                },
                channelId: dto.channelId,
                ...(dto.clientMessageId && {
                  clientMessageId: dto.clientMessageId,
                }),
              },
              tx,
            ),
          ),
        );

        return { message: created, envelopes: createdEnvelopes };
      },
    );

    const messagePayload = serializeDirectMessage(message);
    const envelopesPayload = envelopes.map(serializeEnvelope);

    this.gateway.broadcastE2eeMessageWithAttachment(dto.channelId, {
      message: messagePayload,
      envelopes: envelopesPayload,
      attachment: serializeE2eeAttachment(attachment),
    });

    return {
      message: messagePayload,
      envelopes: envelopesPayload,
      attachment: serializeE2eeAttachment(attachment),
      deduplicated: false,
    };
  }

  private async validateAttachmentEnvelopes(
    userId: string,
    partnerUserId: string,
    dto: DmE2eeSendAttachmentRequest,
  ): Promise<void> {
    for (const envelope of dto.attachment.envelopes) {
      const recipientDevice = await this.deviceRepo.findById(
        envelope.recipientDeviceId,
      );
      if (!recipientDevice) {
        throw new NotFoundException('Recipient device not found');
      }
      if (recipientDevice.userId !== partnerUserId) {
        throw new BadRequestException(
          'Envelope recipient is not the channel partner',
        );
      }
      if (recipientDevice.isRevoked) {
        throw new BadRequestException('Recipient device is revoked');
      }

      const session = await this.sessionRepo.findById(envelope.sessionId);
      if (!session || !session.isActive) {
        throw new BadRequestException('Session is not active');
      }
      if (session.senderDeviceId !== dto.senderDeviceId) {
        throw new BadRequestException('Session does not map the sender device');
      }
      if (session.recipientDeviceId !== envelope.recipientDeviceId) {
        throw new BadRequestException(
          'Session does not map the recipient device',
        );
      }
      if (
        session.senderDevice?.userId !== userId ||
        session.recipientDevice?.userId !== partnerUserId
      ) {
        throw new BadRequestException(
          'Session does not belong to the channel participants',
        );
      }
    }
  }

  async editMessage(userId: string, dto: DmE2eeEditRequest) {
    const channel = await this.channelRepository.findById(dto.channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    if (channel.mode !== DirectMessageMode.PRIVATE_E2EE) {
      throw new BadRequestException(
        'This channel is not end-to-end encrypted.',
      );
    }

    await this.dmCommandService.assertNotBlockedForChannel(
      dto.channelId,
      userId,
    );

    const senderDevice = await this.deviceRepo.findById(dto.senderDeviceId);
    if (!senderDevice || senderDevice.userId !== userId) {
      throw new ForbiddenException(
        'Sender device does not belong to the caller',
      );
    }
    if (senderDevice.isRevoked) {
      throw new BadRequestException('Sender device is revoked');
    }

    if (dto.envelopes.length === 0) {
      throw new BadRequestException('At least one envelope is required.');
    }

    const partnerUserId =
      channel.userAId === userId ? channel.userBId : channel.userAId;

    const message = await this.messageRepository.findById(dto.messageId);

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (message.authorUserId !== userId) {
      throw new ForbiddenException('You can only edit your own messages.');
    }

    if (!message.isE2ee) {
      throw new BadRequestException(
        'Cannot edit non-E2EE messages via this endpoint.',
      );
    }

    if (message.isDeleted) {
      throw new BadRequestException('Cannot edit a deleted message.');
    }

    const partnerUserIdForValidation =
      channel.userAId === userId ? channel.userBId : channel.userAId;

    await this.validateEnvelopes(userId, partnerUserIdForValidation, {
      channelId: dto.channelId,
      senderDeviceId: dto.senderDeviceId,
      protocolVersion: dto.protocolVersion,
      envelopes: dto.envelopes,
    });

    const { message: updatedMessage, envelopes } =
      await this.prisma.$transaction(async (tx) => {
        const updated = await this.messageRepository.update(
          dto.messageId,
          {
            isEdited: true,
            editedAt: new Date(),
            version: { increment: 1 },
          },
          tx,
        );

        const createdEnvelopes = await Promise.all(
          dto.envelopes.map((envelope) =>
            this.envelopeRepo.create(
              {
                session: { connect: { id: envelope.sessionId } },
                type: envelope.type,
                ciphertext: envelope.ciphertext,
                protocolVersion:
                  envelope.protocolVersion ?? dto.protocolVersion,
                associatedData: envelope.associatedData,
                senderDevice: { connect: { id: dto.senderDeviceId } },
                recipientDevice: {
                  connect: { id: envelope.recipientDeviceId },
                },
                channelId: dto.channelId,
                clientMessageId: `${dto.messageId}-edit-${Date.now()}`,
              },
              tx,
            ),
          ),
        );

        return { message: updated, envelopes: createdEnvelopes };
      });

    const messagePayload = serializeDirectMessage(updatedMessage);
    const envelopesPayload = envelopes.map(serializeEnvelope);

    this.gateway.broadcastMessageUpdated(dto.channelId, {
      message: messagePayload,
      envelopes: envelopesPayload,
    });

    return {
      message: messagePayload,
      envelopes: envelopesPayload,
    };
  }

  async deleteMessage(userId: string, dto: DmE2eeDeleteRequest) {
    const channel = await this.channelRepository.findById(dto.channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    if (channel.mode !== DirectMessageMode.PRIVATE_E2EE) {
      throw new BadRequestException(
        'This channel is not end-to-end encrypted.',
      );
    }

    await this.dmCommandService.assertNotBlockedForChannel(
      dto.channelId,
      userId,
    );

    const senderDevice = await this.deviceRepo.findById(dto.senderDeviceId);
    if (!senderDevice || senderDevice.userId !== userId) {
      throw new ForbiddenException(
        'Sender device does not belong to the caller',
      );
    }
    if (senderDevice.isRevoked) {
      throw new BadRequestException('Sender device is revoked');
    }

    if (dto.envelopes.length === 0) {
      throw new BadRequestException('At least one envelope is required.');
    }

    const message = await this.messageRepository.findById(dto.messageId);

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (message.authorUserId !== userId) {
      throw new ForbiddenException('You can only delete your own messages.');
    }

    if (!message.isE2ee) {
      throw new BadRequestException(
        'Cannot delete non-E2EE messages via this endpoint.',
      );
    }

    if (message.isDeleted) {
      throw new BadRequestException('Message is already deleted.');
    }

    const partnerUserId =
      channel.userAId === userId ? channel.userBId : channel.userAId;

    await this.validateEnvelopes(userId, partnerUserId, {
      channelId: dto.channelId,
      senderDeviceId: dto.senderDeviceId,
      protocolVersion: dto.protocolVersion,
      envelopes: dto.envelopes,
    });

    const { envelopes } = await this.prisma.$transaction(async (tx) => {
      await this.messageRepository.update(
        dto.messageId,
        {
          isDeleted: true,
          deletedAt: new Date(),
        },
        tx,
      );

      const createdEnvelopes = await Promise.all(
        dto.envelopes.map((envelope) =>
          this.envelopeRepo.create(
            {
              session: { connect: { id: envelope.sessionId } },
              type: envelope.type,
              ciphertext: envelope.ciphertext,
              protocolVersion: envelope.protocolVersion ?? dto.protocolVersion,
              associatedData: envelope.associatedData,
              senderDevice: { connect: { id: dto.senderDeviceId } },
              recipientDevice: {
                connect: { id: envelope.recipientDeviceId },
              },
              channelId: dto.channelId,
              clientMessageId: `${dto.messageId}-delete-${Date.now()}`,
            },
            tx,
          ),
        ),
      );

      return { envelopes: createdEnvelopes };
    });

    const envelopesPayload = envelopes.map(serializeEnvelope);

    this.gateway.broadcastMessageDeleted(dto.channelId, dto.messageId);

    return {
      success: true,
      envelopes: envelopesPayload,
    };
  }

  async addReaction(userId: string, dto: DmE2eeReactionRequest) {
    const channel = await this.channelRepository.findById(dto.channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    if (channel.mode !== DirectMessageMode.PRIVATE_E2EE) {
      throw new BadRequestException(
        'This channel is not end-to-end encrypted.',
      );
    }

    await this.dmCommandService.assertNotBlockedForChannel(
      dto.channelId,
      userId,
    );

    const senderDevice = await this.deviceRepo.findById(dto.senderDeviceId);
    if (!senderDevice || senderDevice.userId !== userId) {
      throw new ForbiddenException(
        'Sender device does not belong to the caller',
      );
    }
    if (senderDevice.isRevoked) {
      throw new BadRequestException('Sender device is revoked');
    }

    if (dto.envelopes.length === 0) {
      throw new BadRequestException('At least one envelope is required.');
    }

    const message = await this.messageRepository.findById(dto.messageId);

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (!message.isE2ee) {
      throw new BadRequestException(
        'Cannot add reaction to non-E2EE messages via this endpoint.',
      );
    }

    const partnerUserId =
      channel.userAId === userId ? channel.userBId : channel.userAId;

    await this.validateEnvelopes(userId, partnerUserId, {
      channelId: dto.channelId,
      senderDeviceId: dto.senderDeviceId,
      protocolVersion: dto.protocolVersion,
      envelopes: dto.envelopes,
    });

    const { envelopes } = await this.prisma.$transaction(async (tx) => {
      const createdEnvelopes = await Promise.all(
        dto.envelopes.map((envelope) =>
          this.envelopeRepo.create(
            {
              session: { connect: { id: envelope.sessionId } },
              type: envelope.type,
              ciphertext: envelope.ciphertext,
              protocolVersion: envelope.protocolVersion ?? dto.protocolVersion,
              associatedData: envelope.associatedData,
              senderDevice: { connect: { id: dto.senderDeviceId } },
              recipientDevice: {
                connect: { id: envelope.recipientDeviceId },
              },
              channelId: dto.channelId,
              clientMessageId: `${dto.messageId}-reaction-${Date.now()}`,
            },
            tx,
          ),
        ),
      );

      return { envelopes: createdEnvelopes };
    });

    const envelopesPayload = envelopes.map(serializeEnvelope);

    this.gateway.broadcastReactionAdded(dto.channelId, {
      messageId: dto.messageId,
      envelopes: envelopesPayload,
    });

    return {
      messageId: dto.messageId,
      envelopes: envelopesPayload,
    };
  }

  async removeReaction(userId: string, dto: DmE2eeReactionRequest) {
    const channel = await this.channelRepository.findById(dto.channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    if (channel.mode !== DirectMessageMode.PRIVATE_E2EE) {
      throw new BadRequestException(
        'This channel is not end-to-end encrypted.',
      );
    }

    await this.dmCommandService.assertNotBlockedForChannel(
      dto.channelId,
      userId,
    );

    const senderDevice = await this.deviceRepo.findById(dto.senderDeviceId);
    if (!senderDevice || senderDevice.userId !== userId) {
      throw new ForbiddenException(
        'Sender device does not belong to the caller',
      );
    }
    if (senderDevice.isRevoked) {
      throw new BadRequestException('Sender device is revoked');
    }

    if (dto.envelopes.length === 0) {
      throw new BadRequestException('At least one envelope is required.');
    }

    const message = await this.messageRepository.findById(dto.messageId);

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (!message.isE2ee) {
      throw new BadRequestException(
        'Cannot remove reaction from non-E2EE messages via this endpoint.',
      );
    }

    const partnerUserId =
      channel.userAId === userId ? channel.userBId : channel.userAId;

    await this.validateEnvelopes(userId, partnerUserId, {
      channelId: dto.channelId,
      senderDeviceId: dto.senderDeviceId,
      protocolVersion: dto.protocolVersion,
      envelopes: dto.envelopes,
    });

    const { envelopes } = await this.prisma.$transaction(async (tx) => {
      const createdEnvelopes = await Promise.all(
        dto.envelopes.map((envelope) =>
          this.envelopeRepo.create(
            {
              session: { connect: { id: envelope.sessionId } },
              type: envelope.type,
              ciphertext: envelope.ciphertext,
              protocolVersion: envelope.protocolVersion ?? dto.protocolVersion,
              associatedData: envelope.associatedData,
              senderDevice: { connect: { id: dto.senderDeviceId } },
              recipientDevice: {
                connect: { id: envelope.recipientDeviceId },
              },
              channelId: dto.channelId,
              clientMessageId: `${dto.messageId}-reaction-remove-${Date.now()}`,
            },
            tx,
          ),
        ),
      );

      return { envelopes: createdEnvelopes };
    });

    const envelopesPayload = envelopes.map(serializeEnvelope);

    this.gateway.broadcastReactionRemoved(dto.channelId, {
      messageId: dto.messageId,
      envelopes: envelopesPayload,
    });

    return {
      messageId: dto.messageId,
      envelopes: envelopesPayload,
    };
  }

  async markRead(userId: string, dto: DmE2eeReadRequest) {
    const channel = await this.channelRepository.findById(dto.channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    if (channel.mode !== DirectMessageMode.PRIVATE_E2EE) {
      throw new BadRequestException(
        'This channel is not end-to-end encrypted.',
      );
    }

    const message = await this.messageRepository.findById(dto.messageId);

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (!message.isE2ee) {
      throw new BadRequestException(
        'Cannot mark non-E2EE messages as read via this endpoint.',
      );
    }

    const readerDevice = await this.deviceRepo.findById(dto.readerDeviceId);
    if (!readerDevice || readerDevice.userId !== userId) {
      throw new ForbiddenException(
        'Reader device does not belong to the caller',
      );
    }
    if (readerDevice.isRevoked) {
      throw new BadRequestException('Reader device is revoked');
    }

    const partnerUserId =
      channel.userAId === userId ? channel.userBId : channel.userAId;

    const session = await this.sessionRepo.findBySenderAndRecipient(
      dto.readerDeviceId,
      message.senderDeviceId!,
    );

    if (!session || !session.isActive) {
      throw new BadRequestException('No active session for read receipt');
    }

    this.gateway.broadcastMessageRead(dto.channelId, {
      messageId: dto.messageId,
      readerDeviceId: dto.readerDeviceId,
      readAt: new Date().toISOString(),
    });

    return {
      messageId: dto.messageId,
      readerDeviceId: dto.readerDeviceId,
      readAt: new Date(),
    };
  }

  async startTyping(userId: string, dto: DmE2eeTypingStartRequest) {
    const channel = await this.channelRepository.findById(dto.channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    if (channel.mode !== DirectMessageMode.PRIVATE_E2EE) {
      throw new BadRequestException(
        'This channel is not end-to-end encrypted.',
      );
    }

    const senderDevice = await this.deviceRepo.findById(dto.senderDeviceId);
    if (!senderDevice || senderDevice.userId !== userId) {
      throw new ForbiddenException(
        'Sender device does not belong to the caller',
      );
    }
    if (senderDevice.isRevoked) {
      throw new BadRequestException('Sender device is revoked');
    }

    this.gateway.broadcastE2eeTypingStart(dto.channelId, {
      userId,
      senderDeviceId: dto.senderDeviceId,
    });

    return { success: true };
  }

  async stopTyping(userId: string, dto: DmE2eeTypingStopRequest) {
    const channel = await this.channelRepository.findById(dto.channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    if (channel.mode !== DirectMessageMode.PRIVATE_E2EE) {
      throw new BadRequestException(
        'This channel is not end-to-end encrypted.',
      );
    }

    const senderDevice = await this.deviceRepo.findById(dto.senderDeviceId);
    if (!senderDevice || senderDevice.userId !== userId) {
      throw new ForbiddenException(
        'Sender device does not belong to the caller',
      );
    }
    if (senderDevice.isRevoked) {
      throw new BadRequestException('Sender device is revoked');
    }

    this.gateway.broadcastE2eeTypingStop(dto.channelId, {
      userId,
      senderDeviceId: dto.senderDeviceId,
    });

    return { success: true };
  }

  async setDisappearingSettings(
    userId: string,
    dto: DmE2eeDisappearingSettingsRequest,
  ) {
    const channel = await this.channelRepository.findById(dto.channelId);

    if (!channel) {
      throw new NotFoundException('Direct message channel not found.');
    }

    if (channel.userAId !== userId && channel.userBId !== userId) {
      throw new BadRequestException(
        'You do not have access to this direct message channel.',
      );
    }

    if (channel.mode !== DirectMessageMode.PRIVATE_E2EE) {
      throw new BadRequestException(
        'This channel is not end-to-end encrypted.',
      );
    }

    if (dto.ttlSeconds !== undefined && dto.ttlSeconds < 0) {
      throw new BadRequestException('TTL must be non-negative');
    }

    const updatedChannel = await this.channelRepository.update(dto.channelId, {
      disappearingTtlSeconds: dto.ttlSeconds ?? null,
    });

    return {
      channelId: updatedChannel.id,
      disappearingTtlSeconds: updatedChannel.disappearingTtlSeconds,
    };
  }

  /**
   * Enforces per-envelope integrity: recipient device exists and belongs to
   * the channel partner, the session maps exactly (senderDevice → recipientDevice),
   * and no two envelopes target the same recipient.
   */
  private async validateEnvelopes(
    userId: string,
    partnerUserId: string,
    dto: DmE2eeSendRequest,
  ): Promise<void> {
    const seenRecipients = new Set<string>();

    for (const envelope of dto.envelopes) {
      if (seenRecipients.has(envelope.recipientDeviceId)) {
        throw new BadRequestException(
          'Duplicate envelope for the same recipient device',
        );
      }
      seenRecipients.add(envelope.recipientDeviceId);

      const recipientDevice = await this.deviceRepo.findById(
        envelope.recipientDeviceId,
      );
      if (!recipientDevice) {
        throw new NotFoundException('Recipient device not found');
      }
      if (recipientDevice.userId !== partnerUserId) {
        throw new BadRequestException(
          'Envelope recipient is not the channel partner',
        );
      }
      if (recipientDevice.isRevoked) {
        throw new BadRequestException('Recipient device is revoked');
      }

      const session = await this.sessionRepo.findById(envelope.sessionId);
      if (!session || !session.isActive) {
        throw new BadRequestException('Session is not active');
      }
      if (session.senderDeviceId !== dto.senderDeviceId) {
        throw new BadRequestException('Session does not map the sender device');
      }
      if (session.recipientDeviceId !== envelope.recipientDeviceId) {
        throw new BadRequestException(
          'Session does not map the recipient device',
        );
      }
      if (
        session.senderDevice?.userId !== userId ||
        session.recipientDevice?.userId !== partnerUserId
      ) {
        throw new BadRequestException(
          'Session does not belong to the channel participants',
        );
      }
    }
  }
}
