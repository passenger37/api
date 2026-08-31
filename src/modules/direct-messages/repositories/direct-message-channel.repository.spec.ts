import {
  DirectMessageChannelRepository,
  orderPair,
} from './direct-message-channel.repository';

describe('orderPair', () => {
  it('orders the pair canonically so A is lexicographically smaller', () => {
    expect(orderPair('userB', 'userA')).toEqual({
      userAId: 'userA',
      userBId: 'userB',
    });
  });

  it('keeps an already-ordered pair unchanged', () => {
    expect(orderPair('userA', 'userB')).toEqual({
      userAId: 'userA',
      userBId: 'userB',
    });
  });
});

describe('DirectMessageChannelRepository', () => {
  let repository: DirectMessageChannelRepository;
  let prisma: {
    directMessageChannel: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  const channelRow = {
    id: 'dm1',
    userAId: 'userA',
    userBId: 'userB',
    messageCounter: 3,
    lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = {
      directMessageChannel: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new DirectMessageChannelRepository(prisma as any);
  });

  it('should find the pair using canonical ordering', async () => {
    prisma.directMessageChannel.findUnique.mockResolvedValue(channelRow);

    const channel = await repository.findPair('userB', 'userA');

    expect(prisma.directMessageChannel.findUnique).toHaveBeenCalledWith({
      where: {
        userAId_userBId: {
          userAId: 'userA',
          userBId: 'userB',
        },
      },
      include: { userA: true, userB: true },
    });
    expect(channel).toEqual(channelRow);
  });

  it('should create a channel with canonical ordering', async () => {
    prisma.directMessageChannel.create.mockResolvedValue(channelRow);

    await repository.create('userB', 'userA');

    expect(prisma.directMessageChannel.create).toHaveBeenCalledWith({
      data: {
        userAId: 'userA',
        userBId: 'userB',
      },
      include: { userA: true, userB: true },
    });
  });

  it('should list channels for the user with nulls-last ordering on lastMessageAt', async () => {
    prisma.directMessageChannel.findMany.mockResolvedValue([channelRow]);

    await repository.listForUser('userA', undefined, 25);

    expect(prisma.directMessageChannel.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ userAId: 'userA' }, { userBId: 'userA' }],
      },
      orderBy: [
        { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      cursor: undefined,
      skip: 0,
      take: 25,
      include: { userA: true, userB: true },
    });
  });

  it('should skip the cursor row when listing', async () => {
    prisma.directMessageChannel.findMany.mockResolvedValue([]);

    await repository.listForUser('userA', 'dm9', 25);

    expect(prisma.directMessageChannel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'dm9' },
        skip: 1,
        take: 25,
      }),
    );
  });

  it('should increment the counter and touch lastMessageAt in the transaction', async () => {
    prisma.directMessageChannel.update.mockResolvedValue({
      ...channelRow,
      messageCounter: 4,
    });
    const tx = { directMessageChannel: prisma.directMessageChannel } as any;

    const seq = await repository.incrementCounterAndTouch(
      'dm1',
      new Date('2026-01-02T00:00:00.000Z'),
      tx,
    );

    expect(tx.directMessageChannel.update).toHaveBeenCalledWith({
      where: { id: 'dm1' },
      data: {
        messageCounter: { increment: 1 },
        lastMessageAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    });
    expect(seq).toBe(4);
  });
});
