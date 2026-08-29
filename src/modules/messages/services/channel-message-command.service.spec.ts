import { Test, TestingModule } from '@nestjs/testing';
import { ChannelMessageCommandService } from './channel-message-command.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageEditRepository } from '../repositories/channel-message-edit.repository';
import { ChannelMentionRepository } from '../repositories/channel-message-mention.repository';
import { ChannelMentionResolver } from './channel-mention-resolver.service';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageGateway } from '../gateways/channel-message.gateway';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';

describe('ChannelMessageCommandService - mentions', () => {
  let service: ChannelMessageCommandService;
  let prisma: { $transaction: jest.Mock };
  let repository: { create: jest.Mock; update: jest.Mock };
  let editRepository: { create: jest.Mock };
  let mentionRepository: {
    createMany: jest.Mock;
    deleteManyByMessage: jest.Mock;
  };
  let mentionResolver: { resolve: jest.Mock };
  let queryService: { getMessage: jest.Mock };
  let memberQueryService: { getMemberOrThrow: jest.Mock };
  let validation: {
    validateContent: jest.Mock;
    validateSendPermission: jest.Mock;
    validateParentMessage: jest.Mock;
    validateEditPermission: jest.Mock;
  };

  beforeEach(async () => {
    const tx = {};
    prisma = { $transaction: jest.fn(async (callback) => callback(tx)) };
    repository = { create: jest.fn(), update: jest.fn() };
    editRepository = { create: jest.fn() };
    mentionRepository = {
      createMany: jest.fn(),
      deleteManyByMessage: jest.fn(),
    };
    mentionResolver = { resolve: jest.fn(async () => []) };
    queryService = { getMessage: jest.fn() };
    memberQueryService = { getMemberOrThrow: jest.fn() };
    validation = {
      validateContent: jest.fn(),
      validateSendPermission: jest.fn(),
      validateParentMessage: jest.fn(),
      validateEditPermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMessageCommandService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChannelMessageRepository, useValue: repository },
        { provide: ChannelMessageEditRepository, useValue: editRepository },
        { provide: ChannelMentionRepository, useValue: mentionRepository },
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
      expect(result).toEqual({ id: 'msg-1' });
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
  });

  describe('editMessage', () => {
    it('should write a history snapshot and replace mention records', async () => {
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
      repository.update.mockResolvedValue({
        id: 'msg-1',
        content: 'new content',
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
        },
        tx,
      );
      expect(result).toEqual({ id: 'msg-1', content: 'new content' });
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
});
