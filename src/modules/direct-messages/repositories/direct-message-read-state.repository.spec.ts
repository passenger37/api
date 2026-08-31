import { DirectMessageReadStateRepository } from './direct-message-read-state.repository';

describe('DirectMessageReadStateRepository', () => {
  let repository: DirectMessageReadStateRepository;
  let prisma: {
    directMessageReadState: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    directMessage: {
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      directMessageReadState: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      directMessage: {
        count: jest.fn(),
      },
    };
    repository = new DirectMessageReadStateRepository(prisma as any);
  });

  it('should find a read state by channel and user', async () => {
    prisma.directMessageReadState.findUnique.mockResolvedValue({
      id: 'rs1',
      channelId: 'dm1',
      userId: 'userA',
    });

    const state = await repository.find('dm1', 'userA');

    expect(prisma.directMessageReadState.findUnique).toHaveBeenCalledWith({
      where: {
        channelId_userId: {
          channelId: 'dm1',
          userId: 'userA',
        },
      },
    });
    expect(state).toEqual({ id: 'rs1', channelId: 'dm1', userId: 'userA' });
  });

  it('should upsert a read state cursor', async () => {
    prisma.directMessageReadState.upsert.mockResolvedValue({ id: 'rs1' });
    const cursor = {
      lastReadMessageId: 'm9',
      lastReadAt: new Date('2026-01-02T00:00:00.000Z'),
      unreadCount: 3,
    };

    await repository.upsert('dm1', 'userA', cursor);

    expect(prisma.directMessageReadState.upsert).toHaveBeenCalledWith({
      where: {
        channelId_userId: {
          channelId: 'dm1',
          userId: 'userA',
        },
      },
      create: {
        channel: { connect: { id: 'dm1' } },
        user: { connect: { id: 'userA' } },
        lastReadMessage: { connect: { id: 'm9' } },
        lastReadAt: cursor.lastReadAt,
        unreadCount: 3,
      },
      update: {
        lastReadMessage: { connect: { id: 'm9' } },
        lastReadAt: cursor.lastReadAt,
        unreadCount: 3,
      },
    });
  });

  it('should count unread messages from the other user after the cursor', async () => {
    prisma.directMessage.count.mockResolvedValue(2);
    const cursor = new Date('2026-01-01T00:00:00.000Z');

    const count = await repository.countUnreadAfter('dm1', cursor, 'userA');

    expect(prisma.directMessage.count).toHaveBeenCalledWith({
      where: {
        channelId: 'dm1',
        isDeleted: false,
        authorUserId: { not: 'userA' },
        createdAt: { gt: cursor },
      },
    });
    expect(count).toBe(2);
  });
});
