import { DirectMessageRepository } from './direct-message.repository';

describe('DirectMessageRepository', () => {
  let repository: DirectMessageRepository;
  let prisma: {
    directMessage: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  const messageRow = {
    id: 'm1',
    channelId: 'dm1',
    authorUserId: 'userA',
    content: 'hello',
    isDeleted: false,
  };

  beforeEach(() => {
    prisma = {
      directMessage: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new DirectMessageRepository(prisma as any);
  });

  it('should create a message', async () => {
    prisma.directMessage.create.mockResolvedValue(messageRow);
    const data = { channel: { connect: { id: 'dm1' } }, content: 'hi' };

    const created = await repository.create(data as any);

    expect(prisma.directMessage.create).toHaveBeenCalledWith({ data });
    expect(created).toEqual(messageRow);
  });

  it('should find a message by client id and author', async () => {
    prisma.directMessage.findFirst.mockResolvedValue(messageRow);

    const found = await repository.findByClientMessageId('client-1', 'userA');

    expect(prisma.directMessage.findFirst).toHaveBeenCalledWith({
      where: {
        clientMessageId: 'client-1',
        authorUserId: 'userA',
      },
    });
    expect(found).toEqual(messageRow);
  });

  it('should paginate history descending and exclude deleted', async () => {
    prisma.directMessage.findMany.mockResolvedValue([messageRow]);

    await repository.findPage('dm1', 'm9', 25);

    expect(prisma.directMessage.findMany).toHaveBeenCalledWith({
      where: { channelId: 'dm1', isDeleted: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: { id: 'm9' },
      skip: 1,
      take: 25,
    });
  });

  it('should return messages after a given cursor ascending', async () => {
    prisma.directMessage.findMany.mockResolvedValue([messageRow]);

    await repository.findAfter('dm1', 'm0', 25);

    expect(prisma.directMessage.findMany).toHaveBeenCalledWith({
      where: { channelId: 'dm1', isDeleted: false },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      cursor: { id: 'm0' },
      skip: 1,
      take: 25,
    });
  });

  it('should find the latest message by seq for read cursoring', async () => {
    prisma.directMessage.findFirst.mockResolvedValue(messageRow);

    const latest = await repository.findLatestForRead('dm1');

    expect(prisma.directMessage.findFirst).toHaveBeenCalledWith({
      where: { channelId: 'dm1', isDeleted: false },
      orderBy: [{ messageSeq: 'desc' }],
    });
    expect(latest).toEqual(messageRow);
  });

  it('should soft delete', async () => {
    prisma.directMessage.update.mockResolvedValue({
      ...messageRow,
      isDeleted: true,
    });

    const result = await repository.softDelete('m1');

    expect(prisma.directMessage.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: {
        isDeleted: true,
        deletedAt: expect.any(Date),
      },
    });
    expect(result.isDeleted).toBe(true);
  });
});
