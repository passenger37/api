import { DirectMessageReactionRepository } from './direct-message-reaction.repository';

describe('DirectMessageReactionRepository', () => {
  let repository: DirectMessageReactionRepository;
  let prisma: {
    directMessageReaction: {
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      directMessageReaction: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
    };
    repository = new DirectMessageReactionRepository(prisma as any);
  });

  it('should add a reaction', async () => {
    await repository.add('m1', 'u1', '🔥');

    expect(prisma.directMessageReaction.create).toHaveBeenCalledWith({
      data: { messageId: 'm1', userId: 'u1', emoji: '🔥' },
    });
  });

  it('should remove a reaction by composite key', async () => {
    await repository.remove('m1', 'u1', '🔥');

    expect(prisma.directMessageReaction.delete).toHaveBeenCalledWith({
      where: {
        messageId_userId_emoji: {
          messageId: 'm1',
          userId: 'u1',
          emoji: '🔥',
        },
      },
    });
  });

  it('should find an existing reaction', async () => {
    await repository.find('m1', 'u1', '🔥');

    expect(prisma.directMessageReaction.findUnique).toHaveBeenCalledWith({
      where: {
        messageId_userId_emoji: {
          messageId: 'm1',
          userId: 'u1',
          emoji: '🔥',
        },
      },
    });
  });

  it('should aggregate reaction counts per message and emoji', async () => {
    prisma.directMessageReaction.groupBy.mockResolvedValue([
      { messageId: 'm1', emoji: '🔥', _count: { _all: 2 } },
      { messageId: 'm1', emoji: '❤️', _count: { _all: 1 } },
      { messageId: 'm2', emoji: '🔥', _count: { _all: 1 } },
    ]);

    const counts = await repository.countReactionsByMessages(['m1', 'm2']);

    expect(counts.get('m1')).toEqual(
      new Map([
        ['🔥', 2],
        ['❤️', 1],
      ]),
    );
    expect(counts.get('m2')).toEqual(new Map([['🔥', 1]]));
    expect(counts.get('m3')).toBeUndefined();
  });

  it('should short-circuit empty message lists', async () => {
    const counts = await repository.countReactionsByMessages([]);

    expect(counts.size).toBe(0);
    expect(prisma.directMessageReaction.groupBy).not.toHaveBeenCalled();
  });

  it('should return the viewers reactions as a set per message', async () => {
    prisma.directMessageReaction.findMany.mockResolvedValue([
      { messageId: 'm1', emoji: '🔥' },
      { messageId: 'm1', emoji: '❤️' },
    ]);

    const viewer = await repository.viewerReactions(['m1'], 'u1');

    expect(viewer.get('m1')).toEqual(new Set(['🔥', '❤️']));
  });
});
