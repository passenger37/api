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
import { serializeDirectMessage } from '../serializers/dm.serializer';
import { serializeEnvelope } from '../../e2ee-transport/serializers/e2ee-envelope.serializer';
import { DmGateway } from '../gateways/dm.gateway';
import { DmCommandService } from './dm-command.service';
import { DmE2eeSendRequest } from '../dto/request/dm-e2ee-send.request';

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
