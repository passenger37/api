import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CallRepository,
  CallParticipantRepository,
} from '../repositories/call.repository';
import { UserQueryService } from '../../users/services/user-query.service';
import {
  CallParticipantWithUser,
  CallParticipantState,
} from '../types/calling.types';

@Injectable()
export class CallQueryService {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly participantRepo: CallParticipantRepository,
    private readonly userQueryService: UserQueryService,
  ) {}

  async getCall(id: string) {
    const call = await this.callRepo.findByIdWithParticipants(id);
    if (!call) throw new NotFoundException('Call not found');
    return call;
  }

  async getCallParticipants(
    callId: string,
  ): Promise<CallParticipantWithUser[]> {
    const participants = await this.participantRepo.findByCallId(callId);
    const users = await Promise.all(
      participants.map((p) => this.userQueryService.findById(p.userId)),
    );
    const userById = new Map((users ?? []).map((u) => [u?.id, u]));

    return participants.map((p) => {
      const user = p.userId ? userById.get(p.userId) : undefined;
      return {
        id: p.id,
        userId: p.userId,
        deviceId: p.deviceId,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        state: p.state as CallParticipantState,
        user: user
          ? {
              id: user.id,
              username: user.username,
              avatarUrl: user.avatarUrl,
            }
          : undefined,
      };
    });
  }

  async getUserActiveCall(userId: string) {
    return this.callRepo.findUserActiveCall(userId);
  }

  async getActiveCallByScope(scope: string, scopeRef: string) {
    return this.callRepo.findActiveByScope(scope, scopeRef);
  }
}
