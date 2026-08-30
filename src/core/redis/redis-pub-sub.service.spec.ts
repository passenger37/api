import { RedisPubSubService } from './redis-pub-sub.service';
import { RedisService } from './redis.service';

describe('RedisPubSubService', () => {
  const subscriberClient = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
  };

  const primaryClient = {
    duplicate: jest.fn().mockReturnValue(subscriberClient),
    publish: jest.fn().mockResolvedValue(1),
  };

  const redis = {
    getClient: jest.fn().mockReturnValue(primaryClient),
  } as unknown as RedisService;

  let service: RedisPubSubService;

  beforeEach(async () => {
    jest.clearAllMocks();
    primaryClient.duplicate.mockReturnValue(subscriberClient);
    service = new RedisPubSubService(redis);
    await service.onModuleInit();
  });

  it('creates a dedicated subscriber connection on init', async () => {
    expect(primaryClient.duplicate).toHaveBeenCalled();
    expect(subscriberClient.connect).toHaveBeenCalled();
  });

  it('publishes a JSON-serialized payload', async () => {
    await service.publish('chan', { userId: 'u1' });

    expect(primaryClient.publish).toHaveBeenCalledWith(
      'chan',
      JSON.stringify({ userId: 'u1' }),
    );
  });

  it('subscribes and dispatches parsed payloads to handlers', async () => {
    const handler = jest.fn();
    await service.subscribe<{ userId: string }>('chan', handler);

    expect(subscriberClient.subscribe).toHaveBeenCalledWith(
      'chan',
      expect.any(Function),
    );

    const listener = (subscriberClient.subscribe as jest.Mock).mock.calls[0][1];
    listener(JSON.stringify({ userId: 'u1' }), 'chan');

    expect(handler).toHaveBeenCalledWith({ userId: 'u1' });
  });

  it('dispatches to every handler on the channel', async () => {
    const first = jest.fn();
    const second = jest.fn();

    await service.subscribe('chan', first);
    await service.subscribe('chan', second);

    const listener = (subscriberClient.subscribe as jest.Mock).mock.calls[0][1];
    expect(subscriberClient.subscribe).toHaveBeenCalledTimes(1);
    listener('payload', 'chan');

    expect(first).toHaveBeenCalledWith('payload');
    expect(second).toHaveBeenCalledWith('payload');
  });

  it('unsubscribes when the last handler leaves the channel', async () => {
    const unsubscribe = await service.subscribe('chan', jest.fn());

    await unsubscribe();

    expect(subscriberClient.unsubscribe).toHaveBeenCalledWith('chan');
  });
});
