import { PermissionCacheService } from './permission-cache.service';
import { RedisService } from '../../../core/redis/redis.service';

describe('PermissionCacheService', () => {
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  } as unknown as RedisService;

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
    service = new PermissionCacheService(redis);
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

  it('deletes the context from memory and Redis', async () => {
    await service.set('user-1', context);

    await service.delete('user-1');

    expect(redis.del).toHaveBeenCalledWith('authorization:user:user-1');
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
