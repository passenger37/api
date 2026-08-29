import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ChannelMessageCommandService } from './channel-message-command.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageEditRepository } from '../repositories/channel-message-edit.repository';
import { ChannelMentionRepository } from '../repositories/channel-message-mention.repository';
import { ChannelReadStateRepository } from '../repositories/channel-read-state.repository';
import { ChannelMentionResolver } from './channel-mention-resolver.service';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageGateway } from '../gateways/channel-message.gateway';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';

describe('ChannelMessageCommandService - mentions', () => {
  let service: ChannelMessageCommandService;
  let prisma: { $transaction: jest.Mock };
  let repository: {
    create: jest.Mock;
    update: jest.Mock;
    findById: jest.Mock;
    findByClientMessageId: jest.Mock;
  };
  let editRepository: { create: jest.Mock };
  let mentionRepository: {
    createMany: jest.Mock;
    deleteManyByMessage: jest.Mock;
  };
  let mentionResolver: { resolve: jest.Mock };
  let readStateRepository: {
    findByChannelAndMember: jest.Mock;
    upsert: jest.Mock;
    countUnreadAfter: jest.Mock;
    findLatestMessage: jest.Mock;
  };
  let queryService: { getMessage: jest.Mock };
  let memberQueryService: { getMemberOrThrow: jest.Mock };
  let validation: {
    validateContent: jest.Mock;
    validateSendPermission: jest.Mock;
    validateParentMessage: jest.Mock;
    validateEditPermission: jest.Mock;
    validateChannelAccess: jest.Mock;
  };

  beforeEach(async () => {
    const tx = {};
    prisma = { $transaction: jest.fn(async (callback) => callback(tx)) };
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByClientMessageId: jest.fn(),
    };
    editRepository = { create: jest.fn() };
    mentionRepository = {
      createMany: jest.fn(),
      deleteManyByMessage: jest.fn(),
    };
    mentionResolver = { resolve: jest.fn(async () => []) };
    readStateRepository = {
      findByChannelAndMember: jest.fn(),
      upsert: jest.fn(),
      countUnreadAfter: jest.fn(),
      findLatestMessage: jest.fn(),
    };
    queryService = { getMessage: jest.fn() };
    memberQueryService = { getMemberOrThrow: jest.fn() };
    validation = {
      validateContent: jest.fn(),
      validateSendPermission: jest.fn(),
      validateParentMessage: jest.fn(),
      validateEditPermission: jest.fn(),
      validateChannelAccess: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMessageCommandService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChannelMessageRepository, useValue: repository },
        { provide: ChannelMessageEditRepository, useValue: editRepository },
        { provide: ChannelMentionRepository, useValue: mentionRepository },
        { provide: ChannelReadStateRepository, useValue: readStateRepository },
        { provide: ChannelMentionResolver, useValue: mentionResolver },
        { provide: ChannelMessageValidationService, useValue: validation },
        { provide: ChannelMessageQueryService, useValue: queryService },
        { provide: ChannelMessageGateway, useValue: {} },
        { provide: ServerMemberQueryService, useValue: memberQueryService },
      ],
    }).compile();

    service = module.get<ChannelMessageCommandService>(
      ChannelMessageCommandService,
    );
  });

  describe('createMessage', () => {
    it('should persist resolved mentions inside the same transaction', async () => {
      validation.validateSendPermission.mockResolvedValue({
        id: 'channel-1',
        serverId: 'srv-1',
      });
      memberQueryService.getMemberOrThrow.mockResolvedValue({
        id: 'member-1',
      });

      const mentions = [
        {
          mentionType: 'MEMBER',
          targetMemberId: 'member-2',
          targetRoleId: null,
        },
      ];

      mentionResolver.resolve.mockResolvedValue(mentions);

      repository.create.mockResolvedValue({ id: 'msg-1' });
      const tx = {};

      prisma.$transaction.mockImplementation(async (callback) => callback(tx));

      const result = await service.createMessage(
        'channel-1',
        'user-1',
        'hello @alice',
      );

      expect(mentionResolver.resolve).toHaveBeenCalledWith(
        'hello @alice',
        'srv-1',
        'channel-1',
        'user-1',
      );
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(mentionRepository.createMany).toHaveBeenCalledWith(
        'msg-1',
        'srv-1',
        'channel-1',
        mentions,
        tx,
      );
      expect(result).toEqual({ message: { id: 'msg-1' }, deduplicated: false });
    });

    it('should call createMany with no mention rows when none are resolved', async () => {
      validation.validateSendPermission.mockResolvedValue({
        id: 'channel-1',
        serverId: 'srv-1',
      });
      memberQueryService.getMemberOrThrow.mockResolvedValue({
        id: 'member-1',
      });
      repository.create.mockResolvedValue({ id: 'msg-1' });

      await service.createMessage('channel-1', 'user-1', 'plain text');

      expect(mentionRepository.createMany).toHaveBeenCalledWith(
        'msg-1',
        'srv-1',
        'channel-1',
        [],
        expect.anything(),
      );
    });

    it('should return the existing message without re-creating on retry', async () => {
      validation.validateSendPermission.mockResolvedValue({
        id: 'channel-1',
        serverId: 'srv-1',
      });
      memberQueryService.getMemberOrThrow.mockResolvedValue({
        id: 'member-1',
      });
      repository.findByClientMessageId.mockResolvedValue({
        id: 'msg-1',
        content: 'hello',
      });

      const result = await service.createMessage(
        'channel-1',
        'user-1',
        'hello',
        undefined,
        'client-1',
      );

      expect(repository.findByClientMessageId).toHaveBeenCalledWith(
        'client-1',
        'member-1',
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: { id: 'msg-1', content: 'hello' },
        deduplicated: true,
      });
    });

    it('should persist clientMessageId with the new message', async () => {
      validation.validateSendPermission.mockResolvedValue({
        id: 'channel-1',
        serverId: 'srv-1',
      });
      memberQueryService.getMemberOrThrow.mockResolvedValue({
        id: 'member-1',
      });
      repository.create.mockResolvedValue({ id: 'msg-1' });
      const tx = {};

      prisma.$transaction.mockImplementation(async (callback) => callback(tx));

      await service.createMessage(
        'channel-1',
        'user-1',
        'hello',
        undefined,
        'client-1',
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ clientMessageId: 'client-1' }),
        tx,
      );
    });

    it('should recover from a unique violation by returning the existing message', async () => {
      validation.validateSendPermission.mockResolvedValue({
        id: 'channel-1',
        serverId: 'srv-1',
      });
      memberQueryService.getMemberOrThrow.mockResolvedValue({
        id: 'member-1',
      });
      repository.findByClientMessageId.mockResolvedValue({
        id: 'msg-1',
      });
      prisma.$transaction.mockImplementation(async () => {
        throw new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed',
          { code: 'P2002', clientVersion: '6.16.3' },
        );
      });

      const result = await service.createMessage(
        'channel-1',
        'user-1',
        'hello',
        undefined,
        'client-1',
      );

      expect(result).toEqual({
        message: { id: 'msg-1' },
        deduplicated: true,
      });
    });
  });

  describe('editMessage', () => {
    it('should write a history snapshot and replace mention records', async () => {
      queryService.getMessage.mockResolvedValue({
        id: 'msg-1',
        content: 'old content',
        serverId: 'srv-1',
        channelId: 'channel-1',
        authorMemberId: 'member-1',
        version: 1,
      });
      memberQueryService.getMemberOrThrow.mockResolvedValue({
        id: 'member-1',
      });
      repository.update.mockResolvedValue({
        id: 'msg-1',
        content: 'new content',
        version: 2,
      });

      const mentions = [
        {
          mentionType: 'ROLE',
          targetMemberId: null,
          targetRoleId: 'role-1',
        },
      ];

      mentionResolver.resolve.mockResolvedValue(mentions);
      const tx = {};

      prisma.$transaction.mockImplementation(async (callback) => callback(tx));

      const result = await service.editMessage(
        'msg-1',
        'user-1',
        'new content',
      );

      expect(validation.validateContent).toHaveBeenCalledWith('new content');
      expect(queryService.getMessage).toHaveBeenCalledWith('msg-1');
      expect(memberQueryService.getMemberOrThrow).toHaveBeenCalledWith(
        'srv-1',
        'user-1',
      );
      expect(validation.validateEditPermission).toHaveBeenCalledWith(
        'member-1',
        'member-1',
        'srv-1',
        'user-1',
      );
      expect(mentionResolver.resolve).toHaveBeenCalledWith(
        'new content',
        'srv-1',
        'channel-1',
        'user-1',
      );
      expect(mentionRepository.deleteManyByMessage).toHaveBeenCalledWith(
        'msg-1',
        tx,
      );
      expect(mentionRepository.createMany).toHaveBeenCalledWith(
        'msg-1',
        'srv-1',
        'channel-1',
        mentions,
        tx,
      );
      expect(repository.update).toHaveBeenCalledWith(
        'msg-1',
        {
          content: 'new content',
          isEdited: true,
          editedAt: expect.any(Date),
          version: { increment: 1 },
        },
        tx,
      );
      expect(result).toEqual({
        id: 'msg-1',
        content: 'new content',
        version: 2,
      });
    });

    it('should reject a stale edit when expectedVersion does not match', async () => {
      queryService.getMessage.mockResolvedValue({
        id: 'msg-1',
        content: 'newer content',
        serverId: 'srv-1',
        channelId: 'channel-1',
        authorMemberId: 'member-1',
        version: 2,
      });
      memberQueryService.getMemberOrThrow.mockResolvedValue({
        id: 'member-1',
      });

      await expect(
        service.editMessage('msg-1', 'user-1', 'new content', 1),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should not persist anything if the transaction rolls back', async () => {
      queryService.getMessage.mockResolvedValue({
        id: 'msg-1',
        content: 'old content',
        serverId: 'srv-1',
        channelId: 'channel-1',
        authorMemberId: 'member-1',
      });
      memberQueryService.getMemberOrThrow.mockResolvedValue({
        id: 'member-1',
      });
      prisma.$transaction.mockImplementation(async (callback) => {
        await callback({});
        throw new Error('rollback');
      });

      await expect(
        service.editMessage('msg-1', 'user-1', 'new content'),
      ).rejects.toThrow('rollback');
    });
  });

  describe('markChannelRead', () => {
    beforeEach(() => {
      validation.validateChannelAccess.mockResolvedValue({
        channel: { id: 'channel-1', serverId: 'srv-1' },
        member: { id: 'member-1' },
      });
      readStateRepository.countUnreadAfter.mockResolvedValue(3);
      readStateRepository.findByChannelAndMember.mockResolvedValue(null);
    });

    it('should advance the cursor to an in-channel message', async () => {
      const createdAt = new Date('2026-08-29T00:00:00Z');
      repository.findById.mockResolvedValue({
        id: 'msg-5',
        channelId: 'channel-1',
        createdAt,
      });
      readStateRepository.upsert.mockResolvedValue({
        lastReadMessageId: 'msg-5',
        lastReadAt: createdAt,
      });

      const result = await service.markChannelRead(
        'channel-1',
        'user-1',
        'msg-5',
      );

      expect(validation.validateChannelAccess).toHaveBeenCalledWith(
        'channel-1',
        'user-1',
      );
      expect(repository.findById).toHaveBeenCalledWith('msg-5');
      expect(readStateRepository.upsert).toHaveBeenCalledWith(
        'channel-1',
        'member-1',
        {
          lastReadMessageId: 'msg-5',
          lastReadAt: createdAt,
        },
      );
      expect(result).toEqual({
        channelId: 'channel-1',
        lastReadMessageId: 'msg-5',
        lastReadAt: createdAt,
        unreadCount: 3,
      });
    });

    it('should reject a read cursor for a message in another channel', async () => {
      repository.findById.mockResolvedValue({
        id: 'msg-5',
        channelId: 'other-channel',
        createdAt: new Date(),
      });

      await expect(
        service.markChannelRead('channel-1', 'user-1', 'msg-5'),
      ).rejects.toThrow('belongs to another channel');
    });

    it('should reject an unknown read cursor message', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.markChannelRead('channel-1', 'user-1', 'ghost'),
      ).rejects.toThrow('unknown message');
    });

    it('should not regress an existing forward cursor', async () => {
      const older = new Date('2026-08-29T00:00:00Z');
      repository.findById.mockResolvedValue({
        id: 'msg-2',
        channelId: 'channel-1',
        createdAt: older,
      });
      readStateRepository.findByChannelAndMember.mockResolvedValue({
        lastReadMessageId: 'msg-9',
        lastReadAt: new Date('2026-08-29T01:00:00Z'),
      });

      const result = await service.markChannelRead(
        'channel-1',
        'user-1',
        'msg-2',
      );

      expect(readStateRepository.upsert).not.toHaveBeenCalled();
      expect(result).toEqual({
        channelId: 'channel-1',
        lastReadMessageId: 'msg-9',
        lastReadAt: new Date('2026-08-29T01:00:00Z'),
        unreadCount: 3,
      });
    });

    it('should mark the channel as fully read when no cursor message is given', async () => {
      const latest = new Date('2026-08-29T02:00:00Z');
      readStateRepository.findLatestMessage.mockResolvedValue({
        id: 'msg-latest',
        channelId: 'channel-1',
        createdAt: latest,
      });
      readStateRepository.upsert.mockResolvedValue({
        lastReadMessageId: 'msg-latest',
        lastReadAt: latest,
      });

      await service.markChannelRead('channel-1', 'user-1');

      expect(readStateRepository.findLatestMessage).toHaveBeenCalledWith(
        'channel-1',
      );
      expect(readStateRepository.upsert).toHaveBeenCalledWith(
        'channel-1',
        'member-1',
        {
          lastReadMessageId: 'msg-latest',
          lastReadAt: latest,
        },
      );
    });

    it('should record an empty null cursor for an empty channel', async () => {
      readStateRepository.findLatestMessage.mockResolvedValue(null);
      readStateRepository.upsert.mockResolvedValue({
        lastReadMessageId: null,
        lastReadAt: expect.any(Date),
      });

      const result = await service.markChannelRead('channel-1', 'user-1');

      expect(readStateRepository.upsert).toHaveBeenCalledWith(
        'channel-1',
        'member-1',
        {
          lastReadMessageId: null,
          lastReadAt: expect.any(Date),
        },
      );
      expect(result.lastReadMessageId).toBeNull();
    });
  });
});
