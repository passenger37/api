import { CommunityEventPublisher } from './community-event-publisher';

/**
 * Unit tests for CommunityEventPublisher.
 *
 * Coverage priorities:
 * - The envelope is published on the right per-community Redis channel.
 * - Best-effort contract: serialization errors, oversized payloads, and
 *   Redis errors are logged but never re-thrown (the originating HTTP
 *   request must not fail because of a realtime fan-out problem).
 * - The 16 KiB payload cap drops the event with a warn log, not an
 *   error, and never reaches Redis.
 * - waitUntilReady is awaited before the publish, so the publisher is
 *   safe to call during boot.
 */
describe('CommunityEventPublisher', () => {
  let publisher: CommunityEventPublisher;
  let redis: any;
  let logger: any;

  beforeEach(() => {
    logger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    redis = {
      waitUntilReady: jest.fn().mockResolvedValue(undefined),
      getClient: jest.fn(),
    };

    publisher = new CommunityEventPublisher(redis);
    // Replace the auto-created Logger with a spy.
    (publisher as any).logger = logger;
  });

  it('should publish a serialized envelope on the per-community channel', async () => {
    const publish = jest.fn().mockResolvedValue(1);
    redis.getClient.mockReturnValue({ publish });

    await publisher.publish('c1', 'community:post:created', {
      post: { id: 'p1' },
    });

    expect(redis.waitUntilReady).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledTimes(1);

    const [channel, message] = publish.mock.calls[0];
    expect(channel).toBe('community:c1:events');

    const envelope = JSON.parse(message);
    expect(envelope.event).toBe('community:post:created');
    expect(envelope.communityId).toBe('c1');
    expect(envelope.payload).toEqual({ post: { id: 'p1' } });
    expect(typeof envelope.emittedAt).toBe('string');
  });

  it('should drop a payload that is not JSON-serializable and log a payload error', async () => {
    const publish = jest.fn();
    redis.getClient.mockReturnValue({ publish });

    const circular: Record<string, unknown> = {};
    circular.self = circular;

    await publisher.publish('c1', 'community:post:created', circular);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
  });

  it('should drop an oversized payload and log a warn (not an error)', async () => {
    const publish = jest.fn();
    redis.getClient.mockReturnValue({ publish });

    const huge = 'x'.repeat(CommunityEventPublisher.MAX_ENVELOPE_BYTES + 1);

    await publisher.publish('c1', 'community:post:created', {
      body: huge,
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('should catch a Redis publish error and log a transport error', async () => {
    const publish = jest.fn().mockRejectedValue(new Error('Redis offline'));
    redis.getClient.mockReturnValue({ publish });

    await publisher.publish('c1', 'community:post:created', {
      post: { id: 'p1' },
    });

    expect(publish).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    // Must not re-throw — the originating HTTP request continues.
  });

  it('should await waitUntilReady before fetching the client', async () => {
    const order: string[] = [];

    redis.waitUntilReady.mockImplementation(async () => {
      order.push('wait');
    });
    redis.getClient.mockImplementation(() => {
      order.push('getClient');
      return {
        publish: jest.fn().mockImplementation(async () => {
          order.push('publish');
        }),
      };
    });

    await publisher.publish('c1', 'community:post:created', {
      post: { id: 'p1' },
    });

    expect(order).toEqual(['wait', 'getClient', 'publish']);
  });
});
