import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ChannelMessageController } from './channel-message.controller';
import { ChannelMessageQueryService } from '../services/channel-message-query.service';
import { ChannelMessageValidationService } from '../services/channel-message-validation.service';
import { ChannelMessageCommandService } from '../services/channel-message-command.service';

describe('ChannelMessageController Integration - Pagination', () => {
  let controller: ChannelMessageController;
  let queryService: jest.Mocked<ChannelMessageQueryService>;
  let validationService: jest.Mocked<ChannelMessageValidationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChannelMessageController],
      providers: [
        {
          provide: ChannelMessageQueryService,
          useValue: {
            getChannelMessagesPaginated: jest.fn(),
          },
        },
        {
          provide: ChannelMessageValidationService,
          useValue: {
            validateChannelAccess: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ChannelMessageCommandService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ChannelMessageController>(ChannelMessageController);
    queryService = module.get(ChannelMessageQueryService);
    validationService = module.get(ChannelMessageValidationService);
  });

  it('should return paginated messages with nextCursor when more items exist', async () => {
    const paginated = {
      items: [{ id: 'msg3' }, { id: 'msg2' }],
      nextCursor: 'msg2',
      hasMore: true,
    };
    queryService.getChannelMessagesPaginated.mockResolvedValue(paginated as any);

    const result = await controller.getMessages('ch-1', 'user-1', { limit: 2 });

    expect(validationService.validateChannelAccess).toHaveBeenCalledWith(
      'ch-1',
      'user-1',
    );
    expect(queryService.getChannelMessagesPaginated).toHaveBeenCalledWith(
      'ch-1',
      undefined,
      2,
    );
    expect(result).toEqual(paginated);
  });

  it('should handle empty channel', async () => {
    const paginated = { items: [], nextCursor: undefined, hasMore: false };
    queryService.getChannelMessagesPaginated.mockResolvedValue(paginated);

    const result = await controller.getMessages('ch-empty', 'user-1', {
      limit: 50,
    });

    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it('should reject invalid limit', async () => {
    await expect(
      controller.getMessages('ch-1', 'user-1', { limit: 0 }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      controller.getMessages('ch-1', 'user-1', { limit: 101 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should propagate permission denial', async () => {
    validationService.validateChannelAccess.mockRejectedValueOnce(
      new Error('Forbidden'),
    );

    await expect(
      controller.getMessages('ch-1', 'user-1', { limit: 50 }),
    ).rejects.toThrow('Forbidden');
  });

  it('should pass cursor to service for subsequent pages', async () => {
    const paginated = {
      items: [{ id: 'msg1' }],
      nextCursor: undefined,
      hasMore: false,
    };
    queryService.getChannelMessagesPaginated.mockResolvedValue(paginated as any);

    await controller.getMessages('ch-1', 'user-1', {
      cursor: 'msg2',
      limit: 50,
    });

    expect(queryService.getChannelMessagesPaginated).toHaveBeenCalledWith(
      'ch-1',
      'msg2',
      50,
    );
  });
});
