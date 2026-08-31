import { Injectable, NotFoundException } from '@nestjs/common';
import { E2eeSessionRepository } from '../repositories/e2ee-session.repository';
import { serializeSession } from '../serializers/e2ee-session.serializer';

@Injectable()
export class E2eeSessionQueryService {
  constructor(private readonly sessionRepo: E2eeSessionRepository) {}

  async getSessionById(sessionId: string) {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return serializeSession({
      id: session.id,
      sessionState: session.sessionState,
      associatedDataHash: session.associatedDataHash,
      senderEphemeralPublic: '',
    });
  }

  async listSessionsForDevice(deviceId: string) {
    const [asSender, asRecipient] = await Promise.all([
      this.sessionRepo.findBySenderDeviceId(deviceId),
      this.sessionRepo.findByRecipientDeviceId(deviceId),
    ]);
    return [...asSender, ...asRecipient].map((s) =>
      serializeSession({
        id: s.id,
        sessionState: s.sessionState,
        associatedDataHash: s.associatedDataHash,
        senderEphemeralPublic: '',
      }),
    );
  }
}
