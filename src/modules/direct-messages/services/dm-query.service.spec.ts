import { BadRequestException, NotFoundException } from '@nestjs/common';

import { DmQueryService } from './dm-query.service';

describe('DmQueryService', () => {
  let service: DmQueryService;
  let channelRepository: any;
  let messageRepository: any;
  let readStateRepository: any;

  const channel = {
    id: 'dm1',
    userAId: 'userA',
    userBId: 'userB',
    lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    userA: {
      id: 'userA',
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
    },
    userB: {
      id: 'userB',
      username: 'bob',
      displayName: 'Bob',
      avatarUrl: null,
    },
  };

  beforeEach(() => {
    channelRepository = {
      listForUser: jest.fn(),
      findById: jest.fn(),
    };
    messageRepository = {
      findPage: jest.fn(),
      findAfter: jest.fn(),
      findById: jest.fn(),
    };
    readStateRepository = { find: jest.fn() };

    service = new DmQueryService(
      channelRepository,
      messageRepository,
      readStateRepository,
    );
  });

  it('should list channels annotated with unread counts', async () => {
    channelRepository.listForUser.mockResolvedValue([channel]);
    readStateRepository.find.mockResolvedValue({
      id: 'rs1',
      unreadCount: 2,
    });

    const rows = await service.listChannels('userA');

    expect(channelRepository.listForUser).toHaveBeenCalledWith(
      'userA',
      undefined,
      50,
    );
    expect(readStateRepository.find).toHaveBeenCalledWith('dm1', 'userA');
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'dm1',
          partner: expect.objectContaining({ id: 'userB', username: 'bob' }),
          unreadCount: 2,
        }),
      ]),
    );
  });

  it('should return the channel for a member', async () => {
    channelRepository.findById.mockResolvedValue(channel);
    readStateRepository.find.mockResolvedValue(null);

    const result = await service.getChannel('dm1', 'userA');

    expect(result).toEqual(
      expect.objectContaining({ id: 'dm1', unreadCount: 0 }),
    );
  });

  it('should throw when the channel is missing', async () => {
    channelRepository.findById.mockResolvedValue(null);

    await expect(service.getChannel('dm1', 'userA')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should throw for a non-member', async () => {
    channelRepository.findById.mockResolvedValue(channel);

    await expect(service.getChannel('dm1', 'intruder')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should return history chronologically', async () => {
    channelRepository.findById.mockResolvedValue(channel);
    messageRepository.findPage.mockResolvedValue([
      { id: 'm2', createdAt: new Date('2026-01-02T00:00:00.000Z') },
      { id: 'm1', createdAt: new Date('2026-01-01T00:00:00.000Z') },
    ]);

    const history = await service.getHistory('dm1', 'userA', 'm9', 25);

    expect(messageRepository.findPage).toHaveBeenCalledWith('dm1', 'm9', 25);
    expect(history.map((m: any) => m.id)).toEqual(['m1', 'm2']);
  });

  it('should return messages after the anchor', async () => {
    channelRepository.findById.mockResolvedValue(channel);
    messageRepository.findById.mockResolvedValue({
      id: 'm1',
      channelId: 'dm1',
      isDeleted: false,
    });
    messageRepository.findAfter.mockResolvedValue([
      { id: 'm2', createdAt: new Date('2026-01-02T00:00:00.000Z') },
    ]);

    const messages = await service.getMessagesAfter('dm1', 'userA', 'm1');

    expect(messageRepository.findAfter).toHaveBeenCalledWith('dm1', 'm1');
    expect(messages.map((m: any) => m.id)).toEqual(['m2']);
  });

  it('should reject an anchor from another channel', async () => {
    channelRepository.findById.mockResolvedValue(channel);
    messageRepository.findById.mockResolvedValue({
      id: 'mX',
      channelId: 'dm-other',
      isDeleted: false,
    });

    await expect(
      service.getMessagesAfter('dm1', 'userA', 'mX'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
