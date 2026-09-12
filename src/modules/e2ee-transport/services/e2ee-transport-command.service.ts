import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeEnvelopeRepository } from '../repositories/e2ee-envelope.repository';
import { E2eeSessionRepository } from '../../e2ee-sessions/repositories/e2ee-session.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { SendEnvelopeRequestDto } from '../dto/envelope.request';
import { serializeEnvelope } from '../serializers/e2ee-envelope.serializer';
import { Prisma } from '@prisma/client';

@Injectable()
export class E2eeTransportCommandService {
  constructor(
    private readonly envelopeRepo: E2eeEnvelopeRepository,
    private readonly sessionRepo: E2eeSessionRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async sendEnvelope(userId: string, dto: SendEnvelopeRequestDto) {
    const session = await this.assertEnvelopeAllowed(userId, dto);

    const envelope = await this.envelopeRepo.create({
      session: { connect: { id: session.id } },
      type: dto.type,
      ciphertext: dto.ciphertext,
      protocolVersion: dto.protocolVersion ?? 1,
      associatedData: dto.associatedData,
      senderDevice: { connect: { id: dto.senderDeviceId } },
      recipientDevice: { connect: { id: dto.recipientDeviceId } },
      ...(dto.channelId ? { channelId: dto.channelId } : {}),
      ...(dto.clientMessageId ? { clientMessageId: dto.clientMessageId } : {}),
    });

    return { success: true, envelope: serializeEnvelope(envelope) };
  }

  async sendEnvelopesForSession(
    userId: string,
    sessionId: string,
    envelopes: SendEnvelopeRequestDto[],
  ) {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (!session.isActive) {
      throw new BadRequestException('Session is not active');
    }
    if (
      session.senderDevice.userId !== userId &&
      session.recipientDevice.userId !== userId
    ) {
      throw new BadRequestException('Session does not belong to user');
    }

    for (const dto of envelopes) {
      await this.assertEnvelopeAllowed(userId, dto, session);
    }

    const results = await this.prisma.$transaction(
      envelopes.map((dto) =>
        this.prisma.e2eeEnvelope.create({
          data: {
            session: { connect: { id: dto.sessionId } },
            type: dto.type,
            ciphertext: dto.ciphertext,
            protocolVersion: dto.protocolVersion ?? 1,
            associatedData: dto.associatedData,
            senderDevice: { connect: { id: dto.senderDeviceId } },
            recipientDevice: { connect: { id: dto.recipientDeviceId } },
            ...(dto.channelId ? { channelId: dto.channelId } : {}),
            ...(dto.clientMessageId
              ? { clientMessageId: dto.clientMessageId }
              : {}),
          },
        }),
      ),
    );

    return {
      success: true,
      envelopes: results.map(serializeEnvelope),
    };
  }

  /**
   * Validates that (1) the sender device belongs to the caller, (2) the
   * session involves both the sender and recipient devices, and (3) neither
   * device is revoked.
   */
  private async assertEnvelopeAllowed(
    userId: string,
    dto: SendEnvelopeRequestDto,
    session?: Prisma.E2eeSessionGetPayload<{
      include: { senderDevice: true; recipientDevice: true };
    }>,
  ) {
    const resolved =
      session ?? (await this.sessionRepo.findById(dto.sessionId));
    if (!resolved) {
      throw new NotFoundException('Session not found');
    }

    const senderDevice = await this.deviceRepo.findById(dto.senderDeviceId);
    if (!senderDevice) {
      throw new NotFoundException('Sender device not found');
    }
    if (senderDevice.userId !== userId) {
      throw new BadRequestException('Sender device does not belong to user');
    }
    if (senderDevice.isRevoked) {
      throw new BadRequestException('Sender device is revoked');
    }

    const recipientDevice = await this.deviceRepo.findById(
      dto.recipientDeviceId,
    );
    if (!recipientDevice) {
      throw new NotFoundException('Recipient device not found');
    }
    if (recipientDevice.isRevoked) {
      throw new BadRequestException('Recipient device is revoked');
    }

    if (!resolved.isActive) {
      throw new BadRequestException('Session is not active');
    }
    if (
      resolved.senderDeviceId !== dto.senderDeviceId &&
      resolved.recipientDeviceId !== dto.senderDeviceId
    ) {
      throw new BadRequestException('Session does not involve sender device');
    }
    if (
      resolved.senderDeviceId !== dto.recipientDeviceId &&
      resolved.recipientDeviceId !== dto.recipientDeviceId
    ) {
      throw new BadRequestException(
        'Session does not involve recipient device',
      );
    }

    return resolved;
  }

  async markDelivered(envelopeId: string, userId: string) {
    const envelope = await this.envelopeRepo.findById(envelopeId);
    if (!envelope) {
      throw new NotFoundException('Envelope not found');
    }
    const recipientDevice = await this.deviceRepo.findById(
      envelope.recipientDeviceId,
    );
    if (
      !recipientDevice ||
      recipientDevice.userId !== userId ||
      recipientDevice.isRevoked
    ) {
      throw new BadRequestException('Envelope is not addressed to the caller');
    }
    const updated = await this.envelopeRepo.markDelivered(envelopeId);
    return { success: true, envelope: serializeEnvelope(updated) };
  }

  async markFailed(envelopeId: string, error: string, userId: string) {
    const envelope = await this.envelopeRepo.findById(envelopeId);
    if (!envelope) {
      throw new NotFoundException('Envelope not found');
    }
    const recipientDevice = await this.deviceRepo.findById(
      envelope.recipientDeviceId,
    );
    if (
      !recipientDevice ||
      recipientDevice.userId !== userId ||
      recipientDevice.isRevoked
    ) {
      throw new BadRequestException('Envelope is not addressed to the caller');
    }
    const updated = await this.envelopeRepo.markFailed(envelopeId, error);
    return { success: true, envelope: serializeEnvelope(updated) };
  }
}
