import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { E2eeEnvelopeRepository } from '../repositories/e2ee-envelope.repository';
import { E2eeSessionRepository } from '../../e2ee-sessions/repositories/e2ee-session.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { GetEnvelopesRequestDto } from '../dto/envelope.request';
import { serializeEnvelopeList } from '../serializers/e2ee-envelope.serializer';

@Injectable()
export class E2eeTransportQueryService {
  constructor(
    private readonly envelopeRepo: E2eeEnvelopeRepository,
    private readonly sessionRepo: E2eeSessionRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
  ) {}

  private async assertDeviceOwnedBy(deviceId: string, userId: string) {
    const device = await this.deviceRepo.findById(deviceId);
    if (!device || device.userId !== userId) {
      throw new ForbiddenException('Device does not belong to the caller');
    }
  }

  async getPendingEnvelopes(
    recipientDeviceId: string,
    limit = 50,
    userId: string,
  ) {
    await this.assertDeviceOwnedBy(recipientDeviceId, userId);

    const envelopes = await this.envelopeRepo.findPendingByRecipientDevice(
      recipientDeviceId,
      limit,
    );
    return {
      success: true,
      envelopes: serializeEnvelopeList(envelopes),
    };
  }

  async getEnvelopesBySession(userId: string, dto: GetEnvelopesRequestDto) {
    const session = await this.sessionRepo.findById(dto.sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (
      session.senderDevice.userId !== userId &&
      session.recipientDevice.userId !== userId
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

  async countPending(recipientDeviceId: string, userId: string) {
    await this.assertDeviceOwnedBy(recipientDeviceId, userId);

    const count =
      await this.envelopeRepo.countPendingByRecipientDevice(recipientDeviceId);
    return { success: true, count };
  }
}
