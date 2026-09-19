import { AnonymousChatRateLimitService } from './anonymous-chat.rate-limit.service';
import { AnonymousChatErrorCode } from '../types/anonymous-chat.types';

describe('AnonymousChatRateLimitService', () => {
  let service: AnonymousChatRateLimitService;
  let rateLimit: any;
  let redis: any;

  beforeEach(() => {
    rateLimit = { consume: jest.fn().mockResolvedValue(undefined) };
    redis = {};
    service = new AnonymousChatRateLimitService(rateLimit, redis);
  });

  it('passes through when the shared limiter allows the call', async () => {
    await expect(service.assertJoinAllowed('u1')).resolves.toBeUndefined();

    expect(rateLimit.consume).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'anonymous:join-queue:u1', limit: 10 }),
    );
  });

  it('maps limiter rejection to the queue-rate-limited domain error', async () => {
    rateLimit.consume.mockRejectedValue(new Error('too many'));

    await expect(service.assertJoinAllowed('u1')).rejects.toMatchObject({
      code: AnonymousChatErrorCode.QUEUE_RATE_LIMITED,
    });
  });

  it('maps message limiter rejection to the message-rate-limited domain error', async () => {
    rateLimit.consume.mockRejectedValue(new Error('too many'));

    await expect(service.assertMessageAllowed('u1')).rejects.toMatchObject({
      code: AnonymousChatErrorCode.MESSAGE_RATE_LIMITED,
    });
  });

  it('maps report limiter rejection to the report domain error', async () => {
    rateLimit.consume.mockRejectedValue(new Error('too many'));

    await expect(service.assertReportAllowed('u1')).rejects.toMatchObject({
      code: AnonymousChatErrorCode.REPORT_RATE_LIMITED,
    });
  });

  it('maps block limiter rejection to the block domain error', async () => {
    rateLimit.consume.mockRejectedValue(new Error('too many'));

    await expect(service.assertBlockAllowed('u1')).rejects.toMatchObject({
      code: AnonymousChatErrorCode.BLOCK_RATE_LIMITED,
    });
  });
});
