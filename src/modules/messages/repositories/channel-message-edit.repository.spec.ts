import { ChannelMessageEditRepository } from './channel-message-edit.repository';

describe('ChannelMessageEditRepository', () => {
  let repository: ChannelMessageEditRepository;
  let prisma: {
    channelMessageEdit: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      channelMessageEdit: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    repository = new ChannelMessageEditRepository(prisma as any);
  });

  it('should create an edit record with the given data', async () => {
    const data = {
      message: { connect: { id: 'm1' } },
      previousContent: 'old content',
      editedAt: new Date(),
      editedBy: { connect: { id: 'member-1' } },
    };
    prisma.channelMessageEdit.create.mockResolvedValue({ id: 'e1' });

    const result = await repository.create(data);

    expect(prisma.channelMessageEdit.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual({ id: 'e1' });
  });

  it('should pass a transaction client when provided', async () => {
    const tx = { channelMessageEdit: { create: jest.fn() } };
    prisma.channelMessageEdit.create.mockResolvedValue({ id: 'e1' });

    await repository.create({ previousContent: 'old' } as any, tx as any);

    expect(prisma.channelMessageEdit.create).not.toHaveBeenCalled();
    expect(tx.channelMessageEdit.create).toHaveBeenCalledWith({
      data: { previousContent: 'old' },
    });
  });

  it('should paginate edits by message with cursor skip', async () => {
    prisma.channelMessageEdit.findMany.mockResolvedValue([{ id: 'e2' }]);

    await repository.findManyByMessagePaginated('m1', 'e1', 3);

    expect(prisma.channelMessageEdit.findMany).toHaveBeenCalledWith({
      where: { messageId: 'm1' },
      orderBy: [{ editedAt: 'desc' }, { id: 'desc' }],
      cursor: { id: 'e1' },
      skip: 1,
      take: 3,
    });
  });

  it('should paginate edits without a cursor', async () => {
    prisma.channelMessageEdit.findMany.mockResolvedValue([{ id: 'e1' }]);

    await repository.findManyByMessagePaginated('m1', undefined, 50);

    expect(prisma.channelMessageEdit.findMany).toHaveBeenCalledWith({
      where: { messageId: 'm1' },
      orderBy: [{ editedAt: 'desc' }, { id: 'desc' }],
      cursor: undefined,
      skip: 0,
      take: 50,
    });
  });

  it('should count edits for a message', async () => {
    prisma.channelMessageEdit.count.mockResolvedValue(7);

    const count = await repository.countByMessage('m1');

    expect(prisma.channelMessageEdit.count).toHaveBeenCalledWith({
      where: { messageId: 'm1' },
    });
    expect(count).toBe(7);
  });
});
