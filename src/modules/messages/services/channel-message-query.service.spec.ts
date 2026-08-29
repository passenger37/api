import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageReactionRepository } from '../repositories/channel-message-reaction.repository';
import { ChannelMessageEditRepository } from '../repositories/channel-message-edit.repository';

describe('ChannelMessageQueryService - pagination', () => {
  let service: ChannelMessageQueryService;
  let repository: jest.Mocked<ChannelMessageRepository>;
  let reactionRepository: jest.Mocked<ChannelMessageReactionRepository>;
  let editRepository: jest.Mocked<ChannelMessageEditRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMessageQueryService,
        {
          provide: ChannelMessageRepository,
          useValue: {
            findById: jest.fn(),
            findManyByChannelPaginated: jest.fn(),
            findRepliesPaginated: jest.fn(),
            countReplies: jest.fn(),
          },
        },
        {
          provide: ChannelMessageReactionRepository,
          useValue: {
            countReactionsByMessages: jest.fn(),
          },
        },
        {
          provide: ChannelMessageEditRepository,
          useValue: {
            findManyByMessagePaginated: jest.fn(),
            countByMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChannelMessageQueryService>(
      ChannelMessageQueryService,
    );
    repository = module.get(ChannelMessageRepository);
    reactionRepository = module.get(ChannelMessageReactionRepository);
    editRepository = module.get(ChannelMessageEditRepository);
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

  it('should enrich one page of items with batched reaction counts', async () => {
    const messages = [
      { id: '3', createdAt: new Date() },
      { id: '2', createdAt: new Date() },
    ];
    repository.findManyByChannelPaginated.mockResolvedValue(messages as any);
    reactionRepository.countReactionsByMessages.mockResolvedValue(
      new Map([
        ['3', new Map([['👍', 2]])],
        ['2', new Map([['❤️', 1]])],
      ]),
    );

    const result = await service.getChannelMessagesWithReactionCounts(
      'ch-1',
      undefined,
      2,
    );

    expect(repository.findManyByChannelPaginated).toHaveBeenCalledWith(
      'ch-1',
      undefined,
      3,
    );
    expect(reactionRepository.countReactionsByMessages).toHaveBeenCalledWith([
      '3',
      '2',
    ]);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].reactionCounts).toEqual({ '👍': 2 });
    expect(result.items[1].reactionCounts).toEqual({ '❤️': 1 });
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it('should default reactionCounts to {} for messages without reactions', async () => {
    const messages = [{ id: '1', createdAt: new Date() }];
    repository.findManyByChannelPaginated.mockResolvedValue(messages as any);
    reactionRepository.countReactionsByMessages.mockResolvedValue(new Map());

    const result = await service.getChannelMessagesWithReactionCounts(
      'ch-1',
      undefined,
      1,
    );

    expect(result.items[0]).toMatchObject({ id: '1', reactionCounts: {} });
  });

  it('should return parent message with paginated enriched replies', async () => {
    const parent = { id: 'parent1', createdAt: new Date() };
    const replies = [
      { id: 'r3', createdAt: new Date() },
      { id: 'r2', createdAt: new Date() },
      { id: 'r1', createdAt: new Date() },
    ];
    repository.findById.mockResolvedValue(parent as any);
    repository.findRepliesPaginated.mockResolvedValue(replies as any);
    repository.countReplies.mockResolvedValue(3);
    reactionRepository.countReactionsByMessages.mockResolvedValue(
      new Map([
        ['r3', new Map([['👍', 2]])],
        ['r2', new Map([['❤️', 1]])],
      ]),
    );

    const result = await service.getThread('parent1', undefined, 2);

    expect(repository.findById).toHaveBeenCalledWith('parent1');
    expect(repository.findRepliesPaginated).toHaveBeenCalledWith(
      'parent1',
      undefined,
      3,
    );
    expect(repository.countReplies).toHaveBeenCalledWith('parent1');
    expect(reactionRepository.countReactionsByMessages).toHaveBeenCalledWith([
      'r3',
      'r2',
    ]);
    expect(result.message).toEqual(parent);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      id: 'r3',
      reactionCounts: { '👍': 2 },
    });
    expect(result.items[1]).toMatchObject({
      id: 'r2',
      reactionCounts: { '❤️': 1 },
    });
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('r2');
    expect(result.replyCount).toBe(3);
  });

  it('should default thread reply reactionCounts to {}', async () => {
    const parent = { id: 'parent1', createdAt: new Date() };
    repository.findById.mockResolvedValue(parent as any);
    repository.findRepliesPaginated.mockResolvedValue([
      { id: 'r1', createdAt: new Date() },
    ] as any);
    repository.countReplies.mockResolvedValue(1);
    reactionRepository.countReactionsByMessages.mockResolvedValue(new Map());

    const result = await service.getThread('parent1', undefined, 1);

    expect(result.items[0]).toMatchObject({ id: 'r1', reactionCounts: {} });
    expect(result.message).toEqual(parent);
    expect(result.replyCount).toBe(1);
  });

  it('should throw NotFoundException when the parent message does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getThread('missing', undefined, 2)).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.findRepliesPaginated).not.toHaveBeenCalled();
  });

  it('should return an edit history page with totalCount', async () => {
    const edits = [
      { id: 'e3', editedAt: new Date(), previousContent: 'second' },
      { id: 'e2', editedAt: new Date(), previousContent: 'first' },
      { id: 'e1', editedAt: new Date(), previousContent: 'original' },
    ];
    repository.findById.mockResolvedValue({ id: 'm1' } as any);
    editRepository.findManyByMessagePaginated.mockResolvedValue(edits as any);
    editRepository.countByMessage.mockResolvedValue(3);

    const result = await service.getEditHistory('m1', undefined, 2);

    expect(repository.findById).toHaveBeenCalledWith('m1');
    expect(editRepository.findManyByMessagePaginated).toHaveBeenCalledWith(
      'm1',
      undefined,
      3,
    );
    expect(editRepository.countByMessage).toHaveBeenCalledWith('m1');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      id: 'e3',
      previousContent: 'second',
    });
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('e2');
    expect(result.totalCount).toBe(3);
  });

  it('should throw NotFoundException for edit history of a missing message', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.getEditHistory('missing', undefined, 2),
    ).rejects.toThrow(NotFoundException);
    expect(editRepository.findManyByMessagePaginated).not.toHaveBeenCalled();
  });
});
