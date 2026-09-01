import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    const recipientDevice = await this.deviceRepo.findById(dto.recipientDeviceId);
    if (!recipientDevice) {
      throw new NotFoundException('Recipient device not found');
    }
    if (recipientDevice.isRevoked) {
      throw new BadRequestException('Recipient device is revoked');
    }

    const session = await this.sessionRepo.findById(dto.sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (!session.isActive) {
      throw new BadRequestException('Session is not active');
    }
    if (
      session.senderDeviceId !== dto.senderDeviceId &&
      session.recipientDeviceId !== dto.senderDeviceId
    ) {
      throw new BadRequestException('Session does not involve sender device');
    }
    if (
      session.senderDeviceId !== dto.recipientDeviceId &&
      session.recipientDeviceId !== dto.recipientDeviceId
    ) {
      throw new BadRequestException('Session does not involve recipient device');
    }

    const envelope = await this.envelopeRepo.create({
      session: { connect: { id: dto.sessionId } },
      type: dto.type,
      ciphertext: dto.ciphertext,
      associatedData: dto.associatedData,
      senderDevice: { connect: { id: dto.senderDeviceId } },
      recipientDevice: { connect: { id: dto.recipientDeviceId } },
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
      session.senderDeviceId !== userId &&
      session.recipientDeviceId !== userId
    ) {
      throw new BadRequestException('Session does not belong to user');
    }

    const results = await this.prisma.$transaction(
      envelopes.map((dto) =>
        this.prisma.e2eeEnvelope.create({
          data: {
            session: { connect: { id: dto.sessionId } },
            type: dto.type,
            ciphertext: dto.ciphertext,
            associatedData: dto.associatedData,
            senderDevice: { connect: { id: dto.senderDeviceId } },
            recipientDevice: { connect: { id: dto.recipientDeviceId } },
          },
        }),
      ),
    );

    return {
      success: true,
      envelopes: results.map(serializeEnvelope),
    };
  }

  async markDelivered(envelopeId: string) {
    const envelope = await this.envelopeRepo.findById(envelopeId);
    if (!envelope) {
      throw new NotFoundException('Envelope not found');
    }
    const updated = await this.envelopeRepo.markDelivered(envelopeId);
    return { success: true, envelope: serializeEnvelope(updated) };
  }

  async markFailed(envelopeId: string, error: string) {
    const envelope = await this.envelopeRepo.findById(envelopeId);
    if (!envelope) {
      throw new NotFoundException('Envelope not found');
    }
    const updated = await this.envelopeRepo.markFailed(envelopeId, error);
    return { success: true, envelope: serializeEnvelope(updated) };
  }
}