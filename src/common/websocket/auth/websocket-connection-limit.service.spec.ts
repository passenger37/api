import { RedisService } from '../../../core/redis/redis.service';
import { WebSocketConnectionLimitService } from './websocket-connection-limit.service';

describe('WebSocketConnectionLimitService', () => {
  const redis = {
    incr: jest.fn(),
    decr: jest.fn(),
    expire: jest.fn(),
    set: jest.fn(),
  } as unknown as RedisService;

  let service: WebSocketConnectionLimitService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new WebSocketConnectionLimitService(redis);
  });

  it('accepts connections below the cap and refreshes the TTL', async () => {
    (redis.incr as jest.Mock).mockResolvedValue(3);

    await expect(service.acquire('u1')).resolves.toBe(true);
    expect(redis.incr).toHaveBeenCalledWith('ws:connections:u1');
    expect(redis.expire).toHaveBeenCalledWith('ws:connections:u1', 86_400);
  });

  it('rejects a connection above the cap and rolls the counter back', async () => {
    (redis.incr as jest.Mock).mockResolvedValue(6);

    await expect(service.acquire('u1')).resolves.toBe(false);
    expect(redis.decr).toHaveBeenCalledWith('ws:connections:u1');
  });

  it('decrements the counter on release', async () => {
    (redis.decr as jest.Mock).mockResolvedValue(2);

    await service.release('u1');

    expect(redis.decr).toHaveBeenCalledWith('ws:connections:u1');
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('clamps a negative counter back to zero on release', async () => {
    (redis.decr as jest.Mock).mockResolvedValue(-1);

    await service.release('u1');

    expect(redis.set).toHaveBeenCalledWith('ws:connections:u1', '0', 86_400);
  });
});
