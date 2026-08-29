import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChannelType, ServerPermission } from '@prisma/client';

import { ChannelMessageSearchService } from './channel-message-search.service';
import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageReactionRepository } from '../repositories/channel-message-reaction.repository';
import { ChannelMentionRepository } from '../repositories/channel-message-mention.repository';
import { ServerChannelQueryService } from '../../servers/services/server-channel-query.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ServerPermissionService } from '../../servers/services/server-permission.service';

describe('ChannelMessageSearchService', () => {
  let service: ChannelMessageSearchService;
  let repository: { searchMessages: jest.Mock };
  let reactionRepository: { countReactionsByMessages: jest.Mock };
  let mentionRepository: { countMentionsByMessages: jest.Mock };
  let channelQueryService: {
    getChannelOrThrow: jest.Mock;
    getServerChannels: jest.Mock;
  };
  let memberQueryService: { getMemberOrThrow: jest.Mock };
  let permissionService: { hasPermission: jest.Mock };

  const baseOptions = { q: 'hello' };

  const message = {
    id: 'msg-1',
    content: 'hello world',
    serverId: 'srv-1',
    channelId: 'ch1',
    authorMemberId: 'member-1',
    parentMessageId: null,
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
    isPinned: false,
    pinnedAt: null,
    clientMessageId: null,
    version: 1,
    messageSeq: 5,
    createdAt: new Date('2026-01-03T00:00:00.000Z'),
    updatedAt: new Date('2026-01-03T00:00:00.000Z'),
  };

  beforeEach(async () => {
    repository = { searchMessages: jest.fn() };
    reactionRepository = { countReactionsByMessages: jest.fn() };
    mentionRepository = { countMentionsByMessages: jest.fn() };
    channelQueryService = {
      getChannelOrThrow: jest.fn(),
      getServerChannels: jest.fn(),
    };
    memberQueryService = { getMemberOrThrow: jest.fn() };
    permissionService = { hasPermission: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMessageSearchService,
        { provide: ChannelMessageRepository, useValue: repository },
        {
          provide: ChannelMessageReactionRepository,
          useValue: reactionRepository,
        },
        { provide: ChannelMentionRepository, useValue: mentionRepository },
        {
          provide: ServerChannelQueryService,
          useValue: channelQueryService,
        },
        { provide: ServerMemberQueryService, useValue: memberQueryService },
        { provide: ServerPermissionService, useValue: permissionService },
      ],
    }).compile();

    service = module.get(ChannelMessageSearchService);
  });

  it('should reject an empty query after trimming', async () => {
    await expect(
      service.search('srv-1', 'user-1', { q: '   ' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject non-members of the server', async () => {
    memberQueryService.getMemberOrThrow.mockRejectedValue(
      new NotFoundException('Member not found.'),
    );

    await expect(
      service.search('srv-1', 'user-1', baseOptions),
    ).rejects.toThrow(NotFoundException);
    expect(repository.searchMessages).not.toHaveBeenCalled();
  });

  it('should require view permission and server ownership for an explicit channel', async () => {
    channelQueryService.getChannelOrThrow.mockResolvedValue({
      id: 'ch2',
      serverId: 'other-server',
      type: ChannelType.TEXT,
    });

    await expect(
      service.search('srv-1', 'user-1', { ...baseOptions, channelId: 'ch2' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should filter to channels the member can view and only message-bearing types', async () => {
    channelQueryService.getServerChannels.mockResolvedValue([
      { id: 'ch-text', type: ChannelType.TEXT },
      { id: 'ch-voice', type: ChannelType.VOICE },
      { id: 'ch-forum', type: ChannelType.FORUM },
      { id: 'ch-hidden', type: ChannelType.TEXT },
    ]);
    permissionService.hasPermission.mockImplementation(
      async (_serverId, _userId, _perm, channelId: string) =>
        channelId !== 'ch-hidden',
    );
    repository.searchMessages.mockResolvedValue([message]);
    reactionRepository.countReactionsByMessages.mockResolvedValue(new Map());
    mentionRepository.countMentionsByMessages.mockResolvedValue(
      new Map([['msg-1', 2]]),
    );

    const result = await service.search('srv-1', 'user-1', baseOptions);

    expect(repository.searchMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        channelIds: ['ch-text', 'ch-forum'],
        query: 'hello',
        take: 26,
      }),
    );
    expect(result.items[0].mentionCount).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  it('should short-circuit when the member has no viewable channels', async () => {
    channelQueryService.getServerChannels.mockResolvedValue([
      { id: 'ch-text', type: ChannelType.TEXT },
    ]);
    permissionService.hasPermission.mockResolvedValue(false);

    const result = await service.search('srv-1', 'user-1', baseOptions);

    expect(result).toEqual({
      items: [],
      nextCursor: undefined,
      hasMore: false,
    });
    expect(repository.searchMessages).not.toHaveBeenCalled();
  });

  it('should return an encoded nextCursor when more items exist', async () => {
    channelQueryService.getChannelOrThrow.mockResolvedValue({
      id: 'ch1',
      serverId: 'srv-1',
      type: ChannelType.TEXT,
    });
    permissionService.hasPermission.mockResolvedValue(true);
    const older = {
      ...message,
      id: 'msg-2',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    repository.searchMessages.mockResolvedValue([message, older]);
    reactionRepository.countReactionsByMessages.mockResolvedValue(new Map());
    mentionRepository.countMentionsByMessages.mockResolvedValue(new Map());

    const result = await service.search('srv-1', 'user-1', {
      ...baseOptions,
      channelId: 'ch1',
      limit: 1,
    });

    expect(result.hasMore).toBe(true);
    expect(repository.searchMessages).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }),
    );
    expect(result.nextCursor).toBe(
      Buffer.from('2026-01-03T00:00:00.000Z|msg-1').toString('base64url'),
    );
  });

  it('should reject a malformed cursor', async () => {
    channelQueryService.getChannelOrThrow.mockResolvedValue({
      id: 'ch1',
      serverId: 'srv-1',
      type: ChannelType.TEXT,
    });
    permissionService.hasPermission.mockResolvedValue(true);

    await expect(
      service.search('srv-1', 'user-1', {
        ...baseOptions,
        channelId: 'ch1',
        cursor: 'not-a-cursor',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should pass http-layer guards and use the CHANNEL_VIEW permission', async () => {
    channelQueryService.getChannelOrThrow.mockResolvedValue({
      id: 'ch1',
      serverId: 'srv-1',
      type: ChannelType.TEXT,
    });
    permissionService.hasPermission.mockResolvedValue(false);

    await expect(
      service.search('srv-1', 'user-1', {
        ...baseOptions,
        channelId: 'ch1',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(permissionService.hasPermission).toHaveBeenCalledWith(
      'srv-1',
      'user-1',
      ServerPermission.CHANNEL_VIEW,
      'ch1',
    );
  });
});
