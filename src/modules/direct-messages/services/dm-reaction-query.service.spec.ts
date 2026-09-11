import { NotFoundException } from '@nestjs/common';

import { DmReactionQueryService } from './dm-reaction-query.service';

describe('DmReactionQueryService', () => {
  let service: DmReactionQueryService;
  let messageRepository: any;
  let reactionRepository: any;
  let queryService: any;

  beforeEach(() => {
    messageRepository = { findById: jest.fn() };
    reactionRepository = {
      countReactionsByMessages: jest.fn(),
      viewerReactions: jest.fn(),
    };
    queryService = { getChannel: jest.fn() };

    service = new DmReactionQueryService(
      messageRepository,
      reactionRepository,
      queryService,
    );
  });

  it('should throw when the message is missing', async () => {
    messageRepository.findById.mockResolvedValue(null);

    await expect(service.getReactions('m1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should verify membership in the messages channel', async () => {
    messageRepository.findById.mockResolvedValue({
      id: 'm1',
      channelId: 'dm1',
      isDeleted: false,
    });
    queryService.getChannel.mockRejectedValue(new Error('no access'));

    await expect(service.getReactions('m1', 'u1')).rejects.toThrow('no access');
  });

  it('should aggregate counts and viewer reactions into a summary', async () => {
    messageRepository.findById.mockResolvedValue({
      id: 'm1',
      channelId: 'dm1',
      isDeleted: false,
    });
    queryService.getChannel.mockResolvedValue({ id: 'dm1' });
    reactionRepository.countReactionsByMessages.mockResolvedValue(
      new Map([
        [
          'm1',
          new Map([
            ['🔥', 2],
            ['❤️', 1],
          ]),
        ],
      ]),
    );
    reactionRepository.viewerReactions.mockResolvedValue(
      new Map([['m1', new Set(['🔥'])]]),
    );

    const summary = await service.getReactions('m1', 'u1');

    expect(summary).toEqual([
      { emoji: '🔥', count: 2, reactedByViewer: true },
      { emoji: '❤️', count: 1, reactedByViewer: false },
    ]);
  });
});
