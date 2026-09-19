import { ChannelMessageReactionRepository } from './channel-message-reaction.repository';

describe('ChannelMessageReactionRepository - batched counts', () => {
  let repository: ChannelMessageReactionRepository;
  let prisma: {
    channelMessageReaction: {
      groupBy: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      channelMessageReaction: {
        groupBy: jest.fn(),
      },
    };
    repository = new ChannelMessageReactionRepository(prisma as any);
  });

  it('should return an empty map without calling prisma when no message ids are given', async () => {
    const counts = await repository.countReactionsByMessages([]);

    expect(counts.size).toBe(0);
    expect(prisma.channelMessageReaction.groupBy).not.toHaveBeenCalled();
  });

  it('should group reaction counts by message and emoji in one query', async () => {
    prisma.channelMessageReaction.groupBy.mockResolvedValue([
      { messageId: 'm1', emoji: '👍', _count: { _all: 3 } },
      { messageId: 'm1', emoji: '❤️', _count: { _all: 1 } },
      { messageId: 'm2', emoji: '👍', _count: { _all: 2 } },
    ]);

    const counts = await repository.countReactionsByMessages(['m1', 'm2']);

    expect(prisma.channelMessageReaction.groupBy).toHaveBeenCalledWith({
      by: ['messageId', 'emoji'],
      where: { messageId: { in: ['m1', 'm2'] } },
      _count: { _all: true },
    });
    expect(counts.get('m1')?.get('👍')).toBe(3);
    expect(counts.get('m1')?.get('❤️')).toBe(1);
    expect(counts.get('m2')?.get('👍')).toBe(2);
  });
});
