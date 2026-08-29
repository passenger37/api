import { Test, TestingModule } from '@nestjs/testing';

import { PresenceService, PresenceStatus } from './presence.service';
import { RedisService } from '../../../core/redis/redis.service';

describe('PresenceService', () => {
  let service: PresenceService;
  let redis: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
    expire: jest.Mock;
  };

  beforeEach(async () => {
    redis = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
      expire: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: RedisService,
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
  });

  it('should store online status with a TTL on markOnline', async () => {
    const result = await service.markOnline('u1');

    expect(redis.set).toHaveBeenCalledWith(
      'user:u1:presence',
      expect.stringContaining('"status":"ONLINE"'),
      60,
    );
    expect(result).toMatchObject({ userId: 'u1', status: 'ONLINE' });
    expect(result.lastSeen).toEqual(expect.any(Number));
  });

  it('should return offline with last seen when no presence key exists', async () => {
    redis.get.mockImplementation((key: string) => {
      if (key === 'user:u1:last-seen') {
        return Promise.resolve('1700000000000');
      }
      return Promise.resolve(null);
    });

    const result = await service.getStatus('u1');

    expect(result).toEqual({
      userId: 'u1',
      status: PresenceStatus.OFFLINE,
      lastSeen: 1700000000000,
    });
  });

  it('should parse the stored presence on getStatus', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({ status: 'DND', lastSeen: 1700000000000 }),
    );

    const result = await service.getStatus('u1');

    expect(result).toEqual({
      userId: 'u1',
      status: PresenceStatus.DND,
      lastSeen: 1700000000000,
    });
  });

  it('should hide invisible users as offline on getVisibleStatus', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({ status: 'INVISIBLE', lastSeen: 1700000000000 }),
    );

    const result = await service.getVisibleStatus('u1');

    expect(result.status).toBe(PresenceStatus.OFFLINE);
  });

  it('should refresh the TTL on touch', async () => {
    await service.touch('u1');

    expect(redis.expire).toHaveBeenCalledWith('user:u1:presence', 60);
  });

  it('should clear presence and record last seen on markOffline', async () => {
    const result = await service.markOffline('u1');

    expect(redis.del).toHaveBeenCalledWith('user:u1:presence');
    expect(redis.set).toHaveBeenCalledWith(
      'user:u1:last-seen',
      expect.any(String),
      2592000,
    );
    expect(result).toMatchObject({
      userId: 'u1',
      status: PresenceStatus.OFFLINE,
    });
    expect(result.lastSeen).toEqual(expect.any(Number));
  });
});
