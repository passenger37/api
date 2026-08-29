import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ChannelMessageRepository } from '../repositories/channel-message.repository';
import { ServerChannelQueryService } from '../../servers/services/server-channel-query.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ServerPermissionService } from '../../servers/services/server-permission.service';
import { NexusException } from '../../../common/error/nexus.exception';
import { NexusErrorCode } from '../../../common/error/nexus-error-code';

describe('ChannelMessageValidationService', () => {
  let service: ChannelMessageValidationService;
  let channelQueryService: jest.Mocked<ServerChannelQueryService>;
  let memberQueryService: jest.Mocked<ServerMemberQueryService>;
  let permissionService: jest.Mocked<ServerPermissionService>;
  let repository: jest.Mocked<ChannelMessageRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelMessageValidationService,
        {
          provide: ChannelMessageRepository,
          useValue: { findById: jest.fn() },
        },
        {
          provide: ServerChannelQueryService,
          useValue: {
            getChannel: jest.fn(),
            getChannelOrThrow: jest.fn(),
          },
        },
        {
          provide: ServerMemberQueryService,
          useValue: { getMemberOrThrow: jest.fn() },
        },
        {
          provide: ServerPermissionService,
          useValue: {
            hasPermission: jest.fn(),
            requirePermission: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChannelMessageValidationService>(
      ChannelMessageValidationService,
    );
    channelQueryService = module.get(ServerChannelQueryService);
    memberQueryService = module.get(ServerMemberQueryService);
    permissionService = module.get(ServerPermissionService);
    repository = module.get(ChannelMessageRepository);
  });

  describe('validateContent', () => {
    it('should accept valid content', () => {
      expect(() => service.validateContent('Hello')).not.toThrow();
    });

    it('should reject empty content', () => {
      expect(() => service.validateContent('   ')).toThrow(NexusException);
    });

    it('should reject content exceeding max length', () => {
      const long = 'a'.repeat(4001);
      expect(() => service.validateContent(long)).toThrow(BadRequestException);
    });
  });

  describe('validateParentMessage', () => {
    it('should skip validation when parentMessageId is undefined', async () => {
      await expect(
        service.validateParentMessage(undefined, 'channel-1'),
      ).resolves.not.toThrow();
    });

    it('should throw when parent message does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.validateParentMessage('msg-1', 'channel-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateChannelAccess', () => {
    it('should return channel and member when access is granted', async () => {
      const channel = { serverId: 'srv-1', id: 'ch-1' } as any;
      const member = { id: 'mem-1' } as any;
      channelQueryService.getChannelOrThrow.mockResolvedValue(channel);
      memberQueryService.getMemberOrThrow.mockResolvedValue(member);
      permissionService.requirePermission.mockResolvedValue(undefined);

      const result = await service.validateChannelAccess('ch-1', 'user-1');
      expect(result).toEqual({ channel, member });
    });
  });
});
