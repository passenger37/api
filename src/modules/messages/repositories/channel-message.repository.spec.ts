import { ChannelMessageRepository } from './channel-message.repository';
import { PrismaService } from '../../../core/database/prisma.service';

describe('ChannelMessageRepository - Pagination', () => {
  let repository: ChannelMessageRepository;
  let prisma: {
    channelMessage: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      channelMessage: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    repository = new ChannelMessageRepository(prisma as any);
  });

  it('should filter out deleted messages and order by createdAt DESC, id DESC', async () => {
    prisma.channelMessage.findMany.mockResolvedValue([
      { id: 'm1', isDeleted: false },
      { id: 'm2', isDeleted: false },
    ]);

    await repository.findManyByChannelPaginated('ch1', undefined, 2);

    expect(prisma.channelMessage.findMany).toHaveBeenCalledWith({
      where: { channelId: 'ch1', isDeleted: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: undefined,
      skip: 0,
      take: 2,
    });
  });

  it('should use cursor for pagination', async () => {
    prisma.channelMessage.findMany.mockResolvedValue([]);

    await repository.findManyByChannelPaginated('ch1', 'cursor-id', 10);

    expect(prisma.channelMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'cursor-id' },
        skip: 1,
        take: 10,
      }),
    );
  });

  it('should find replies paginated ordered by createdAt asc, id asc', async () => {
    prisma.channelMessage.findMany.mockResolvedValue([]);

    await repository.findRepliesPaginated('parent1', undefined, 10);

    expect(prisma.channelMessage.findMany).toHaveBeenCalledWith({
      where: { parentMessageId: 'parent1', isDeleted: false },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      cursor: undefined,
      skip: 0,
      take: 10,
    });
  });

  it('should count replies', async () => {
    prisma.channelMessage.count.mockResolvedValue(5);

    const count = await repository.countReplies('parent1');

    expect(prisma.channelMessage.count).toHaveBeenCalledWith({
      where: { parentMessageId: 'parent1', isDeleted: false },
    });
    expect(count).toBe(5);
  });
});
