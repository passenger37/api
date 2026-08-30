import { Test, TestingModule } from '@nestjs/testing';

import { FeedRepository } from './feed.repository';
import { PrismaService } from '../../../core/database/prisma.service';

describe('FeedRepository', () => {
  let repo: FeedRepository;
  let prisma: {
    $queryRaw: jest.Mock;
    serverMember: { findMany: jest.Mock };
    serverChannel: { findMany: jest.Mock };
    follow: { findMany: jest.Mock };
    channelMessage: { findMany: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      serverMember: { findMany: jest.fn() },
      serverChannel: { findMany: jest.fn() },
      follow: { findMany: jest.fn() },
      channelMessage: { findMany: jest.fn(), findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FeedRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repo = module.get(FeedRepository);
  });

  it('collects server ids for active memberships', async () => {
    prisma.serverMember.findMany.mockResolvedValue([
      { serverId: 'srv-1' },
      { serverId: 'srv-2' },
    ]);

    await expect(repo.findMemberServers('user-1')).resolves.toEqual([
      'srv-1',
      'srv-2',
    ]);
    expect(prisma.serverMember.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', removedAt: null },
      select: { serverId: true },
    });
  });

  it('collects channels for the given servers', async () => {
    prisma.serverChannel.findMany.mockResolvedValue([
      { id: 'ch-1', serverId: 'srv-1', type: 'TEXT' },
    ]);

    const result = await repo.findMemberServerChannels(['srv-1']);

    expect(result).toHaveLength(1);
    expect(prisma.serverChannel.findMany).toHaveBeenCalledWith({
      where: { serverId: { in: ['srv-1'] } },
      select: { id: true, serverId: true, type: true },
    });
  });

  it('collects followed user ids', async () => {
    prisma.follow.findMany.mockResolvedValue([
      { followingId: 'user-2' },
      { followingId: 'user-3' },
    ]);

    await expect(repo.findFollowedUserIds('user-1')).resolves.toEqual([
      'user-2',
      'user-3',
    ]);
  });

  it('executes the raw feed page query', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 'msg-1' }]);

    const result = await repo.findFeedPage({
      channelIds: ['ch-1'],
      take: 26,
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('resolves the composite cursor from a message id', async () => {
    const createdAt = new Date();

    prisma.channelMessage.findUnique.mockResolvedValue({
      id: 'msg-1',
      createdAt,
    });

    await expect(repo.findFeedCursor('msg-1')).resolves.toEqual({
      createdAt,
      id: 'msg-1',
    });
  });

  it('returns null for an unknown cursor message', async () => {
    prisma.channelMessage.findUnique.mockResolvedValue(null);

    await expect(repo.findFeedCursor('missing')).resolves.toBeNull();
  });

  it('hydrates messages with author, channel and server details', async () => {
    prisma.channelMessage.findMany.mockResolvedValue([{ id: 'msg-1' }]);

    await repo.hydrateMessages(['msg-1']);

    expect(prisma.channelMessage.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['msg-1'] } },
      include: {
        author: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        channel: {
          include: {
            server: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  });
});
