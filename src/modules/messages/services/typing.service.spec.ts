import { Test, TestingModule } from '@nestjs/testing';

import { TypingService } from './typing.service';
import { RedisService } from '../../../core/redis/redis.service';

describe('TypingService', () => {
  let service: TypingService;
  let redis: { set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    redis = { set: jest.fn().mockResolvedValue(undefined), del: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypingService,
        {
          provide: RedisService,
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<TypingService>(TypingService);
  });

  it('should write presence with a short TTL on start', async () => {
    await service.startTyping('ch1', 'u1');

    expect(redis.set).toHaveBeenCalledWith('typing:ch1:u1', '1', 10);
  });

  it('should remove presence on stop', async () => {
    await service.stopTyping('ch1', 'u1');

    expect(redis.del).toHaveBeenCalledWith('typing:ch1:u1');
  });
});
