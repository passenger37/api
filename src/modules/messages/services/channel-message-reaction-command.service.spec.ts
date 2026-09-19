import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { ChannelMessageReactionCommandService } from './channel-message-reaction-command.service';
import { ChannelMessageReactionRepository } from '../repositories/channel-message-reaction.repository';
import { ChannelMessageQueryService } from './channel-message-query.service';
import { ChannelMessageValidationService } from './channel-message-validation.service';
import { ServerMemberQueryService } from '../../servers/services/server-member-query.service';
import { ChannelMessageCacheService } from './channel-message-cache.service';

describe('ChannelMessageReactionCommandService', () => {
  const repository = {
    findOne: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  } as unknown as ChannelMessageReactionRepository;

  const messageQueryService = {
    getMessage: jest.fn(),
  } as unknown as ChannelMessageQueryService;

  const validation = {
    validateChannelAccess: jest.fn(),
  } as unknown as ChannelMessageValidationService;

  const memberQueryService = {
    getMemberOrThrow: jest.fn(),
  } as unknown as ServerMemberQueryService;

  const cache = {
    invalidateChannel: jest.fn(),
  } as unknown as ChannelMessageCacheService;

  const service = new ChannelMessageReactionCommandService(
    repository,
    messageQueryService,
    validation,
    memberQueryService,
    cache,
  );

  const message = { id: 'msg-1', serverId: 'sv-1', channelId: 'ch-1' };

  beforeEach(() => {
    jest.resetAllMocks();
    (messageQueryService.getMessage as jest.Mock).mockResolvedValue(message);
    (validation.validateChannelAccess as jest.Mock).mockResolvedValue({
      channel: message,
    });
    (memberQueryService.getMemberOrThrow as jest.Mock).mockResolvedValue({
      id: 'member-1',
    });
  });

  it('requires channel access before adding a reaction', async () => {
    (repository.findOne as jest.Mock).mockResolvedValue(null);
    (repository.create as jest.Mock).mockResolvedValue({ id: 'r-1' });
    (cache.invalidateChannel as jest.Mock).mockResolvedValue(undefined);

    await service.addReaction('msg-1', 'u1', '😀');

    expect(validation.validateChannelAccess).toHaveBeenCalledWith('ch-1', 'u1');
    expect(repository.create).toHaveBeenCalledWith('msg-1', 'member-1', '😀');
  });

  it('rejects a reaction on a message in a channel the user cannot access', async () => {
    (validation.validateChannelAccess as jest.Mock).mockRejectedValue(
      new ForbiddenException('Channel access denied'),
    );

    await expect(
      service.addReaction('msg-1', 'u1', '😀'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(memberQueryService.getMemberOrThrow).not.toHaveBeenCalled();
  });

  it('rejects a duplicate reaction', async () => {
    (repository.findOne as jest.Mock).mockResolvedValue({ id: 'existing' });

    await expect(
      service.addReaction('msg-1', 'u1', '😀'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires channel access before removing a reaction', async () => {
    (repository.findOne as jest.Mock).mockResolvedValue({ id: 'existing' });
    (repository.delete as jest.Mock).mockResolvedValue(undefined);
    (cache.invalidateChannel as jest.Mock).mockResolvedValue(undefined);

    await service.removeReaction('msg-1', 'u1', '😀');

    expect(validation.validateChannelAccess).toHaveBeenCalledWith('ch-1', 'u1');
    expect(repository.delete).toHaveBeenCalledWith('msg-1', 'member-1', '😀');
  });
});
