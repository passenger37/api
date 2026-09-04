import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';

import { DmCommandService } from './dm-command.service';

describe('DmCommandService', () => {
  let service: DmCommandService;
  let prisma: any;
  let channelRepository: any;
  let messageRepository: any;
  let readStateRepository: any;
  let userQueryService: any;
  let gateway: any;
  let searchService: any;

  const now = new Date('2026-01-01T00:00:00.000Z');

  beforeEach(() => {
    prisma = { $transaction: jest.fn() };
    channelRepository = {
      findById: jest.fn(),
      findPair: jest.fn(),
      create: jest.fn(),
      incrementCounterAndTouch: jest.fn(),
    };
    messageRepository = {
      findById: jest.fn(),
      findByClientMessageId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findLatestForRead: jest.fn(),
    };
    readStateRepository = {
      find: jest.fn(),
      upsert: jest.fn(),
      countUnreadAfter: jest.fn(),
    };
    userQueryService = { findById: jest.fn() };
    gateway = {
      broadcastMessageCreated: jest.fn(),
      broadcastMessageUpdated: jest.fn(),
      broadcastMessageDeleted: jest.fn(),
      broadcastMessageRead: jest.fn(),
    };
    searchService = { indexDirectMessage: jest.fn() };

    service = new DmCommandService(
      prisma,
      channelRepository,
      messageRepository,
      readStateRepository,
      userQueryService,
      gateway,
      searchService,
    );
  });

  describe('open', () => {
    it('should throw when messaging yourself', async () => {
      await expect(service.open('u1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should throw when the target user is missing or inactive', async () => {
      userQueryService.findById.mockResolvedValue(null);

      await expect(service.open('u1', 'u2')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      userQueryService.findById.mockResolvedValue({
        id: 'u2',
        status: UserStatus.SUSPENDED,
        deletedAt: null,
      });

      await expect(service.open('u1', 'u2')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should return an existing channel', async () => {
      userQueryService.findById.mockResolvedValue({
        id: 'u2',
        status: UserStatus.ACTIVE,
        deletedAt: null,
      });
      const channel = { id: 'dm1', userAId: 'u1', userBId: 'u2' };
      channelRepository.findPair.mockResolvedValue(channel);

      const result = await service.open('u1', 'u2');

      expect(channelRepository.findPair).toHaveBeenCalledWith('u1', 'u2');
      expect(channelRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual(channel);
    });

    it('should create a channel when none exists', async () => {
      userQueryService.findById.mockResolvedValue({
        id: 'u2',
        status: UserStatus.ACTIVE,
        deletedAt: null,
      });
      const channel = { id: 'dm1', userAId: 'u1', userBId: 'u2' };
      channelRepository.findPair.mockResolvedValue(null);
      channelRepository.create.mockResolvedValue(channel);

      const result = await service.open('u1', 'u2');

      expect(channelRepository.create).toHaveBeenCalledWith('u1', 'u2');
      expect(result).toEqual(channel);
    });
  });

  describe('send', () => {
    const channel = { id: 'dm1', userAId: 'u1', userBId: 'u2' };

    beforeEach(() => {
      channelRepository.findById.mockResolvedValue(channel);
    });

    it('should throw when not a member', async () => {
      channelRepository.findById.mockResolvedValue({
        ...channel,
        userAId: 'u3',
      });

      await expect(service.send('dm1', 'u1', 'hi')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should reject invalid content', async () => {
      await expect(service.send('dm1', 'u1', '')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should deduplicate on a client retry before creating', async () => {
      const existing = {
        id: 'm1',
        channelId: 'dm1',
        authorUserId: 'u1',
        content: 'hi',
        clientMessageId: 'client-1',
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        version: 1,
        messageSeq: 1,
        createdAt: now,
      };
      messageRepository.findByClientMessageId.mockResolvedValue(existing);

      const result = await service.send('dm1', 'u1', 'hi', 'client-1');

      expect(messageRepository.findByClientMessageId).toHaveBeenCalledWith(
        'client-1',
        'u1',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: expect.objectContaining({ id: 'm1' }),
        deduplicated: true,
      });
    });

    it('should create within a transaction, sequence the message, and broadcast', async () => {
      const created = {
        id: 'm1',
        channelId: 'dm1',
        authorUserId: 'u1',
        content: 'hi',
        clientMessageId: 'client-1',
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        version: 1,
        messageSeq: 1,
        createdAt: now,
      };
      prisma.$transaction.mockImplementation(async (cb) =>
        cb({ directMessageChannel: channelRepository }),
      );
      channelRepository.incrementCounterAndTouch.mockResolvedValue(1);
      messageRepository.create.mockResolvedValue(created);

      const result = await service.send('dm1', 'u1', 'hi', 'client-1');

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(channelRepository.incrementCounterAndTouch).toHaveBeenCalledWith(
        'dm1',
        expect.any(Date),
        expect.anything(),
      );
      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'hi',
          messageSeq: 1,
          channel: { connect: { id: 'dm1' } },
          author: { connect: { id: 'u1' } },
          clientMessageId: 'client-1',
        }),
        expect.anything(),
      );
      expect(gateway.broadcastMessageCreated).toHaveBeenCalledWith(
        'dm1',
        expect.objectContaining({ id: 'm1', messageSeq: 1 }),
      );
      expect(result.deduplicated).toBe(false);
    });

    it('should deduplicate on a unique violation during the transaction', async () => {
      const existing = {
        id: 'm1',
        channelId: 'dm1',
        authorUserId: 'u1',
        content: 'hi',
        clientMessageId: 'client-1',
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        version: 1,
        messageSeq: 1,
        createdAt: now,
      };
      prisma.$transaction.mockRejectedValueOnce({
        constructor: { name: 'PrismaClientKnownRequestError' },
        code: 'P2002',
      });
      messageRepository.findByClientMessageId.mockResolvedValue(existing);

      const result = await service.send('dm1', 'u1', 'hi', 'client-1');

      expect(result).toEqual({
        message: expect.objectContaining({ id: 'm1' }),
        deduplicated: true,
      });
    });
  });

  describe('edit', () => {
    it('should version-bump and broadcast the edit', async () => {
      const message = {
        id: 'm1',
        channelId: 'dm1',
        authorUserId: 'u1',
        content: 'old',
        version: 1,
        isDeleted: false,
      };
      const edited = {
        ...message,
        content: 'new',
        isEdited: true,
        editedAt: now,
        version: 2,
        clientMessageId: null,
        messageSeq: 1,
        createdAt: now,
      };
      messageRepository.findById.mockResolvedValue(message);
      messageRepository.update.mockResolvedValue(edited);

      const result = await service.edit('m1', 'u1', 'new', 1);

      expect(messageRepository.update).toHaveBeenCalledWith('m1', {
        content: 'new',
        isEdited: true,
        editedAt: expect.any(Date),
        version: { increment: 1 },
      });
      expect(gateway.broadcastMessageUpdated).toHaveBeenCalledWith('dm1', {
        messageId: 'm1',
        content: 'new',
        version: 2,
      });
      expect(result).toEqual(expect.objectContaining({ version: 2 }));
    });

    it('should throw on a stale version', async () => {
      messageRepository.findById.mockResolvedValue({
        id: 'm1',
        authorUserId: 'u1',
        version: 2,
        isDeleted: false,
      });

      await expect(service.edit('m1', 'u1', 'new', 1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete and broadcast', async () => {
      messageRepository.findById.mockResolvedValue({
        id: 'm1',
        channelId: 'dm1',
        authorUserId: 'u1',
        isDeleted: false,
      });
      messageRepository.softDelete.mockResolvedValue({});

      const result = await service.delete('m1', 'u1');

      expect(messageRepository.softDelete).toHaveBeenCalledWith('m1');
      expect(gateway.broadcastMessageDeleted).toHaveBeenCalledWith('dm1', 'm1');
      expect(result).toEqual({ success: true, messageId: 'm1' });
    });

    it('should refuse deleting another users message', async () => {
      messageRepository.findById.mockResolvedValue({
        id: 'm1',
        channelId: 'dm1',
        authorUserId: 'u2',
        isDeleted: false,
      });

      await expect(service.delete('m1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('markRead', () => {
    it('should advance the cursor to the latest message', async () => {
      const channel = { id: 'dm1', userAId: 'u1', userBId: 'u2' };
      const latest = { id: 'm9', channelId: 'dm1', createdAt: now };
      channelRepository.findById.mockResolvedValue(channel);
      messageRepository.findLatestForRead.mockResolvedValue(latest);
      readStateRepository.find.mockResolvedValue(null);
      readStateRepository.countUnreadAfter.mockResolvedValue(3);
      readStateRepository.upsert.mockResolvedValue({
        id: 'rs1',
        lastReadMessageId: 'm9',
        lastReadAt: now,
        unreadCount: 3,
      });

      const result = await service.markRead('dm1', 'u1');

      expect(readStateRepository.upsert).toHaveBeenCalledWith('dm1', 'u1', {
        lastReadMessageId: 'm9',
        lastReadAt: now,
        unreadCount: 3,
      });
      expect(gateway.broadcastMessageRead).toHaveBeenCalledWith(
        'dm1',
        expect.objectContaining({ unreadCount: 3 }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          channelId: 'dm1',
          lastReadMessageId: 'm9',
          unreadCount: 3,
        }),
      );
    });

    it('should not regress an existing cursor', async () => {
      const channel = { id: 'dm1', userAId: 'u1', userBId: 'u2' };
      const later = { id: 'm9', channelId: 'dm1', createdAt: now };
      const existing = {
        id: 'rs1',
        lastReadMessageId: 'm9',
        lastReadAt: new Date('2026-02-01T00:00:00.000Z'),
        unreadCount: 0,
      };
      channelRepository.findById.mockResolvedValue(channel);
      messageRepository.findLatestForRead.mockResolvedValue(later);
      readStateRepository.find.mockResolvedValue(existing);
      readStateRepository.countUnreadAfter.mockResolvedValue(0);

      const result = await service.markRead('dm1', 'u1');

      expect(readStateRepository.upsert).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ lastReadMessageId: 'm9', unreadCount: 0 }),
      );
    });

    it('should reject a cursor from another channel', async () => {
      channelRepository.findById.mockResolvedValue({
        id: 'dm1',
        userAId: 'u1',
        userBId: 'u2',
      });
      messageRepository.findById.mockResolvedValue({
        id: 'mX',
        channelId: 'dm-other',
      });

      await expect(service.markRead('dm1', 'u1', 'mX')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
