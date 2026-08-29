import { Test, TestingModule } from '@nestjs/testing';
import { ChannelMessageCommandService } from './channel-message-command.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ChannelMessageEditRepository } from '../repositories/channel-message-edit.repository';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageGateway } from '../gateways/channel-message.gateway';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';

describe('ChannelMessageCommandService - edit history', () => {
  let service: ChannelMessageCommandService;
  let prisma: { $transaction: jest.Mock };
  let repository: { update: jest.Mock };
  let editRepository: { create: jest.Mock };
  let queryService: { getMessage: jest.Mock };
  let memberQueryService: { getMemberOrThrow: jest.Mock };
  let validation: {
    validateContent: jest.Mock;
    validateEditPermission: jest.Mock;
  };

  beforeEach(async () => {
    const tx = {};
    prisma = { $transaction: jest.fn(async (callback) => callback(tx)) };
    repository = { update: jest.fn() };
    editRepository = { create: jest.fn() };
    queryService = { getMessage: jest.fn() };
    memberQueryService = { getMemberOrThrow: jest.fn() };
    validation = {
      validateContent: jest.fn(),
      validateEditPermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMessageCommandService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChannelMessageRepository, useValue: repository },
        { provide: ChannelMessageEditRepository, useValue: editRepository },
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

  it('should write a history snapshot before updating the message', async () => {
    queryService.getMessage.mockResolvedValue({
      id: 'msg-1',
      content: 'old content',
      serverId: 'srv-1',
      authorMemberId: 'member-1',
    });
    memberQueryService.getMemberOrThrow.mockResolvedValue({ id: 'member-1' });
    repository.update.mockResolvedValue({
      id: 'msg-1',
      content: 'new content',
    });

    const result = await service.editMessage('msg-1', 'user-1', 'new content');

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
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(editRepository.create).toHaveBeenCalledTimes(1);

    const createData = editRepository.create.mock.calls[0][0];
    const tx = editRepository.create.mock.calls[0][1];
    expect(createData.message).toEqual({ connect: { id: 'msg-1' } });
    expect(createData.previousContent).toBe('old content');
    expect(createData.editedBy).toEqual({ connect: { id: 'member-1' } });
    expect(createData.editedAt).toBeInstanceOf(Date);

    expect(repository.update).toHaveBeenCalledWith(
      'msg-1',
      {
        content: 'new content',
        isEdited: true,
        editedAt: createData.editedAt,
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
      authorMemberId: 'member-1',
    });
    memberQueryService.getMemberOrThrow.mockResolvedValue({ id: 'member-1' });
    prisma.$transaction.mockImplementation(async (callback) => {
      await callback({});
      throw new Error('rollback');
    });

    await expect(
      service.editMessage('msg-1', 'user-1', 'new content'),
    ).rejects.toThrow('rollback');
  });
});
