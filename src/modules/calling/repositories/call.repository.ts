import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { Call, CallParticipant, Prisma, CallStatus, CallParticipantState } from '@prisma/client';
import {
  LIVE_CALL_STATUSES,
  LIVE_PARTICIPANT_STATES,
  TERMINAL_CALL_STATUSES,
} from '../constants/calling.constants';

@Injectable()
export class CallRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CallCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Call> {
    const client = tx ?? this.prisma;
    return client.call.create({ data });
  }

  async findById(id: string): Promise<Call | null> {
    return this.prisma.call.findUnique({ where: { id } });
  }

  async findByIdWithParticipants(id: string): Promise<(Call & { participants: CallParticipant[] }) | null> {
    return this.prisma.call.findUnique({
      where: { id },
      include: { participants: true },
    });
  }

  async update(
    id: string,
    data: Partial<Call>,
    tx?: Prisma.TransactionClient,
  ): Promise<Call> {
    const client = tx ?? this.prisma;
    return client.call.update({ where: { id }, data });
  }

  async findActiveByScope(scope: string, scopeRef: string): Promise<Call | null> {
    return this.prisma.call.findFirst({
      where: {
        scope: scope as any,
        scopeRef,
        status: { in: LIVE_CALL_STATUSES as unknown as CallStatus[] },
      },
    });
  }

  async findUserActiveCall(userId: string): Promise<Call | null> {
    const participant = await this.prisma.callParticipant.findFirst({
      where: {
        userId,
        state: { in: LIVE_PARTICIPANT_STATES as unknown as CallParticipantState[] },
        call: { status: { in: LIVE_CALL_STATUSES as unknown as CallStatus[] } },
      },
      include: { call: true },
    });
    return participant?.call ?? null;
  }

  async findStaleRingingCalls(before: Date): Promise<Call[]> {
    return this.prisma.call.findMany({
      where: {
        status: 'RINGING',
        updatedAt: { lt: before },
      },
    });
  }

  /** Terminal calls the user created or participated in, most recent first. */
  async findUserCallHistory(
    userId: string,
    opts: { skip: number; take: number },
  ): Promise<(Call & { participants: CallParticipant[] })[]> {
    return this.prisma.call.findMany({
      where: {
        status: { in: TERMINAL_CALL_STATUSES as unknown as CallStatus[] },
        OR: [
          { creatorUserId: userId },
          { participants: { some: { userId } } },
        ],
      },
      include: { participants: true },
      orderBy: { updatedAt: 'desc' },
      skip: opts.skip,
      take: opts.take,
    });
  }
}

@Injectable()
export class CallParticipantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CallParticipantCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CallParticipant> {
    const client = tx ?? this.prisma;
    return client.callParticipant.create({ data });
  }

  async findByCallId(callId: string): Promise<CallParticipant[]> {
    return this.prisma.callParticipant.findMany({
      where: { callId },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async findByCallAndUser(callId: string, userId: string, deviceId?: string): Promise<CallParticipant | null> {
    return this.prisma.callParticipant.findFirst({
      where: {
        callId,
        userId,
        ...(deviceId ? { deviceId } : {}),
      },
    });
  }

  async update(
    id: string,
    data: Partial<CallParticipant>,
    tx?: Prisma.TransactionClient,
  ): Promise<CallParticipant> {
    const client = tx ?? this.prisma;
    return client.callParticipant.update({ where: { id }, data });
  }

  async updateByCallAndUser(
    callId: string,
    userId: string,
    data: Partial<CallParticipant>,
    tx?: Prisma.TransactionClient,
  ): Promise<CallParticipant | null> {
    const participant = await this.findByCallAndUser(callId, userId);
    if (!participant) return null;
    const client = tx ?? this.prisma;
    return client.callParticipant.update({ where: { id: participant.id }, data });
  }

  async countActiveParticipants(callId: string): Promise<number> {
    return this.prisma.callParticipant.count({
      where: {
        callId,
        state: { in: ['JOINED', 'MUTED', 'CAMERA_OFF'] },
      },
    });
  }
}