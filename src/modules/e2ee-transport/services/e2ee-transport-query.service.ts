import { Injectable, NotFoundException } from '@nestjs/common';
import { E2eeEnvelopeRepository } from '../repositories/e2ee-envelope.repository';
import { E2eeSessionRepository } from '../../e2ee-sessions/repositories/e2ee-session.repository';
import { GetEnvelopesRequestDto } from '../dto/envelope.request';
import { serializeEnvelope, serializeEnvelopeList } from '../serializers/e2ee-envelope.serializer';

@Injectable()
export class E2eeTransportQueryService {
  constructor(
    private readonly envelopeRepo: E2eeEnvelopeRepository,
    private readonly sessionRepo: E2eeSessionRepository,
  ) {}

  async getPendingEnvelopes(
    recipientDeviceId: string,
    limit = 50,
  ) {
    const envelopes = await this.envelopeRepo.findPendingByRecipientDevice(
      recipientDeviceId,
      limit,
    );
    return {
      success: true,
      envelopes: serializeEnvelopeList(envelopes),
    };
  }

  async getEnvelopesBySession(
    userId: string,
    dto: GetEnvelopesRequestDto,
  ) {
    const session = await this.sessionRepo.findById(dto.sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (
      session.senderDeviceId !== userId &&
      session.recipientDeviceId !== userId
    ) {
      throw new NotFoundException('Session not found');
    }

    const envelopes = await this.envelopeRepo.findBySession(dto.sessionId, {
      limit: 50,
      cursor: dto.cursor,
    });

    return {
      success: true,
      envelopes: serializeEnvelopeList(envelopes),
    };
  }

  async countPending(recipientDeviceId: string) {
    const count = await this.envelopeRepo.countPendingByRecipientDevice(
      recipientDeviceId,
    );
    return { success: true, count };
  }
}