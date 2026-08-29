import { ChannelReadStateRepository } from './channel-read-state.repository';

describe('ChannelReadStateRepository', () => {
  let repository: ChannelReadStateRepository;
  let prisma: {
    channelReadState: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    channelMessage: {
      count: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      channelReadState: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      channelMessage: {
        count: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    repository = new ChannelReadStateRepository(prisma as any);
  });

  it('should fetch the read state for a channel and member', async () => {
    prisma.channelReadState.findUnique.mockResolvedValue({ id: 'rs1' });

    await repository.findByChannelAndMember('ch-1', 'member-1');

    expect(prisma.channelReadState.findUnique).toHaveBeenCalledWith({
      where: {
        channelId_memberId: {
          channelId: 'ch-1',
          memberId: 'member-1',
        },
      },
    });
  });

  it('should upsert the read cursor for a channel and member', async () => {
    prisma.channelReadState.upsert.mockResolvedValue({ id: 'rs1' });

    const data = {
      lastReadMessageId: 'msg-5',
      lastReadAt: new Date(),
    };

    await repository.upsert('ch-1', 'member-1', data);

    expect(prisma.channelReadState.upsert).toHaveBeenCalledWith({
      where: {
        channelId_memberId: {
          channelId: 'ch-1',
          memberId: 'member-1',
        },
      },
      create: {
        channelId: 'ch-1',
        memberId: 'member-1',
        ...data,
      },
      update: {
        ...data,
      },
    });
  });

  it('should pass a transaction client when provided', async () => {
    const tx = { channelReadState: { upsert: jest.fn() } };

    await repository.upsert(
      'ch-1',
      'member-1',
      { lastReadMessageId: 'msg-1', lastReadAt: new Date() },
      tx as any,
    );

    expect(prisma.channelReadState.upsert).not.toHaveBeenCalled();
    expect(tx.channelReadState.upsert).toHaveBeenCalledTimes(1);
  });

  it('should count all visible messages when no read anchor exists', async () => {
    prisma.channelMessage.count.mockResolvedValue(12);

    const count = await repository.countUnreadAfter('ch-1', null);

    expect(prisma.channelMessage.count).toHaveBeenCalledWith({
      where: {
        channelId: 'ch-1',
        isDeleted: false,
      },
    });
    expect(count).toBe(12);
  });

  it('should count messages created after the read anchor', async () => {
    const anchor = new Date('2026-08-29T00:00:00Z');
    prisma.channelMessage.count.mockResolvedValue(4);

    const count = await repository.countUnreadAfter('ch-1', anchor);

    expect(prisma.channelMessage.count).toHaveBeenCalledWith({
      where: {
        channelId: 'ch-1',
        isDeleted: false,
        createdAt: { gt: anchor },
      },
    });
    expect(count).toBe(4);
  });

  it('should find the newest visible message in a channel', async () => {
    prisma.channelMessage.findFirst.mockResolvedValue({ id: 'msg-9' });

    await repository.findLatestMessage('ch-1');

    expect(prisma.channelMessage.findFirst).toHaveBeenCalledWith({
      where: {
        channelId: 'ch-1',
        isDeleted: false,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  });
});
