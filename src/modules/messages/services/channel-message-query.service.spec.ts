import { Test, TestingModule } from '@nestjs/testing';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageRepository } from '../repositories/channel-message.repository';

describe('ChannelMessageQueryService - pagination', () => {
  let service: ChannelMessageQueryService;
  let repository: jest.Mocked<ChannelMessageRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMessageQueryService,
        {
          provide: ChannelMessageRepository,
          useValue: {
            findManyByChannelPaginated: jest.fn(),
            findRepliesPaginated: jest.fn(),
            countReplies: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChannelMessageQueryService>(
      ChannelMessageQueryService,
    );
    repository = module.get(ChannelMessageRepository);
  });

  it('should return items with nextCursor and hasMore when more items exist', async () => {
    const messages = [
      { id: '3', createdAt: new Date() },
      { id: '2', createdAt: new Date() },
      { id: '1', createdAt: new Date() },
    ];
    repository.findManyByChannelPaginated.mockResolvedValue(messages as any);

    const result = await service.getChannelMessagesPaginated(
      'ch-1',
      undefined,
      2,
    );

    expect(repository.findManyByChannelPaginated).toHaveBeenCalledWith(
      'ch-1',
      undefined,
      3,
    );
    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('2');
  });

  it('should return items without nextCursor when no more items', async () => {
    const messages = [
      { id: '2', createdAt: new Date() },
      { id: '1', createdAt: new Date() },
    ];
    repository.findManyByChannelPaginated.mockResolvedValue(messages as any);

    const result = await service.getChannelMessagesPaginated('ch-1', '3', 2);

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it('should paginate replies with cursor and return replyCount', async () => {
    const replies = [
      { id: 'r1', createdAt: new Date() },
      { id: 'r2', createdAt: new Date() },
      { id: 'r3', createdAt: new Date() },
    ];
    repository.findRepliesPaginated.mockResolvedValue(replies as any);
    repository.countReplies.mockResolvedValue(3);

    const result = await service.getThreadRepliesPaginated(
      'parent1',
      undefined,
      2,
    );

    expect(repository.findRepliesPaginated).toHaveBeenCalledWith(
      'parent1',
      undefined,
      3,
    );
    expect(repository.countReplies).toHaveBeenCalledWith('parent1');
    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('r2');
    expect(result.replyCount).toBe(3);
  });

  it('should return replies without nextCursor when exhausted', async () => {
    const replies = [
      { id: 'r1', createdAt: new Date() },
      { id: 'r2', createdAt: new Date() },
    ];
    repository.findRepliesPaginated.mockResolvedValue(replies as any);
    repository.countReplies.mockResolvedValue(2);

    const result = await service.getThreadRepliesPaginated(
      'parent1',
      'cursor',
      2,
    );

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
    expect(result.replyCount).toBe(2);
  });
});
