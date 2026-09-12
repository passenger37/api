import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { E2eeSessionRepository } from '../repositories/e2ee-session.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { serializeSession } from '../serializers/e2ee-session.serializer';

@Injectable()
export class E2eeSessionQueryService {
  constructor(
    private readonly sessionRepo: E2eeSessionRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
  ) {}

  private async assertDeviceOwnedBy(deviceId: string, userId: string) {
    const device = await this.deviceRepo.findById(deviceId);
    if (!device || device.userId !== userId) {
      throw new ForbiddenException('Device does not belong to the caller');
    }
  }

  async getSessionById(sessionId: string, userId: string) {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (
      session.senderDevice.userId !== userId &&
      session.recipientDevice.userId !== userId
    ) {
      throw new NotFoundException('Session not found');
    }
    return serializeSession(session);
  }

  async listSessionsForDevice(deviceId: string, userId: string) {
    await this.assertDeviceOwnedBy(deviceId, userId);

    const [asSender, asRecipient] = await Promise.all([
      this.sessionRepo.findBySenderDeviceId(deviceId),
      this.sessionRepo.findByRecipientDeviceId(deviceId),
    ]);
    const merged = [...asSender, ...asRecipient].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return merged.map(serializeSession);
  }
}
