import { RealtimePresenceService } from './realtime-presence.service';
import { RealtimePresenceStatus, RealtimePresencePrivacy } from '../types/realtime.types';

describe('RealtimePresenceService', () => {
  let service: RealtimePresenceService;
  let redis: any;

  beforeEach(() => {
    redis = {
      getClient: jest.fn().mockReturnValue({
        sAdd: jest.fn().mockResolvedValue(1),
        sRem: jest.fn().mockResolvedValue(1),
        sMembers: jest.fn().mockResolvedValue([]),
        sCard: jest.fn().mockResolvedValue(0),
      }),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(false),
      expire: jest.fn().mockResolvedValue(undefined),
      incr: jest.fn().mockResolvedValue(1),
    };

    service = new RealtimePresenceService(redis);
  });

  it('attaches a session', async () => {
    await service.attachSession('u1', 's1');

    expect(redis.set).toHaveBeenCalledWith(
      'presence:session:s1',
      expect.stringContaining('"sessionId":"s1"'),
      60,
    );
    expect(redis.getClient().sAdd).toHaveBeenCalledWith('presence:user:u1:sessions', 's1');
  });

  it('detaches a session and cleans up', async () => {
    await service.detachSession('u1', 's1');

    expect(redis.del).toHaveBeenCalledWith('presence:session:s1');
    expect(redis.getClient().sRem).toHaveBeenCalledWith('presence:user:u1:sessions', 's1');
  });

  it('heartbeat updates session TTL and commits user presence ONLINE', async () => {
    redis.get.mockResolvedValueOnce(JSON.stringify({ sessionId: 's1', userId: 'u1', lastSeen: 1000 }));
    jest.spyOn(service, 'getSessionCount').mockResolvedValue(1);

    await service.heartbeat('u1', 's1');

    expect(redis.set).toHaveBeenCalledWith(
      'presence:session:s1',
      expect.stringContaining('"lastSeen"'),
      60,
    );
    expect(redis.set).toHaveBeenCalledWith(
      'presence:user:u1',
      expect.stringContaining('"status":"ONLINE"'),
      60,
    );
  });

  it('setStatus OFFLINE commits offline presence', async () => {
    jest.spyOn(service, 'getSessionCount').mockResolvedValue(0);

    const result = await service.setStatus('u1', RealtimePresenceStatus.OFFLINE);

    expect(result.status).toBe(RealtimePresenceStatus.OFFLINE);
    expect(redis.set).toHaveBeenCalledWith(
      'presence:user:u1',
      expect.stringContaining('"status":"OFFLINE"'),
      60,
    );
  });

  it('getVisibleStatus masks INVISIBLE as OFFLINE', async () => {
    redis.get.mockResolvedValueOnce(
      JSON.stringify({
        userId: 'u1',
        status: RealtimePresenceStatus.INVISIBLE,
        lastSeen: 1000,
        sessionCount: 1,
      }),
    );

    const result = await service.getVisibleStatus('u1');

    expect(result.status).toBe(RealtimePresenceStatus.OFFLINE);
  });

  it('normalizePrivacy validates and defaults', () => {
    expect(service.normalizePrivacy(undefined)).toBe(RealtimePresencePrivacy.EVERYONE);
    expect(service.normalizePrivacy('CONNECTIONS')).toBe(RealtimePresencePrivacy.CONNECTIONS);
    expect(service.normalizePrivacy('INVALID')).toBe(RealtimePresencePrivacy.EVERYONE);
  });

  it('canViewerSeePresence allows self and EVERYONE, blocks NOBODY', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({
        userId: 'u1',
        status: 'ONLINE',
        lastSeen: 1000,
        sessionCount: 1,
        privacy: RealtimePresencePrivacy.NOBODY,
      }),
    );

    expect(await service.canViewerSeePresence('u1', 'u1')).toBe(true);
    expect(await service.canViewerSeePresence('u1', 'u2')).toBe(false);

    redis.get.mockResolvedValue(
      JSON.stringify({
        userId: 'u1',
        status: 'ONLINE',
        lastSeen: 1000,
        sessionCount: 1,
        privacy: RealtimePresencePrivacy.EVERYONE,
      }),
    );

    expect(await service.canViewerSeePresence('u1', 'u2')).toBe(true);
  });
});