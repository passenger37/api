import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';

import { MessageSpamControlService } from './message-spam-control.service';
import { RedisService } from '../../../core/redis/redis.service';

describe('MessageSpamControlService', () => {
  let service: MessageSpamControlService;
  let redis: { incr: jest.Mock; expire: jest.Mock };

  beforeEach(async () => {
    redis = {
      incr: jest.fn(),
      expire: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageSpamControlService,
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(MessageSpamControlService);
  });

  describe('checkSend', () => {
    it('should allow a send within the rate limit', async () => {
      redis.incr.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      await expect(
        service.checkSend('ch1', 'member-1', 'hello world'),
      ).resolves.toBeUndefined();
      expect(redis.expire).toHaveBeenCalledWith(
        expect.stringContaining('spam:sig:ch1:member-1:'),
        MessageSpamControlService.DUPLICATE_WINDOW_SECONDS,
      );
    });

    it('should set the TTL on first rate-limit hit', async () => {
      redis.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      await service.checkSend('ch1', 'member-1', 'hello');

      expect(redis.expire).toHaveBeenCalledWith(
        `spam:send:member-1`,
        MessageSpamControlService.SEND_RATE_WINDOW_SECONDS,
      );
    });

    it('should reject sends above the rate limit', async () => {
      redis.incr.mockResolvedValue(
        MessageSpamControlService.SEND_RATE_LIMIT + 1,
      );

      await expect(
        service.checkSend('ch1', 'member-1', 'hello'),
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('should reject duplicate content within the duplicate window', async () => {
      redis.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

      await expect(
        service.checkSend('ch1', 'member-1', 'same text twice'),
      ).rejects.toMatchObject({
        message: expect.stringContaining('Duplicate content'),
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });
  });

  describe('checkUploadRequest', () => {
    it('should allow uploads within the limit', async () => {
      redis.incr.mockResolvedValue(1);

      await expect(
        service.checkUploadRequest('member-1'),
      ).resolves.toBeUndefined();
      expect(redis.expire).toHaveBeenCalledWith(
        `spam:upload:member-1`,
        MessageSpamControlService.UPLOAD_RATE_WINDOW_SECONDS,
      );
    });

    it('should reject uploads above the limit', async () => {
      redis.incr.mockResolvedValue(
        MessageSpamControlService.UPLOAD_RATE_LIMIT + 1,
      );

      await expect(
        service.checkUploadRequest('member-1'),
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });
  });
});
