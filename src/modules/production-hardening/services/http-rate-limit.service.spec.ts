import { HttpRateLimitService } from './http-rate-limit.service';

describe('HttpRateLimitService', () => {
  let service: HttpRateLimitService;
  let redis: any;
  let redisClient: any;

  beforeEach(() => {
    redisClient = {
      multi: jest.fn().mockReturnThis(),
      zRemRangeByScore: jest.fn().mockReturnThis(),
      zCard: jest.fn().mockReturnThis(),
      zAdd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([null, 0, null, null]),
      zRemRangeByScore: jest.fn().mockResolvedValue(0),
      zCard: jest.fn().mockResolvedValue(0),
      del: jest.fn().mockResolvedValue(undefined),
    };

    redis = {
      getClient: jest.fn().mockReturnValue(redisClient),
      del: jest.fn().mockResolvedValue(undefined),
    };

    service = new HttpRateLimitService(redis);
  });

  it('allows request within limit', async () => {
    const result = await service.consume({ key: 'test-key', limit: 10, windowSeconds: 60 });

    expect(result.limit).toBe(10);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result.resetAt).toBeGreaterThan(0);
  });

  it('throws when limit exceeded', async () => {
    redisClient.exec.mockResolvedValueOnce([null, 10, null, null]);

    await expect(service.consume({ key: 'test-key', limit: 10, windowSeconds: 60 })).rejects.toThrow();
  });

  it('resets key', async () => {
    await service.reset('test-key');

    expect(redis.del).toHaveBeenCalledWith('http:ratelimit:test-key');
  });
});