import { Injectable, NotFoundException } from '@nestjs/common';
import { E2eeRatchetStateRepository } from '../repositories/e2ee-ratchet-state.repository';

@Injectable()
export class E2eeRatchetQueryService {
  constructor(
    private readonly ratchetStateRepo: E2eeRatchetStateRepository,
  ) {}

  async getStateForSession(sessionId: string) {
    const state = await this.ratchetStateRepo.findBySessionId(sessionId);
    if (!state) {
      throw new NotFoundException('Ratchet state not found');
    }
    const skippedMap = JSON.parse(state.skippedMessageKeys || '{}') as Record<
      string,
      string
    >;
    return {
      sessionId: state.sessionId,
      sendingMessageNumber: state.sendingMessageNumber,
      receivingMessageNumber: state.receivingMessageNumber,
      previousReceivingChainLength: state.previousReceivingChainLength,
      skippedKeyCount: Object.keys(skippedMap).length,
      hasLocalDhKey: !!state.nextDhPublicKey,
      hasRemoteDhKey: !!state.remoteDhPublicKey,
    };
  }
}
