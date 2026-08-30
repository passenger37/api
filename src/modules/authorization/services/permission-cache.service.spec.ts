import { PermissionCacheService } from './permission-cache.service';
import { RedisService } from '../../../core/redis/redis.service';
import { RedisPubSubService } from '../../../core/redis/redis-pub-sub.service';
import { PERMISSION_INVALIDATE_CHANNEL } from '../../../core/redis/redis-keys';

describe('PermissionCacheService', () => {
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  } as unknown as RedisService;

  const pubSub = {
    subscribe: jest.fn().mockResolvedValue(jest.fn()),
    publish: jest.fn().mockResolvedValue(undefined),
  } as unknown as RedisPubSubService;

  let service: PermissionCacheService;

  const context = {
    userId: 'user-1',
    status: 'ACTIVE',
    permissionVersion: 2,
    roles: [
      {
        id: 'role-1',
        name: 'USER',
        permissions: [],
      },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (pubSub.subscribe as jest.Mock).mockResolvedValue(jest.fn());
    service = new PermissionCacheService(redis, pubSub);
  });

  it('reads from the in-memory cache when present', async () => {
    await service.set('user-1', context);

    await expect(service.get('user-1')).resolves.toBe(context);
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('reads from Redis and populates the memory cache on a miss', async () => {
    (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(context));

    await expect(service.get('user-1')).resolves.toEqual(context);
    expect(redis.get).toHaveBeenCalledWith('authorization:user:user-1');

    jest.clearAllMocks();

    await expect(service.get('user-1')).resolves.toEqual(context);
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('returns null when neither cache holds the context', async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);

    await expect(service.get('user-1')).resolves.toBeNull();
  });

  it('writes the context to memory and Redis with a TTL', async () => {
    await service.set('user-1', context);

    expect(redis.set).toHaveBeenCalledWith(
      'authorization:user:user-1',
      JSON.stringify(context),
      300,
    );

    await expect(service.get('user-1')).resolves.toBe(context);
  });

  it('deletes the context from memory and Redis and notifies peers', async () => {
    await service.set('user-1', context);

    await service.delete('user-1');

    expect(redis.del).toHaveBeenCalledWith('authorization:user:user-1');
    expect(pubSub.publish).toHaveBeenCalledWith(PERMISSION_INVALIDATE_CHANNEL, {
      userId: 'user-1',
    });
  });

  it('evicts the local memory copy when a peer invalidates the user', () => {
    const onMessage = jest.fn();
    (pubSub.subscribe as jest.Mock).mockImplementation(async (_channel, fn) => {
      onMessage.mockImplementation(fn);
      return jest.fn();
    });

    service = new PermissionCacheService(redis, pubSub);

    service.onModuleInit();

    expect(pubSub.subscribe).toHaveBeenCalledWith(
      PERMISSION_INVALIDATE_CHANNEL,
      expect.any(Function),
    );

    service.set('user-1', context);
    expect(service['memory'].has('user-1')).toBe(true);

    onMessage({ userId: 'user-1' });

    expect(service['memory'].has('user-1')).toBe(false);
  });

  it('reports existence from memory first, then Redis', async () => {
    (redis.exists as jest.Mock).mockResolvedValue(true);

    await expect(service.exists('user-1')).resolves.toBe(true);

    await service.set('user-1', context);
    jest.clearAllMocks();

    await expect(service.exists('user-1')).resolves.toBe(true);
    expect(redis.exists).not.toHaveBeenCalled();
  });
});
