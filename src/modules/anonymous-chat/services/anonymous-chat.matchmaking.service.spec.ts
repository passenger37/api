import { AnonymousChatMatchmakingService } from './anonymous-chat.matchmaking.service';
import { AnonymousMapper } from '../mappers/anonymous-chat.mapper';
import {
  ANONYMOUS_AVATAR_EMOJIS,
  ANONYMOUS_COLOR_PALETTE,
} from '../constants/anonymous-chat.constants';

describe('AnonymousChatMatchmakingService', () => {
  let service: AnonymousChatMatchmakingService;
  let prisma: any;
  let redis: any;
  let client: any;
  let lock: any;
  let sessionRepo: any;
  let roomRepo: any;
  let participantRepo: any;
  let banRepo: any;
  let userSocialRepo: any;

  const future = new Date(Date.now() + 60_000);

  beforeEach(() => {
    client = {
      lPush: jest.fn().mockResolvedValue(1),
      lRem: jest.fn().mockResolvedValue(1),
      sAdd: jest.fn().mockResolvedValue(1),
      sRem: jest.fn().mockResolvedValue(1),
      rPop: jest.fn(),
      rPush: jest.fn().mockResolvedValue(1),
      lLen: jest.fn().mockResolvedValue(0),
      exists: jest.fn().mockResolvedValue(0),
    };

    prisma = { $transaction: jest.fn(async (cb: any) => cb('tx')) };
    redis = {
      getClient: jest.fn(() => client),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    lock = {
      runExclusive: jest.fn(async (_name: string, _ttl: number, job: any) => ({
        executed: true,
        result: await job(),
      })),
    };
    sessionRepo = {
      findById: jest.fn(),
      markMatched: jest.fn().mockResolvedValue(undefined),
      markExpired: jest.fn().mockResolvedValue(undefined),
    };
    roomRepo = {
      create: jest.fn(async (data: any) => ({ ...data })),
    };
    participantRepo = {
      create: jest.fn(async (data: any) => ({
        createdAt: new Date(),
        ...data,
      })),
    };
    banRepo = { existsActive: jest.fn().mockResolvedValue(false) };
    userSocialRepo = { existsBlock: jest.fn().mockResolvedValue(false) };

    service = new AnonymousChatMatchmakingService(
      prisma,
      redis,
      lock,
      sessionRepo,
      roomRepo,
      participantRepo,
      banRepo,
      userSocialRepo,
      new AnonymousMapper(),
    );
  });

  it('generates a deterministic-shape anonymous identity', () => {
    const identity = service.generateIdentity();

    expect(identity.anonId).toHaveLength(36);
    expect(identity.displayId).toHaveLength(4);
    expect(ANONYMOUS_COLOR_PALETTE).toContain(identity.displayColor);
    expect(ANONYMOUS_AVATAR_EMOJIS).toContain(identity.avatarEmoji);
  });

  it('persists the identity under the user key', async () => {
    await service.saveIdentity('u1', {
      anonId: 'a1',
      displayId: 'ABCD',
      displayColor: '#7C3AED',
      avatarEmoji: 'ghost',
    });

    expect(redis.set).toHaveBeenCalledWith(
      'anonymous:user:u1',
      expect.any(String),
      expect.any(Number),
    );
  });

  it('enqueues and dequeues sessions in the topic list', async () => {
    await service.addToQueue('s1', 'coding');
    await service.removeFromQueue('s1', 'coding');

    expect(client.lPush).toHaveBeenCalledWith('anonymous:queue:coding', 's1');
    expect(client.sAdd).toHaveBeenCalledWith(
      'anonymous:queue-topics',
      'coding',
    );
    expect(client.lRem).toHaveBeenCalledWith('anonymous:queue:coding', 1, 's1');
  });

  it('returns null when the match lock is already held', async () => {
    lock.runExclusive.mockResolvedValue({ executed: false, result: null });

    await expect(service.attemptMatch('general')).resolves.toBeNull();
  });

  it('pairs two waiting sessions into a room', async () => {
    client.rPop.mockResolvedValueOnce('s1').mockResolvedValueOnce('s2');
    sessionRepo.findById.mockImplementation(async (id: string) => ({
      id,
      userId: id === 's1' ? 'u1' : 'u2',
      status: 'WAITING',
      expiresAt: future,
      topic: 'general',
    }));

    const outcome = await service.attemptMatch('general');

    expect(outcome).not.toBeNull();
    expect(outcome?.aUserId).toBe('u1');
    expect(outcome?.bUserId).toBe('u2');
    expect(outcome?.roomId).toEqual(expect.any(String));
    expect(outcome?.a.displayId).toBeDefined();
    expect(roomRepo.create).toHaveBeenCalledTimes(1);
    expect(participantRepo.create).toHaveBeenCalledTimes(2);
    expect(sessionRepo.markMatched).toHaveBeenCalledTimes(2);
    expect(client.sRem).toHaveBeenCalledWith(
      'anonymous:queue-topics',
      'general',
    );
  });

  it('requeues both candidates when they are not matchable', async () => {
    client.rPop.mockResolvedValueOnce('s1').mockResolvedValueOnce('s2');
    client.exists.mockResolvedValue(1);
    sessionRepo.findById.mockImplementation(async (id: string) => ({
      id,
      userId: id === 's1' ? 'u1' : 'u2',
      status: 'WAITING',
      expiresAt: future,
      topic: 'general',
    }));

    const outcome = await service.attemptMatch('general');

    expect(outcome).toBeNull();
    expect(roomRepo.create).not.toHaveBeenCalled();
    expect(client.rPush).toHaveBeenCalledWith('anonymous:queue:general', 's1');
    expect(client.rPush).toHaveBeenCalledWith('anonymous:queue:general', 's2');
  });

  it('drops an expired session instead of matching it', async () => {
    client.rPop.mockResolvedValueOnce('s1').mockResolvedValueOnce('s2');
    sessionRepo.findById.mockImplementation(async (id: string) => ({
      id,
      userId: id === 's1' ? 'u1' : 'u2',
      status: 'WAITING',
      expiresAt: new Date(Date.now() - 1000),
      topic: 'general',
    }));

    await expect(service.attemptMatch('general')).resolves.toBeNull();

    expect(sessionRepo.markExpired).toHaveBeenCalledWith('s1');
    expect(client.rPush).toHaveBeenCalledWith('anonymous:queue:general', 's2');
  });
});
