import { AnonymousChatSessionService } from './anonymous-chat.session.service';
import { AnonymousMapper } from '../mappers/anonymous-chat.mapper';
import {
  AnonymousChatErrorCode,
  AnonymousChatEndReason,
  AnonymousChatRoomStatus,
} from '../types/anonymous-chat.types';

describe('AnonymousChatSessionService', () => {
  let service: AnonymousChatSessionService;
  let prisma: any;
  let redis: any;
  let sessionRepo: any;
  let roomRepo: any;
  let participantRepo: any;

  beforeEach(() => {
    prisma = { $transaction: jest.fn(async (cb: any) => cb('tx')) };
    redis = { get: jest.fn(), del: jest.fn().mockResolvedValue(undefined) };
    sessionRepo = {
      create: jest.fn(async (data: any) => ({ id: data.id, ...data })),
      findById: jest.fn(),
      markCancelled: jest.fn(),
      markExpired: jest.fn(),
    };
    roomRepo = {
      findById: jest.fn(),
      close: jest.fn(),
    };
    participantRepo = {
      findByRoomId: jest.fn().mockResolvedValue([]),
      findActiveRoomByUser: jest.fn(),
    };

    service = new AnonymousChatSessionService(
      prisma,
      redis,
      sessionRepo,
      roomRepo,
      participantRepo,
      new AnonymousMapper(),
    );
  });

  it('creates a WAITING queue session owned by the user', async () => {
    const result = await service.createQueueSession('u1', 'coding', new Date());

    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        topic: 'coding',
        status: 'WAITING',
      }),
    );
    expect(result.sessionId).toEqual(expect.any(String));
  });

  it('throws when cancelling an unknown session', async () => {
    sessionRepo.findById.mockResolvedValue(null);

    await expect(service.closeQueueSession('s1')).rejects.toMatchObject({
      code: AnonymousChatErrorCode.SESSION_NOT_FOUND,
    });
  });

  it('does not cancel a session that is no longer WAITING', async () => {
    sessionRepo.findById.mockResolvedValue({ id: 's1', status: 'MATCHED' });

    await service.closeQueueSession('s1');

    expect(sessionRepo.markCancelled).not.toHaveBeenCalled();
  });

  it('cancels a waiting session', async () => {
    sessionRepo.findById.mockResolvedValue({ id: 's1', status: 'WAITING' });

    await service.closeQueueSession('s1');

    expect(sessionRepo.markCancelled).toHaveBeenCalledWith('s1');
  });

  it('throws when closing an unknown room', async () => {
    roomRepo.findById.mockResolvedValue(null);

    await expect(
      service.closeRoom('r1', AnonymousChatEndReason.NEXT),
    ).rejects.toMatchObject({ code: AnonymousChatErrorCode.SESSION_NOT_FOUND });
  });

  it('rejects closing a room that is already CLOSED', async () => {
    roomRepo.findById.mockResolvedValue({
      id: 'r1',
      status: AnonymousChatRoomStatus.CLOSED,
    });

    await expect(
      service.closeRoom('r1', AnonymousChatEndReason.NEXT),
    ).rejects.toMatchObject({ code: AnonymousChatErrorCode.CHAT_CLOSED });
  });

  it('closes the room, cancels participant sessions and drops the cache', async () => {
    roomRepo.findById.mockResolvedValue({
      id: 'r1',
      status: AnonymousChatRoomStatus.ACTIVE,
    });
    participantRepo.findByRoomId.mockResolvedValue([
      { sessionId: 's1' },
      { sessionId: 's2' },
    ]);

    const result = await service.closeRoom(
      'r1',
      AnonymousChatEndReason.BLOCK,
      'u1',
    );

    expect(roomRepo.close).toHaveBeenCalledWith(
      'r1',
      { endReason: AnonymousChatEndReason.BLOCK, endedByUserId: 'u1' },
      'tx',
    );
    expect(sessionRepo.markCancelled).toHaveBeenCalledTimes(2);
    expect(redis.del).toHaveBeenCalledWith('anonymous:room:r1');
    expect(result.sessionIds).toEqual(['s1', 's2']);
  });

  it('returns null for an invalid room cache payload', async () => {
    redis.get.mockResolvedValue('not-json');

    await expect(service.getRoomCache('r1')).resolves.toBeNull();
  });

  it('parses a cached room', async () => {
    const cache = { id: 'r1', topic: 'general', participants: [] };
    redis.get.mockResolvedValue(JSON.stringify(cache));

    await expect(service.getRoomCache('r1')).resolves.toEqual(cache);
  });

  it('returns null when the user has no active room', async () => {
    participantRepo.findActiveRoomByUser.mockResolvedValue(null);

    await expect(service.resolveActiveRoomByUser('u1')).resolves.toBeNull();
  });
});
