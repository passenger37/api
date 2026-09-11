import { BadRequestException, NotFoundException } from '@nestjs/common';

import { DmReactionCommandService } from './dm-reaction-command.service';

describe('DmReactionCommandService', () => {
  let service: DmReactionCommandService;
  let messageRepository: any;
  let reactionRepository: any;
  let queryService: any;
  let gateway: any;

  beforeEach(() => {
    messageRepository = { findById: jest.fn() };
    reactionRepository = {
      find: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    };
    queryService = { getChannel: jest.fn() };
    gateway = {
      broadcastReactionAdded: jest.fn(),
      broadcastReactionRemoved: jest.fn(),
    };

    service = new DmReactionCommandService(
      messageRepository,
      reactionRepository,
      queryService,
      gateway,
    );
  });

  it('should throw when the message is missing or deleted', async () => {
    messageRepository.findById.mockResolvedValue(null);

    await expect(service.addReaction('m1', 'u1', '🔥')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should reject a duplicate reaction', async () => {
    messageRepository.findById.mockResolvedValue({
      id: 'm1',
      channelId: 'dm1',
      isDeleted: false,
    });
    queryService.getChannel.mockResolvedValue({ id: 'dm1' });
    reactionRepository.find.mockResolvedValue({ id: 'r1' });

    await expect(service.addReaction('m1', 'u1', '🔥')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should add a reaction and broadcast', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    messageRepository.findById.mockResolvedValue({
      id: 'm1',
      channelId: 'dm1',
      isDeleted: false,
    });
    queryService.getChannel.mockResolvedValue({ id: 'dm1' });
    reactionRepository.find.mockResolvedValue(null);
    reactionRepository.add.mockResolvedValue({
      messageId: 'm1',
      userId: 'u1',
      emoji: '🔥',
      createdAt,
    });

    const result = await service.addReaction('m1', 'u1', '🔥');

    expect(reactionRepository.add).toHaveBeenCalledWith('m1', 'u1', '🔥');
    expect(gateway.broadcastReactionAdded).toHaveBeenCalledWith('dm1', {
      channelId: 'dm1',
      messageId: 'm1',
      userId: 'u1',
      emoji: '🔥',
      createdAt,
    });
    expect(result).toEqual({ messageId: 'm1', userId: 'u1', emoji: '🔥' });
  });

  it('should reject removing a reaction that does not exist', async () => {
    messageRepository.findById.mockResolvedValue({
      id: 'm1',
      channelId: 'dm1',
      isDeleted: false,
    });
    queryService.getChannel.mockResolvedValue({ id: 'dm1' });
    reactionRepository.find.mockResolvedValue(null);

    await expect(
      service.removeReaction('m1', 'u1', '🔥'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should remove a reaction and broadcast', async () => {
    messageRepository.findById.mockResolvedValue({
      id: 'm1',
      channelId: 'dm1',
      isDeleted: false,
    });
    queryService.getChannel.mockResolvedValue({ id: 'dm1' });
    reactionRepository.find.mockResolvedValue({ id: 'r1' });
    reactionRepository.remove.mockResolvedValue({});

    const result = await service.removeReaction('m1', 'u1', '🔥');

    expect(reactionRepository.remove).toHaveBeenCalledWith('m1', 'u1', '🔥');
    expect(gateway.broadcastReactionRemoved).toHaveBeenCalledWith('dm1', {
      channelId: 'dm1',
      messageId: 'm1',
      userId: 'u1',
      emoji: '🔥',
    });
    expect(result).toEqual({ messageId: 'm1', userId: 'u1', emoji: '🔥' });
  });
});
