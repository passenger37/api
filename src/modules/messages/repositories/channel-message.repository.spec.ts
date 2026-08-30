import { ChannelMessageRepository } from './channel-message.repository';
import { PrismaService } from '../../../core/database/prisma.service';

describe('ChannelMessageRepository', () => {
  let repository: ChannelMessageRepository;
  let prisma: {
    channelMessage: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      channelMessage: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };
    repository = new ChannelMessageRepository(prisma as any);
  });

  it('should run the search query with the given cursor and take', async () => {
    prisma.$queryRaw.mockResolvedValue([{ id: 'm1', content: 'hello' }]);

    const rows = await repository.searchMessages({
      channelIds: ['ch1', 'ch2'],
      query: 'hello world',
      authorMemberId: 'member-1',
      after: new Date('2026-01-01T00:00:00.000Z'),
      cursor: { createdAt: new Date('2026-01-02T00:00:00.000Z'), id: 'm9' },
      take: 26,
    });

    expect(rows).toEqual([{ id: 'm1', content: 'hello' }]);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = prisma.$queryRaw.mock.calls[0][0] as {
      text: string;
      values: unknown[];
    };
    expect(sql.text).toContain('FROM "ChannelMessage" m');
    expect(sql.text).toContain('m."searchVector" @@ plainto_tsquery');
    expect(sql.text).toContain('ORDER BY m."createdAt" DESC, m.id DESC');
    expect(sql.text).toContain('m."channelId" IN');
    expect(sql.text).toContain('m."authorMemberId" = ');
    expect(sql.text).toContain('(m."createdAt", m.id) <');
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
      include: {
        attachments: { orderBy: { createdAt: 'asc' } },
      },
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
      include: {
        attachments: { orderBy: { createdAt: 'asc' } },
      },
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

  it('should fetch the gap after a cursor in ascending order', async () => {
    prisma.channelMessage.findMany.mockResolvedValue([]);

    await repository.findMessagesAfterCursor('ch1', 'anchor-1', 50);

    expect(prisma.channelMessage.findMany).toHaveBeenCalledWith({
      where: { channelId: 'ch1' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      cursor: { id: 'anchor-1' },
      skip: 1,
      take: 50,
      include: {
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
  });
});
