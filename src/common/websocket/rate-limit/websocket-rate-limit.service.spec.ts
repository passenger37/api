import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { WebSocketRateLimitService } from './websocket-rate-limit.service';
import { RedisService } from '../../../core/redis/redis.service';

describe('WebSocketRateLimitService', () => {
  let service: WebSocketRateLimitService;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketRateLimitService,
        {
          provide: RedisService,
          useValue: {
            incr: jest.fn(),
            expire: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebSocketRateLimitService>(WebSocketRateLimitService);
    redis = module.get(RedisService);
  });

  it('should allow request under limit and set expire on first increment', async () => {
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);

    await service.consume({ key: 'test:key', limit: 5, windowSeconds: 60 });

    expect(redis.incr).toHaveBeenCalledWith('test:key');
    expect(redis.expire).toHaveBeenCalledWith('test:key', 60);
  });

  it('should not set expire when counter > 1', async () => {
    redis.incr.mockResolvedValue(3);
    await service.consume({ key: 'test:key', limit: 5, windowSeconds: 60 });
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('should throw when limit exceeded', async () => {
    redis.incr.mockResolvedValue(6);
    await expect(
      service.consume({ key: 'test:key', limit: 5, windowSeconds: 60 }),
    ).rejects.toThrow(HttpException);
    await expect(
      service.consume({ key: 'test:key', limit: 5, windowSeconds: 60 }),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });
});
