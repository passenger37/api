import { AnonymousChatCleanupService } from './anonymous-chat.cleanup.service';
import { AnonymousChatEndReason } from '../types/anonymous-chat.types';

describe('AnonymousChatCleanupService', () => {
  let service: AnonymousChatCleanupService;
  let redis: any;
  let client: any;
  let sessionRepo: any;
  let roomRepo: any;
  let sessionService: any;
  let matchmaking: any;

  beforeEach(() => {
    client = {
      lRem: jest.fn().mockResolvedValue(1),
      sMembers: jest.fn().mockResolvedValue([]),
    };
    redis = { getClient: jest.fn(() => client) };
    sessionRepo = {
      expireStale: jest.fn().mockResolvedValue([]),
      markExpired: jest.fn().mockResolvedValue(undefined),
    };
    roomRepo = {
      findActiveRoomsWithStaleDisconnects: jest.fn().mockResolvedValue([]),
    };
    sessionService = { closeRoom: jest.fn().mockResolvedValue(undefined) };
    matchmaking = { attemptMatch: jest.fn().mockResolvedValue(null) };

    service = new AnonymousChatCleanupService(
      redis,
      sessionRepo,
      roomRepo,
      sessionService,
      matchmaking,
    );
  });

  it('does nothing when there is no stale work', async () => {
    const result = await service.sweep();

    expect(result).toEqual({ expiredSessions: [], closedRooms: [] });
    expect(sessionService.closeRoom).not.toHaveBeenCalled();
  });

  it('expires stale queue sessions and removes them from the queue', async () => {
    sessionRepo.expireStale.mockResolvedValue([
      { id: 's1', userId: 'u1', topic: 'general' },
    ]);

    const result = await service.sweep();

    expect(sessionRepo.markExpired).toHaveBeenCalledWith('s1');
    expect(client.lRem).toHaveBeenCalledWith(
      'anonymous:queue:general',
      1,
      's1',
    );
    expect(result.expiredSessions).toEqual([
      { sessionId: 's1', userId: 'u1', topic: 'general' },
    ]);
  });

  it('closes rooms whose disconnect grace lapsed', async () => {
    roomRepo.findActiveRoomsWithStaleDisconnects.mockResolvedValue([
      {
        id: 'r1',
        AnonymousChatParticipant: [{ userId: 'u1' }, { userId: 'u2' }],
      },
    ]);

    const result = await service.sweep();

    expect(sessionService.closeRoom).toHaveBeenCalledWith(
      'r1',
      AnonymousChatEndReason.DISCONNECT,
    );
    expect(result.closedRooms).toEqual([
      {
        roomId: 'r1',
        participantUserIds: ['u1', 'u2'],
        reason: AnonymousChatEndReason.DISCONNECT,
      },
    ]);
  });

  it('retries matchmaking for every queued topic', async () => {
    client.sMembers.mockResolvedValue(['general', 'coding']);

    await service.sweep();

    expect(matchmaking.attemptMatch).toHaveBeenCalledWith('general');
    expect(matchmaking.attemptMatch).toHaveBeenCalledWith('coding');
  });
});
