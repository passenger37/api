import { CallCommandService } from './call-command.service';
import { CallQueryService } from './call-query.service';
import { CallRepository, CallParticipantRepository } from '../repositories/call.repository';
import { CallType, CallScope, CallStatus, CallParticipantState } from '../types/calling.types';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('CallCommandService', () => {
  let service: CallCommandService;
  let queryService: CallQueryService;
  let callRepo: any;
  let participantRepo: any;
  let prisma: any;

  beforeEach(() => {
    const store = new Map();
    let callIdCounter = 1;
    let participantIdCounter = 1;

    callRepo = {
      findById: jest.fn(async (id: string) => store.get(`call:${id}`) ?? null),
      findByIdWithParticipants: jest.fn(async (id: string) => store.get(`call:${id}`) ?? null),
      findActiveByScope: jest.fn(async (scope: string, scopeRef: string) => {
        for (const [, v] of store) {
          if (v.scope === scope && v.scopeRef === scopeRef && ['RINGING', 'ACTIVE'].includes(v.status)) {
            return v;
          }
        }
        return null;
      }),
      findUserActiveCall: jest.fn(async (userId: string) => {
        for (const [, v] of store) {
          if (v.creatorUserId === userId && ['RINGING', 'ACTIVE'].includes(v.status)) return v;
          if (v.participants?.some((p: any) => p.userId === userId && ['JOINED', 'MUTED', 'CAMERA_OFF'].includes(p.state))) return v;
        }
        return null;
      }),
      create: jest.fn(async (data: any, tx?: any) => {
        const id = `call-${callIdCounter++}`;
        const call = { id, ...data, status: data.status ?? 'RINGING', participants: [], createdAt: new Date(), updatedAt: new Date() };
        store.set(`call:${id}`, call);
        return call;
      }),
      update: jest.fn(async (id: string, data: any) => {
        const call = store.get(`call:${id}`);
        if (!call) throw new NotFoundException('Call not found');
        Object.assign(call, data, { updatedAt: new Date() });
        return call;
      }),
      findBySenderAndRecipient: jest.fn().mockResolvedValue(null),
    };

    participantRepo = {
      findByCallId: jest.fn(async (callId: string) => {
        const call = store.get(`call:${callId}`);
        return call?.participants ?? [];
      }),
      findByCallAndUser: jest.fn(async (callId: string, userId: string, deviceId?: string) => {
        const call = store.get(`call:${callId}`);
        if (!call) return null;
        return call.participants.find((p: any) => p.userId === userId && (!deviceId || p.deviceId === deviceId)) ?? null;
      }),
      create: jest.fn(async (data: any, tx?: any) => {
        const call = store.get(`call:${data.call.connect.id}`);
        if (!call) throw new NotFoundException('Call not found');
        const id = `participant-${participantIdCounter++}`;
        const participant = { id, ...data, joinedAt: new Date(), leftAt: null, state: data.state ?? 'JOINED' };
        if (!call.participants) call.participants = [];
        call.participants.push(participant);
        return participant;
      }),
      update: jest.fn(async (id: string, data: any) => {
        for (const [, call] of store) {
          const p = call.participants?.find((p: any) => p.id === id);
          if (p) { Object.assign(p, data, { updatedAt: new Date() }); return p; }
        }
        throw new NotFoundException('Participant not found');
      }),
      updateByCallAndUser: jest.fn(async (callId: string, userId: string, data: any, tx?: any) => {
        const call = store.get(`call:${callId}`);
        if (!call) return null;
        const p = call.participants?.find((p: any) => p.userId === userId);
        if (!p) return null;
        Object.assign(p, data, { updatedAt: new Date() });
        return p;
      }),
      countActiveParticipants: jest.fn(async (callId: string) => {
        const call = store.get(`call:${callId}`);
        return call.participants?.filter((p: any) => ['JOINED', 'MUTED', 'CAMERA_OFF'].includes(p.state)).length ?? 0;
      }),
    };

    prisma = {
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };

    queryService = new CallQueryService(callRepo, participantRepo);
    service = new CallCommandService(prisma, callRepo, participantRepo, queryService);
  });

  it('creates a call and adds creator as participant', async () => {
    const result = await service.createCall('u1', {
      type: 'VOICE',
      scope: 'DM',
      scopeRef: 'dm1',
    });

    expect(result.call).toBeDefined();
    expect(result.call.creatorUserId).toBe('u1');
    expect(result.call.type).toBe('VOICE');
    expect(result.call.scope).toBe('DM');
    expect(result.call.scopeRef).toBe('dm1');
    expect(result.call.status).toBe('RINGING');
    expect(result.status).toBe('RINGING');
  });

  it('throws when user already has an active call', async () => {
    await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });

    await expect(
      service.createCall('u1', { type: 'VIDEO', scope: 'DM', scopeRef: 'dm2' })
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when active call exists in same scope by different user', async () => {
    await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });

    await expect(
      service.createCall('u2', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' })
    ).rejects.toThrow(BadRequestException);
  });

  it('allows creator to accept the call', async () => {
    const { call } = await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });

    const result = await service.acceptCall('u1', call.id);

    expect(result.status).toBe('ACTIVE');
    expect(result.startedAt).toBeDefined();
  });

  it('rejects non-creator accepting call', async () => {
    const { call } = await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });

    await expect(service.acceptCall('u2', call.id)).rejects.toThrow(ForbiddenException);
  });

  it('allows creator to reject the call', async () => {
    const { call } = await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });

    const result = await service.rejectCall('u1', call.id);

    expect(result.status).toBe('REJECTED');
    expect(result.endedAt).toBeDefined();
  });

  it('allows creator to cancel the call', async () => {
    const { call } = await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });

    const result = await service.cancelCall('u1', call.id);

    expect(result.status).toBe('CANCELLED');
    expect(result.endedAt).toBeDefined();
  });

  it('allows creator to end the call', async () => {
    const { call } = await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });
    await service.acceptCall('u1', call.id);

    const result = await service.endCall('u1', call.id);

    expect(result.status).toBe('ENDED');
    expect(result.endedAt).toBeDefined();
  });

  it('rejects non-creator ending call', async () => {
    const { call } = await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });
    await service.acceptCall('u1', call.id);

    await expect(service.endCall('u2', call.id)).rejects.toThrow(ForbiddenException);
  });

  it('joins a call and marks active', async () => {
    const { call } = await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });

    const participant = await service.joinCall('u2', call.id);

    expect(participant.userId).toBe('u2');
    expect(participant.state).toBe('JOINED');
  });

  it('leaves a call and ends it when last participant leaves', async () => {
    const { call: createdCall } = await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });
    await service.acceptCall('u1', createdCall.id);
    await service.joinCall('u2', createdCall.id);

    await service.leaveCall('u2', createdCall.id);
    await service.leaveCall('u1', createdCall.id);

    const call = await service.queryService.getCall(createdCall.id);
    expect(call.status).toBe('ENDED');
  });

  it('mutes a participant', async () => {
    const { call } = await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });
    await service.acceptCall('u1', call.id);
    await service.joinCall('u2', call.id);

    await service.muteParticipant('u1', call.id, 'u2');

    const participant = await service.queryService.getCallParticipants(call.id);
    const p = participant.find(p => p.userId === 'u2');
    expect(p.state).toBe('MUTED');
  });

  it('unmutes a participant', async () => {
    const { call } = await service.createCall('u1', { type: 'VOICE', scope: 'DM', scopeRef: 'dm1' });
    await service.acceptCall('u1', call.id);
    await service.joinCall('u2', call.id);
    await service.muteParticipant('u1', call.id, 'u2');

    await service.unmuteParticipant('u1', call.id, 'u2');

    const participant = await service.queryService.getCallParticipants(call.id);
    const p = participant.find(p => p.userId === 'u2');
    expect(p.state).toBe('JOINED');
  });

  it('turns camera on/off', async () => {
    const { call } = await service.createCall('u1', { type: 'VIDEO', scope: 'DM', scopeRef: 'dm1' });
    await service.acceptCall('u1', call.id);
    await service.joinCall('u2', call.id);

    await service.setCamera('u1', call.id, 'u2', false);
    let p = (await service.queryService.getCallParticipants(call.id)).find(p => p.userId === 'u2');
    expect(p.state).toBe('CAMERA_OFF');

    await service.setCamera('u1', call.id, 'u2', true);
    p = (await service.queryService.getCallParticipants(call.id)).find(p => p.userId === 'u2');
    expect(p.state).toBe('JOINED');
  });
});