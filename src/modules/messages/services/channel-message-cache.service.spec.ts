import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from '../../../core/redis/redis.service';
import {
  ChannelMessageCacheService,
  MESSAGE_READ_CACHE_TTL_SECONDS,
} from './channel-message-cache.service';

describe('ChannelMessageCacheService', () => {
  let service: ChannelMessageCacheService;
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    incr: jest.Mock;
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMessageCacheService,
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(ChannelMessageCacheService);
  });

  describe('channel versioning', () => {
    it('should return 0 when no version key exists', async () => {
      redis.get.mockResolvedValue(null);

      const version = await service.getChannelVersion('ch-1');

      expect(version).toBe(0);
      expect(redis.get).toHaveBeenCalledWith('msg:ver:ch-1');
    });

    it('should return the stored version', async () => {
      redis.get.mockResolvedValue('5');

      const version = await service.getChannelVersion('ch-1');

      expect(version).toBe(5);
    });

    it('should treat unparsable versions as 0', async () => {
      redis.get.mockResolvedValue('nope');

      const version = await service.getChannelVersion('ch-1');

      expect(version).toBe(0);
    });

    it('should bump the channel version on invalidation', async () => {
      await service.invalidateChannel('ch-1');

      expect(redis.incr).toHaveBeenCalledWith('msg:ver:ch-1');
    });
  });

  describe('channel page cache', () => {
    it('should read and parse a cached page keyed by version and cursor', async () => {
      redis.get
        .mockResolvedValueOnce('3')
        .mockResolvedValueOnce(
          JSON.stringify({ items: [], nextCursor: undefined, hasMore: false }),
        );

      const cached = await service.getCachedPage('ch-1', undefined, 50);

      expect(redis.get).toHaveBeenNthCalledWith(1, 'msg:ver:ch-1');
      expect(redis.get).toHaveBeenNthCalledWith(2, 'msg:page:ch-1:3:start:50');
      expect(cached).toEqual({
        items: [],
        nextCursor: undefined,
        hasMore: false,
      });
    });

    it('should return null for a miss', async () => {
      redis.get.mockResolvedValueOnce('3').mockResolvedValueOnce(null);

      await expect(
        service.getCachedPage('ch-1', 'abc', 25),
      ).resolves.toBeNull();
    });

    it('should store a page as JSON under the current channel version with a TTL', async () => {
      redis.get.mockResolvedValueOnce('3');

      await service.cachePage('ch-1', 'abc', 25, { items: [], hasMore: false });

      expect(redis.set).toHaveBeenCalledWith(
        'msg:page:ch-1:3:abc:25',
        JSON.stringify({ items: [], hasMore: false }),
        MESSAGE_READ_CACHE_TTL_SECONDS,
      );
    });
  });

  describe('messages-after cache (sync replay)', () => {
    it('should use the after:key namespace', async () => {
      redis.get.mockResolvedValueOnce('1').mockResolvedValueOnce(null);

      await expect(
        service.getCachedMessagesAfter('ch-1', 'm42', 50),
      ).resolves.toBeNull();

      expect(redis.get).toHaveBeenNthCalledWith(2, 'msg:after:ch-1:1:m42:50');
    });

    it('should cache the replayed envelope', async () => {
      redis.get.mockResolvedValueOnce('1');

      await service.cacheMessagesAfter('ch-1', 'm42', 50, []);

      expect(redis.set).toHaveBeenCalledWith(
        'msg:after:ch-1:1:m42:50',
        '[]',
        MESSAGE_READ_CACHE_TTL_SECONDS,
      );
    });
  });

  describe('thread cache', () => {
    it('should use the thread:key namespace', async () => {
      redis.get.mockResolvedValueOnce('2').mockResolvedValueOnce(null);

      await expect(
        service.getCachedThread('ch-1', 'parent-1', undefined, 50),
      ).resolves.toBeNull();

      expect(redis.get).toHaveBeenNthCalledWith(
        2,
        'msg:thread:ch-1:2:parent-1:start:50',
      );
    });

    it('should cache thread payloads', async () => {
      redis.get.mockResolvedValueOnce('2');

      await service.cacheThread('ch-1', 'parent-1', undefined, 50, {
        items: [],
        replyCount: 0,
      });

      expect(redis.set).toHaveBeenCalledWith(
        'msg:thread:ch-1:2:parent-1:start:50',
        '{"items":[],"replyCount":0}',
        MESSAGE_READ_CACHE_TTL_SECONDS,
      );
    });
  });

  describe('unread cache', () => {
    it('should cache a count per member and version with a TTL', async () => {
      await service.cacheUnread('ch-1', 'member-1', 4, 3);

      expect(redis.set).toHaveBeenCalledWith(
        'msg:unread:ch-1:member-1:4',
        '3',
        MESSAGE_READ_CACHE_TTL_SECONDS,
      );
    });

    it('should return the cached count', async () => {
      redis.get.mockResolvedValue('3');

      await expect(
        service.getCachedUnread('ch-1', 'member-1', 4),
      ).resolves.toBe(3);
    });

    it('should return null on a miss', async () => {
      redis.get.mockResolvedValue(null);

      await expect(
        service.getCachedUnread('ch-1', 'member-1', 4),
      ).resolves.toBeNull();
    });

    it('should return null for unparsable counts', async () => {
      redis.get.mockResolvedValue('NaN');

      await expect(
        service.getCachedUnread('ch-1', 'member-1', 4),
      ).resolves.toBeNull();
    });
  });
});
