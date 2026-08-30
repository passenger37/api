import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageReactionRepository } from '../repositories/channel-message-reaction.repository';
import { ChannelMessageEditRepository } from '../repositories/channel-message-edit.repository';
import { ChannelMentionRepository } from '../repositories/channel-message-mention.repository';
import { ChannelReadStateRepository } from '../repositories/channel-read-state.repository';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ChannelMessageCacheService } from './channel-message-cache.service';

describe('ChannelMessageQueryService - pagination', () => {
  let service: ChannelMessageQueryService;
  let repository: jest.Mocked<ChannelMessageRepository>;
  let reactionRepository: jest.Mocked<ChannelMessageReactionRepository>;
  let editRepository: jest.Mocked<ChannelMessageEditRepository>;
  let mentionRepository: jest.Mocked<ChannelMentionRepository>;
  let readStateRepository: jest.Mocked<ChannelReadStateRepository>;
  let memberQueryService: { getMemberOrThrow: jest.Mock };
  let cache: {
    getCachedPage: jest.Mock;
    cachePage: jest.Mock;
    getCachedMessagesAfter: jest.Mock;
    cacheMessagesAfter: jest.Mock;
    getCachedThread: jest.Mock;
    cacheThread: jest.Mock;
    getChannelVersion: jest.Mock;
    getCachedUnread: jest.Mock;
    cacheUnread: jest.Mock;
  };

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
            findMessagesAfterCursor: jest.fn(),
            exists: jest.fn(),
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
        {
          provide: ChannelMentionRepository,
          useValue: {
            findByMessage: jest.fn(),
            countMentionsByMessages: jest.fn(),
          },
        },
        {
          provide: ChannelReadStateRepository,
          useValue: {
            findByChannelAndMember: jest.fn(),
            countUnreadAfter: jest.fn(),
          },
        },
        {
          provide: ServerMemberQueryService,
          useValue: {
            getMemberOrThrow: jest.fn(),
          },
        },
        {
          provide: ChannelMessageCacheService,
          useValue: {
            getCachedPage: jest.fn().mockResolvedValue(null),
            cachePage: jest.fn(),
            getCachedMessagesAfter: jest.fn().mockResolvedValue(null),
            cacheMessagesAfter: jest.fn(),
            getCachedThread: jest.fn().mockResolvedValue(null),
            cacheThread: jest.fn(),
            getChannelVersion: jest.fn().mockResolvedValue(0),
            getCachedUnread: jest.fn().mockResolvedValue(null),
            cacheUnread: jest.fn(),
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
    mentionRepository = module.get(ChannelMentionRepository);
    readStateRepository = module.get(ChannelReadStateRepository);
    memberQueryService = module.get(ServerMemberQueryService);
    cache = module.get(ChannelMessageCacheService);
    mentionRepository.countMentionsByMessages.mockResolvedValue(new Map());
    readStateRepository.countUnreadAfter.mockResolvedValue(0);
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

  it('should throw NotFoundException when the message has been deleted', async () => {
    repository.findById.mockResolvedValue({
      id: 'm1',
      isDeleted: true,
      deletedAt: new Date(),
    } as any);

    await expect(service.getMessage('m1')).rejects.toThrow(NotFoundException);
  });

  it('should return a tombstone for a deleted thread parent', async () => {
    const deletedAt = new Date();
    repository.findById.mockResolvedValue({
      id: 'parent1',
      channelId: 'ch-1',
      serverId: 'srv-1',
      isDeleted: true,
      deletedAt,
      content: 'should not leak',
    } as any);
    repository.findRepliesPaginated.mockResolvedValue([
      { id: 'r1', createdAt: new Date() },
    ] as any);
    repository.countReplies.mockResolvedValue(1);
    reactionRepository.countReactionsByMessages.mockResolvedValue(new Map());

    const result = await service.getThread('parent1', undefined, 1);

    expect(result.message).toEqual({
      id: 'parent1',
      channelId: 'ch-1',
      serverId: 'srv-1',
      isDeleted: true,
      deletedAt,
      content: null,
    });
    expect(result.items).toHaveLength(1);
    expect(result.replyCount).toBe(1);
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

  it('should enrich messages with batched mention counts', async () => {
    const messages = [
      { id: '3', createdAt: new Date() },
      { id: '2', createdAt: new Date() },
    ];
    repository.findManyByChannelPaginated.mockResolvedValue(messages as any);
    reactionRepository.countReactionsByMessages.mockResolvedValue(new Map());
    mentionRepository.countMentionsByMessages.mockResolvedValue(
      new Map([
        ['3', 2],
        ['2', 0],
      ]),
    );

    const result = await service.getChannelMessagesWithReactionCounts(
      'ch-1',
      undefined,
      2,
    );

    expect(mentionRepository.countMentionsByMessages).toHaveBeenCalledWith([
      '3',
      '2',
    ]);
    expect(result.items[0]).toMatchObject({ id: '3', mentionCount: 2 });
    expect(result.items[1]).toMatchObject({ id: '2', mentionCount: 0 });
  });

  it('should register mentionCount on enriched thread replies', async () => {
    const parent = { id: 'parent1', createdAt: new Date() };
    repository.findById.mockResolvedValue(parent as any);
    repository.findRepliesPaginated.mockResolvedValue([
      { id: 'r1', createdAt: new Date() },
    ] as any);
    repository.countReplies.mockResolvedValue(1);
    reactionRepository.countReactionsByMessages.mockResolvedValue(new Map());
    mentionRepository.countMentionsByMessages.mockResolvedValue(
      new Map([['r1', 5]]),
    );

    const result = await service.getThread('parent1', undefined, 1);

    expect(result.items[0]).toMatchObject({ id: 'r1', mentionCount: 5 });
  });

  it('should return the mention records for a message', async () => {
    repository.findById.mockResolvedValue({ id: 'm1' } as any);
    const mentions = [
      { id: 'mention-1', mentionType: 'MEMBER', targetMemberId: 'member-2' },
    ];
    mentionRepository.findByMessage.mockResolvedValue(mentions as any);

    const result = await service.getMessageMentions('m1');

    expect(repository.findById).toHaveBeenCalledWith('m1');
    expect(mentionRepository.findByMessage).toHaveBeenCalledWith('m1');
    expect(result).toEqual(mentions);
  });

  it('should throw NotFoundException for mentions of a deleted message', async () => {
    repository.findById.mockResolvedValue({
      id: 'm1',
      isDeleted: true,
      deletedAt: new Date(),
    } as any);

    await expect(service.getMessageMentions('m1')).rejects.toThrow(
      NotFoundException,
    );
    expect(mentionRepository.findByMessage).not.toHaveBeenCalled();
  });

  it('should return the read state with a derived unread count', async () => {
    const lastReadAt = new Date('2026-08-29T00:00:00Z');
    memberQueryService.getMemberOrThrow.mockResolvedValue({
      id: 'member-1',
    });
    readStateRepository.findByChannelAndMember.mockResolvedValue({
      lastReadMessageId: 'msg-5',
      lastReadAt,
    } as any);
    readStateRepository.countUnreadAfter.mockResolvedValue(7);

    const result = await service.getChannelReadState('srv-1', 'ch-1', 'user-1');

    expect(memberQueryService.getMemberOrThrow).toHaveBeenCalledWith(
      'srv-1',
      'user-1',
    );
    expect(readStateRepository.findByChannelAndMember).toHaveBeenCalledWith(
      'ch-1',
      'member-1',
    );
    expect(readStateRepository.countUnreadAfter).toHaveBeenCalledWith(
      'ch-1',
      lastReadAt,
    );
    expect(result).toEqual({
      channelId: 'ch-1',
      lastReadMessageId: 'msg-5',
      lastReadAt,
      unreadCount: 7,
    });
  });

  it('should default to counting all messages when no read cursor exists', async () => {
    memberQueryService.getMemberOrThrow.mockResolvedValue({
      id: 'member-1',
    });
    readStateRepository.findByChannelAndMember.mockResolvedValue(null);
    readStateRepository.countUnreadAfter.mockResolvedValue(14);

    const result = await service.getChannelReadState('srv-1', 'ch-1', 'user-1');

    expect(readStateRepository.countUnreadAfter).toHaveBeenCalledWith(
      'ch-1',
      null,
    );
    expect(result).toEqual({
      channelId: 'ch-1',
      lastReadMessageId: null,
      lastReadAt: null,
      unreadCount: 14,
    });
  });
});

describe('ChannelMessageQueryService - reconnect sync', () => {
  let service: ChannelMessageQueryService;
  let repository: jest.Mocked<ChannelMessageRepository>;
  let reactionRepository: jest.Mocked<ChannelMessageReactionRepository>;
  let mentionRepository: jest.Mocked<ChannelMentionRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMessageQueryService,
        {
          provide: ChannelMessageRepository,
          useValue: {
            findById: jest.fn(),
            findMessagesAfterCursor: jest.fn(),
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
        {
          provide: ChannelMentionRepository,
          useValue: {
            countMentionsByMessages: jest.fn(),
          },
        },
        {
          provide: ChannelReadStateRepository,
          useValue: {
            findByChannelAndMember: jest.fn(),
            countUnreadAfter: jest.fn(),
          },
        },
        {
          provide: ServerMemberQueryService,
          useValue: {
            getMemberOrThrow: jest.fn(),
          },
        },
        {
          provide: ChannelMessageCacheService,
          useValue: {
            getCachedPage: jest.fn().mockResolvedValue(null),
            cachePage: jest.fn(),
            getCachedMessagesAfter: jest.fn().mockResolvedValue(null),
            cacheMessagesAfter: jest.fn(),
            getCachedThread: jest.fn().mockResolvedValue(null),
            cacheThread: jest.fn(),
            getChannelVersion: jest.fn().mockResolvedValue(0),
            getCachedUnread: jest.fn().mockResolvedValue(null),
            cacheUnread: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChannelMessageQueryService>(
      ChannelMessageQueryService,
    );
    repository = module.get(ChannelMessageRepository);
    reactionRepository = module.get(ChannelMessageReactionRepository);
    mentionRepository = module.get(ChannelMentionRepository);
  });

  it('should throw NotFound when the anchor message is missing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getMessageById('missing')).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.findById).toHaveBeenCalledWith('missing');
  });

  it('should return the anchor message when it exists', async () => {
    repository.findById.mockResolvedValue({
      id: 'anchor-1',
      channelId: 'ch-1',
    } as any);

    const result = await service.getMessageById('anchor-1');

    expect(result).toEqual({ id: 'anchor-1', channelId: 'ch-1' });
  });

  it('should fetch the gap, enrich it and keep ascending order', async () => {
    repository.findMessagesAfterCursor.mockResolvedValue([
      { id: 'm2', channelId: 'ch-1' },
      { id: 'm3', channelId: 'ch-1' },
    ] as any);
    reactionRepository.countReactionsByMessages.mockResolvedValue(
      new Map([
        ['m2', new Map([['wow', 1]])],
        ['m3', new Map()],
      ]),
    );
    mentionRepository.countMentionsByMessages.mockResolvedValue(
      new Map([
        ['m2', 1],
        ['m3', 0],
      ]),
    );

    const result = await service.getMessagesAfterInChannel('ch-1', 'm1', 50);

    expect(repository.findMessagesAfterCursor).toHaveBeenCalledWith(
      'ch-1',
      'm1',
      50,
    );
    expect(reactionRepository.countReactionsByMessages).toHaveBeenCalledWith([
      'm2',
      'm3',
    ]);
    expect(result).toEqual([
      {
        id: 'm2',
        channelId: 'ch-1',
        reactionCounts: { wow: 1 },
        mentionCount: 1,
      },
      {
        id: 'm3',
        channelId: 'ch-1',
        reactionCounts: {},
        mentionCount: 0,
      },
    ]);
  });
});
