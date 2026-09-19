import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ChannelType, ServerPermission } from '@prisma/client';

import { FeedService } from './feed.service';
import { FeedRepository } from '../repositories/feed.repository';
import { ServerPermissionService } from '../../servers/services/server-permission.service';
import { FeedFilter } from '../dto/request/get-feed.query';

const encode = (item: { createdAt: Date; id: string }) =>
  Buffer.from(`${item.createdAt.toISOString()}|${item.id}`).toString(
    'base64url',
  );

describe('FeedService', () => {
  let service: FeedService;
  let repository: {
    findMemberServers: jest.Mock;
    findMemberServerChannels: jest.Mock;
    findFollowedUserIds: jest.Mock;
    findFeedPage: jest.Mock;
    hydrateMessages: jest.Mock;
  };
  let permissionService: { hasPermission: jest.Mock };

  beforeEach(async () => {
    repository = {
      findMemberServers: jest.fn(),
      findMemberServerChannels: jest.fn(),
      findFollowedUserIds: jest.fn(),
      findFeedPage: jest.fn(),
      hydrateMessages: jest.fn(),
    };
    permissionService = { hasPermission: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: FeedRepository, useValue: repository },
        {
          provide: ServerPermissionService,
          useValue: permissionService,
        },
      ],
    }).compile();

    service = module.get(FeedService);
  });

  const baseRow = {
    id: 'msg-1',
    content: 'hello',
    serverId: 'srv-1',
    channelId: 'ch-1',
    authorMemberId: 'mem-1',
    messageSeq: 3,
    isPinned: false,
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
  };

  const hydratedMessage = {
    ...baseRow,
    author: {
      user: {
        id: 'user-1',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
      },
    },
    channel: {
      id: 'ch-1',
      name: 'general',
      server: { id: 'srv-1', name: 'Nexus HQ' },
    },
  };

  describe('latest feed', () => {
    it('returns only messages from permission-visible channels', async () => {
      repository.findMemberServers.mockResolvedValue(['srv-1']);
      repository.findMemberServerChannels.mockResolvedValue([
        { id: 'ch-1', serverId: 'srv-1', type: ChannelType.TEXT },
        { id: 'ch-2', serverId: 'srv-1', type: ChannelType.TEXT },
        { id: 'ch-3', serverId: 'srv-1', type: ChannelType.VOICE },
      ]);
      permissionService.hasPermission.mockImplementation(
        async (_serverId, _userId, _permission, channelId: string) =>
          channelId === 'ch-1',
      );
      repository.findFeedPage.mockResolvedValue([baseRow]);
      repository.hydrateMessages.mockResolvedValue([hydratedMessage]);

      const result = await service.getFeed('user-1', {
        filter: FeedFilter.LATEST,
        limit: 25,
      });

      expect(permissionService.hasPermission).toHaveBeenCalledWith(
        'srv-1',
        'user-1',
        ServerPermission.CHANNEL_VIEW,
        'ch-1',
      );
      expect(repository.findFeedPage).toHaveBeenCalledWith({
        channelIds: ['ch-1'],
        cursor: null,
        take: 26,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'msg-1',
        content: 'hello',
        serverName: 'Nexus HQ',
        channelName: 'general',
        authorUsername: 'alice',
      });
      expect(result.hasMore).toBe(false);
    });

    it('returns empty when the user has no member servers', async () => {
      repository.findMemberServers.mockResolvedValue([]);

      const result = await service.getFeed('user-1', {
        filter: FeedFilter.LATEST,
      } as never);

      expect(result).toEqual({
        items: [],
        nextCursor: undefined,
        hasMore: false,
      });
      expect(repository.findFeedPage).not.toHaveBeenCalled();
    });

    it('returns empty when no channels are viewable', async () => {
      repository.findMemberServers.mockResolvedValue(['srv-1']);
      repository.findMemberServerChannels.mockResolvedValue([
        { id: 'ch-1', serverId: 'srv-1', type: ChannelType.TEXT },
      ]);
      permissionService.hasPermission.mockResolvedValue(false);

      const result = await service.getFeed('user-1', {
        filter: FeedFilter.LATEST,
      } as never);

      expect(result.hasMore).toBe(false);
      expect(result.items).toHaveLength(0);
    });

    it('builds a nextCursor when more rows exist', async () => {
      const rows = Array.from({ length: 26 }, (_, index) => ({
        ...baseRow,
        id: `msg-${index}`,
        createdAt: new Date(Date.UTC(2026, 7, 30, 0, index)),
      }));
      repository.findMemberServers.mockResolvedValue(['srv-1']);
      repository.findMemberServerChannels.mockResolvedValue([
        { id: 'ch-1', serverId: 'srv-1', type: ChannelType.TEXT },
      ]);
      permissionService.hasPermission.mockResolvedValue(true);
      repository.findFeedPage.mockResolvedValue(rows);
      repository.hydrateMessages.mockImplementation((ids: string[]) =>
        Promise.resolve(ids.map((id) => rows.find((row) => row.id === id))),
      );

      const result = await service.getFeed('user-1', {
        filter: FeedFilter.LATEST,
        limit: 25,
      });

      expect(result.items).toHaveLength(25);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(encode(rows[24]));
    });

    it('rejects an invalid cursor', async () => {
      repository.findMemberServers.mockResolvedValue(['srv-1']);
      repository.findMemberServerChannels.mockResolvedValue([]);

      await expect(
        service.getFeed('user-1', {
          filter: FeedFilter.LATEST,
          cursor: '!!not-encoded!!',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('following feed', () => {
    it('scopes the page to messages authored by followed users', async () => {
      repository.findMemberServers.mockResolvedValue(['srv-1']);
      repository.findMemberServerChannels.mockResolvedValue([
        { id: 'ch-1', serverId: 'srv-1', type: ChannelType.TEXT },
      ]);
      permissionService.hasPermission.mockResolvedValue(true);
      repository.findFollowedUserIds.mockResolvedValue(['user-2', 'user-3']);
      repository.findFeedPage.mockResolvedValue([baseRow]);
      repository.hydrateMessages.mockResolvedValue([hydratedMessage]);

      await service.getFeed('user-1', {
        filter: FeedFilter.FOLLOWING,
        limit: 25,
      });

      expect(repository.findFollowedUserIds).toHaveBeenCalledWith('user-1');
      expect(repository.findFeedPage).toHaveBeenCalledWith({
        channelIds: ['ch-1'],
        userIds: ['user-2', 'user-3'],
        cursor: null,
        take: 26,
      });
    });
  });
});
