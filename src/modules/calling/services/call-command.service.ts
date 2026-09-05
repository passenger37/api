import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CallRepository, CallParticipantRepository } from '../repositories/call.repository';
import { CallQueryService } from './call-query.service';
import { CallType, CallScope, CallStatus, CallParticipantState } from '../types/calling.types';

@Injectable()
export class CallCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly callRepo: CallRepository,
    private readonly participantRepo: CallParticipantRepository,
    private readonly queryService: CallQueryService,
  ) {}

  async createCall(userId: string, input: {
    type: CallType;
    scope: CallScope;
    scopeRef: string;
    deviceId?: string;
  }) {
    // Check if user already has an active call
    const existingCall = await this.queryService.getUserActiveCall(userId);
    if (existingCall) {
      throw new BadRequestException('User already has an active call');
    }

    // Check if there's already an active call in this scope
    const scopeCall = await this.queryService.getActiveCallByScope(input.scope, input.scopeRef);
    if (scopeCall && scopeCall.creatorUserId !== userId) {
      throw new BadRequestException('An active call already exists in this scope');
    }

    return this.prisma.$transaction(async (tx) => {
      const call = await this.callRepo.create({
        type: input.type,
        scope: input.scope,
        scopeRef: input.scopeRef,
        creatorUserId: userId,
        status: CallStatus.RINGING,
      }, tx);

      await this.participantRepo.create({
        call: { connect: { id: call.id } },
        userId,
        deviceId: input.deviceId,
        state: CallParticipantState.JOINED,
      }, tx);

      return { call, status: CallStatus.RINGING };
    });
  }

  async joinCall(userId: string, callId: string, deviceId?: string) {
    const call = await this.callRepo.findById(callId);
    if (!call) throw new NotFoundException('Call not found');
    if (call.status !== CallStatus.RINGING && call.status !== CallStatus.ACTIVE) {
      throw new BadRequestException('Call is not accepting participants');
    }

    const existing = await this.participantRepo.findByCallAndUser(callId, userId);
    if (existing) {
      if (existing.state === CallParticipantState.LEFT) {
        return this.participantRepo.updateByCallAndUser(callId, userId, {
          state: CallParticipantState.JOINED,
          leftAt: null,
          deviceId: deviceId ?? existing.deviceId,
        }, this.prisma);
      }
      return existing;
    }

    const participant = await this.participantRepo.create({
      call: { connect: { id: callId } },
      userId,
      deviceId,
      state: CallParticipantState.JOINED,
    });

    // If call was RINGING and now has participants, mark as ACTIVE
    if (call.status === CallStatus.RINGING) {
      await this.callRepo.update(callId, { status: CallStatus.ACTIVE, startedAt: new Date() });
    }

    return participant;
  }

  async leaveCall(userId: string, callId: string) {
    const participant = await this.participantRepo.findByCallAndUser(callId, userId);
    if (!participant) throw new NotFoundException('Not a participant in this call');

    const updated = await this.participantRepo.updateByCallAndUser(callId, userId, {
      state: CallParticipantState.LEFT,
      leftAt: new Date(),
    });

    // Check if call should end
    const activeCount = await this.participantRepo.countActiveParticipants(callId);
    if (activeCount === 0) {
      await this.callRepo.update(callId, {
        status: CallStatus.ENDED,
        endedAt: new Date(),
      });
    }

    return updated;
  }

  async acceptCall(userId: string, callId: string) {
    const call = await this.callRepo.findById(callId);
    if (!call) throw new NotFoundException('Call not found');
    if (call.creatorUserId !== userId) {
      throw new ForbiddenException('Only call creator can accept');
    }
    if (call.status !== CallStatus.RINGING) {
      throw new BadRequestException('Call is not in ringing state');
    }

    return this.callRepo.update(callId, { status: CallStatus.ACTIVE, startedAt: new Date() });
  }

  async rejectCall(userId: string, callId: string) {
    const call = await this.callRepo.findById(callId);
    if (!call) throw new NotFoundException('Call not found');
    if (call.creatorUserId !== userId) {
      throw new ForbiddenException('Only call creator can reject');
    }
    if (call.status !== CallStatus.RINGING) {
      throw new BadRequestException('Call is not in ringing state');
    }

    return this.callRepo.update(callId, { status: CallStatus.REJECTED, endedAt: new Date() });
  }

  async cancelCall(userId: string, callId: string) {
    const call = await this.callRepo.findById(callId);
    if (!call) throw new NotFoundException('Call not found');
    if (call.creatorUserId !== userId) {
      throw new ForbiddenException('Only call creator can cancel');
    }
    if (call.status !== CallStatus.RINGING) {
      throw new BadRequestException('Call is not in ringing state');
    }

    return this.callRepo.update(callId, { status: CallStatus.CANCELLED, endedAt: new Date() });
  }

  async endCall(userId: string, callId: string) {
    const call = await this.callRepo.findById(callId);
    if (!call) throw new NotFoundException('Call not found');
    if (call.creatorUserId !== userId) {
      throw new ForbiddenException('Only call creator can end the call');
    }
    if (call.status === CallStatus.ENDED) {
      throw new BadRequestException('Call already ended');
    }

    return this.callRepo.update(callId, { status: CallStatus.ENDED, endedAt: new Date() });
  }

  async muteParticipant(userId: string, callId: string, targetUserId: string) {
    const call = await this.callRepo.findById(callId);
    if (!call) throw new NotFoundException('Call not found');

    const participant = await this.participantRepo.findByCallAndUser(callId, targetUserId);
    if (!participant) throw new NotFoundException('Participant not found');

    return this.participantRepo.updateByCallAndUser(callId, targetUserId, {
      state: CallParticipantState.MUTED,
    });
  }

  async unmuteParticipant(userId: string, callId: string, targetUserId: string) {
    const call = await this.callRepo.findById(callId);
    if (!call) throw new NotFoundException('Call not found');

    const participant = await this.participantRepo.findByCallAndUser(callId, targetUserId);
    if (!participant) throw new NotFoundException('Participant not found');

    return this.participantRepo.updateByCallAndUser(callId, targetUserId, {
      state: CallParticipantState.JOINED,
    });
  }

  async setCamera(userId: string, callId: string, targetUserId: string, on: boolean) {
    const call = await this.callRepo.findById(callId);
    if (!call) throw new NotFoundException('Call not found');

    const participant = await this.participantRepo.findByCallAndUser(callId, targetUserId);
    if (!participant) throw new NotFoundException('Participant not found');

    return this.participantRepo.updateByCallAndUser(callId, targetUserId, {
      state: on ? CallParticipantState.JOINED : CallParticipantState.CAMERA_OFF,
    });
  }
}