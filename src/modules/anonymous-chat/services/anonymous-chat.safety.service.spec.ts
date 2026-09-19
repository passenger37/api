import { AnonymousChatSafetyService } from './anonymous-chat.safety.service';
import {
  ANONYMOUS_SPAM_LIMIT,
  ANONYMOUS_SKIP_LIMIT,
} from '../constants/anonymous-chat.constants';
import { AnonymousChatErrorCode } from '../types/anonymous-chat.types';

describe('AnonymousChatSafetyService', () => {
  let service: AnonymousChatSafetyService;
  let redis: any;
  let ttl: jest.Mock;

  beforeEach(() => {
    ttl = jest.fn().mockResolvedValue(120);
    redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(false),
      getClient: jest.fn(() => ({ ttl })),
    };
    service = new AnonymousChatSafetyService(redis);
  });

  it('accepts a normal message and records its spam signature', async () => {
    await expect(
      service.assertSafeToSend('u1', 'r1', 'hello there'),
    ).resolves.toHaveLength(24);

    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining('r1:u1:'));
    expect(redis.expire).toHaveBeenCalled();
  });

  it('rejects a message that is too long', async () => {
    await expect(
      service.assertSafeToSend('u1', 'r1', 'x'.repeat(2001)),
    ).rejects.toMatchObject({ code: AnonymousChatErrorCode.MESSAGE_TOO_LARGE });
  });

  it('rejects a message dominated by control characters', async () => {
    await expect(
      service.assertSafeToSend('u1', 'r1', '\u0000\u0001\u0002abc'),
    ).rejects.toMatchObject({ code: AnonymousChatErrorCode.MESSAGE_TOO_LARGE });
  });

  it('rejects repeated identical content beyond the spam limit', async () => {
    redis.incr.mockResolvedValue(ANONYMOUS_SPAM_LIMIT + 1);

    await expect(
      service.assertSafeToSend('u1', 'r1', 'spam'),
    ).rejects.toMatchObject({ code: AnonymousChatErrorCode.NOT_ALLOWED });
  });

  it('allows a skip under the limit', async () => {
    redis.incr.mockResolvedValue(ANONYMOUS_SKIP_LIMIT);

    await expect(service.recordSkip('u1')).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('sets a restriction once the skip limit is exceeded', async () => {
    redis.incr.mockResolvedValue(ANONYMOUS_SKIP_LIMIT + 1);

    const result = await service.recordSkip('u1');

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('restriction:u1'),
      'skip-cooldown',
      expect.any(Number),
    );
  });

  it('surfaces the remaining cooldown when the user is restricted', async () => {
    redis.exists.mockResolvedValue(true);
    ttl.mockResolvedValue(90);

    await expect(service.assertSkipAllowed('u1')).rejects.toMatchObject({
      code: AnonymousChatErrorCode.SKIP_COOLDOWN,
      message: expect.stringContaining('90'),
    });
  });

  it('does not throw when skip is allowed', async () => {
    await expect(service.assertSkipAllowed('u1')).resolves.toBeUndefined();
  });
});
