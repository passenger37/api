import { ChannelMentionRepository } from './channel-message-mention.repository';

describe('ChannelMentionRepository', () => {
  let repository: ChannelMentionRepository;
  let prisma: {
    channelMention: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      channelMention: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
    };
    repository = new ChannelMentionRepository(prisma as any);
  });

  it('should skip creating mention rows when none are resolved', async () => {
    await repository.createMany('m1', 's1', 'c1', []);

    expect(prisma.channelMention.createMany).not.toHaveBeenCalled();
  });

  it('should create mention rows for resolved mentions', async () => {
    prisma.channelMention.createMany.mockResolvedValue({ count: 2 });

    await repository.createMany('m1', 's1', 'c1', [
      {
        mentionType: 'MEMBER',
        targetMemberId: 'member-2',
        targetRoleId: null,
      },
      {
        mentionType: 'EVERYONE',
        targetMemberId: null,
        targetRoleId: null,
      },
    ] as any);

    expect(prisma.channelMention.createMany).toHaveBeenCalledWith({
      data: [
        {
          messageId: 'm1',
          serverId: 's1',
          channelId: 'c1',
          mentionType: 'MEMBER',
          targetMemberId: 'member-2',
          targetRoleId: null,
        },
        {
          messageId: 'm1',
          serverId: 's1',
          channelId: 'c1',
          mentionType: 'EVERYONE',
          targetMemberId: null,
          targetRoleId: null,
        },
      ],
    });
  });

  it('should pass a transaction client when provided', async () => {
    const tx = { channelMention: { createMany: jest.fn() } };

    await repository.createMany(
      'm1',
      's1',
      'c1',
      [
        {
          mentionType: 'MEMBER',
          targetMemberId: 'member-2',
          targetRoleId: null,
        },
      ] as any,
      tx as any,
    );

    expect(prisma.channelMention.createMany).not.toHaveBeenCalled();
    expect(tx.channelMention.createMany).toHaveBeenCalledTimes(1);
  });

  it('should delete all mention rows for a message', async () => {
    prisma.channelMention.deleteMany.mockResolvedValue({ count: 3 });

    await repository.deleteManyByMessage('m1');

    expect(prisma.channelMention.deleteMany).toHaveBeenCalledWith({
      where: { messageId: 'm1' },
    });
  });

  it('should return the mention rows for a message ordered by creation', async () => {
    prisma.channelMention.findMany.mockResolvedValue([{ id: 'mn1' }]);

    await repository.findByMessage('m1');

    expect(prisma.channelMention.findMany).toHaveBeenCalledWith({
      where: { messageId: 'm1' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('should return an empty map when no messages are passed', async () => {
    const counts = await repository.countMentionsByMessages([]);

    expect(counts.size).toBe(0);
    expect(prisma.channelMention.groupBy).not.toHaveBeenCalled();
  });

  it('should batch count mentions per message', async () => {
    prisma.channelMention.groupBy.mockResolvedValue([
      { messageId: 'm1', _count: { _all: 2 } },
      { messageId: 'm2', _count: { _all: 5 } },
    ]);

    const counts = await repository.countMentionsByMessages(['m1', 'm2']);

    expect(prisma.channelMention.groupBy).toHaveBeenCalledWith({
      by: ['messageId'],
      where: { messageId: { in: ['m1', 'm2'] } },
      _count: { _all: true },
    });
    expect(counts.get('m1')).toBe(2);
    expect(counts.get('m2')).toBe(5);
  });
});
