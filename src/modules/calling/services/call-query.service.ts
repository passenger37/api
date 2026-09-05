import { Injectable, NotFoundException } from '@nestjs/common';
import { CallRepository, CallParticipantRepository } from '../repositories/call.repository';
import { CallParticipantWithUser, CallParticipantState } from '../types/calling.types';

@Injectable()
export class CallQueryService {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly participantRepo: CallParticipantRepository,
  ) {}

  async getCall(id: string) {
    const call = await this.callRepo.findByIdWithParticipants(id);
    if (!call) throw new NotFoundException('Call not found');
    return call;
  }

  async getCallParticipants(callId: string): Promise<CallParticipantWithUser[]> {
    const participants = await this.participantRepo.findByCallId(callId);
    // User info would be populated from UsersModule in a real implementation
    return participants.map(p => ({
      id: p.id,
      userId: p.userId,
      deviceId: p.deviceId,
      joinedAt: p.joinedAt,
      leftAt: p.leftAt,
      state: p.state as CallParticipantState,
    }));
  }

  async getUserActiveCall(userId: string) {
    return this.callRepo.findUserActiveCall(userId);
  }

  async getActiveCallByScope(scope: string, scopeRef: string) {
    return this.callRepo.findActiveByScope(scope, scopeRef);
  }
}