import { HttpException, HttpStatus } from '@nestjs/common';

import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  const redis = {
    incr: jest.fn(),
    expire: jest.fn(),
  };

  const service = new AuthRateLimitService(redis as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows requests within the configured limit', async () => {
    redis.incr.mockResolvedValue(3);

    await expect(
      service.consume({ key: 'auth:login:a:ip', limit: 5, windowSeconds: 60 }),
    ).resolves.toBeUndefined();

    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('sets the window expiry on the first request', async () => {
    redis.incr.mockResolvedValue(1);

    await service.consume({
      key: 'auth:login:a:ip',
      limit: 5,
      windowSeconds: 60,
    });

    expect(redis.expire).toHaveBeenCalledWith('auth:login:a:ip', 60);
  });

  it('rejects requests above the limit with 429', async () => {
    redis.incr.mockResolvedValue(6);

    try {
      await service.consume({
        key: 'auth:login:a:ip',
        limit: 5,
        windowSeconds: 60,
      });

      throw new Error('expected consume to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });
});
