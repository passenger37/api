import { RealtimeTypingService } from './realtime-typing.service';

describe('RealtimeTypingService', () => {
  let service: RealtimeTypingService;
  let redis: any;

  beforeEach(() => {
    redis = {
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(false),
    };

    service = new RealtimeTypingService(redis);
  });

  it('startTyping sets Redis key with TTL', async () => {
    const result = await service.startTyping('c1', 'u1');

    expect(redis.set).toHaveBeenCalledWith(
      'typing:c1:u1',
      expect.any(String),
      10,
    );
    expect(result).toEqual({ channelId: 'c1', userId: 'u1' });
  });

  it('stopTyping deletes Redis key', async () => {
    const result = await service.stopTyping('c1', 'u1');

    expect(redis.del).toHaveBeenCalledWith('typing:c1:u1');
    expect(result).toEqual({ channelId: 'c1', userId: 'u1' });
  });

  it('isTyping checks existence', async () => {
    redis.exists.mockResolvedValueOnce(true);

    const result = await service.isTyping('c1', 'u1');

    expect(redis.exists).toHaveBeenCalledWith('typing:c1:u1');
    expect(result).toBe(true);
  });
});
