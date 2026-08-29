import { ChannelMessageGateway } from './channel-message.gateway';

describe('ChannelMessageGateway Integration', () => {
  let gateway: ChannelMessageGateway;
  let rateLimitService: any;
  let commandService: any;
  let validationService: any;
  let errorNormalizer: any;
  let queryService: any;
  let reactionCommandService: any;
  let reactionQueryService: any;
  let typingService: any;
  let memberQueryService: any;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(() => {
    rateLimitService = { consume: jest.fn().mockResolvedValue(undefined) };
    commandService = {
      createMessage: jest
        .fn()
        .mockResolvedValue({ id: 'msg1', content: 'hello' }),
      editMessage: jest.fn().mockResolvedValue(undefined),
      deleteMessage: jest.fn().mockResolvedValue(undefined),
      pinMessage: jest.fn().mockResolvedValue({ id: 'msg1' }),
      unpinMessage: jest.fn().mockResolvedValue({ id: 'msg1' }),
      markChannelRead: jest.fn().mockResolvedValue({
        channelId: 'ch1',
        lastReadMessageId: 'msg2',
        lastReadAt: new Date('2026-01-01T00:00:00.000Z'),
        unreadCount: 0,
      }),
    };
    validationService = {
      validateChannelAccess: jest
        .fn()
        .mockResolvedValue({ channel: { serverId: 'sv1' }, member: {} }),
      validateContent: jest.fn(),
      validateParentMessage: jest.fn(),
    };
    errorNormalizer = { normalize: jest.fn().mockReturnValue({ error: true }) };
    queryService = {
      getMessage: jest
        .fn()
        .mockResolvedValue({ channelId: 'ch1', serverId: 'sv1' }),
    };
    reactionCommandService = {
      addReaction: jest.fn(),
      removeReaction: jest.fn(),
    };
    reactionQueryService = {
      getMessageReactions: jest.fn(),
      getReactionCounts: jest.fn(),
    };
    typingService = {
      startTyping: jest.fn().mockResolvedValue(undefined),
      stopTyping: jest.fn().mockResolvedValue(undefined),
    };
    memberQueryService = {
      getMemberWithUser: jest.fn().mockResolvedValue({
        id: 'member-1',
        nickname: 'alice',
        user: { id: 'u1', username: 'alice_dev' },
      }),
    };

    gateway = new ChannelMessageGateway(
      errorNormalizer,
      rateLimitService,
      queryService,
      reactionCommandService,
      validationService,
      reactionQueryService,
      queryService,
      commandService,
      typingService,
      memberQueryService,
    );

    // @ts-ignore
    gateway.server = mockServer;
  });

  it('should join channel after validation', async () => {
    const client = { join: jest.fn(), data: { userId: 'u1' } } as any;
    const request = { channelId: 'ch1' };

    const result = await gateway.joinChannel(client, request);

    expect(validationService.validateChannelAccess).toHaveBeenCalledWith(
      'ch1',
      'u1',
    );
    expect(client.join).toHaveBeenCalledWith('ch1');
    expect(result).toEqual({ success: true, channelId: 'ch1', userId: 'u1' });
  });

  it('should send message with rate limit and broadcast', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = {
      channelId: 'ch1',
      content: 'hi',
      parentMessageId: undefined,
    };

    const result = await gateway.sendMessage(client, request as any);

    expect(rateLimitService.consume).toHaveBeenCalledWith({
      key: 'ws:send-message:u1',
      limit: 20,
      windowSeconds: 10,
    });
    expect(commandService.createMessage).toHaveBeenCalledWith(
      'ch1',
      'u1',
      'hi',
      undefined,
    );
    expect(mockServer.to).toHaveBeenCalledWith('ch1');
    expect(mockServer.emit).toHaveBeenCalledWith(
      'message-created',
      expect.any(Object),
    );
    expect(result).toEqual({
      success: true,
      event: 'send-message',
      deliveryState: 'created',
      data: { id: 'msg1', content: 'hello' },
    });
  });

  it('should leave channel', async () => {
    const client = { leave: jest.fn(), data: { userId: 'u1' } } as any;
    const request = { channelId: 'ch1' };

    const result = await gateway.leaveChannel(client, request);

    expect(client.leave).toHaveBeenCalledWith('ch1');
    expect(result).toEqual({ success: true, channelId: 'ch1', userId: 'u1' });
  });

  it('should broadcast typing-started with nickname and exclude the sender', async () => {
    const client = {
      data: { userId: 'u1' },
      broadcast: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    } as any;
    const request = { channelId: 'ch1' };

    const result = await gateway.typingStart(client, request);

    expect(rateLimitService.consume).toHaveBeenCalledWith({
      key: 'ws:typing-start:u1',
      limit: 10,
      windowSeconds: 10,
    });
    expect(validationService.validateChannelAccess).toHaveBeenCalledWith(
      'ch1',
      'u1',
    );
    expect(memberQueryService.getMemberWithUser).toHaveBeenCalledWith(
      'sv1',
      'u1',
    );
    expect(typingService.startTyping).toHaveBeenCalledWith('ch1', 'u1');
    expect(client.broadcast.to).toHaveBeenCalledWith('ch1');
    expect(client.broadcast.emit).toHaveBeenCalledWith('typing-started', {
      channelId: 'ch1',
      userId: 'u1',
      username: 'alice',
    });
    expect(result).toEqual({ success: true, channelId: 'ch1' });
  });

  it('should fall back to username when the member has no nickname', async () => {
    memberQueryService.getMemberWithUser.mockResolvedValue({
      id: 'member-1',
      nickname: null,
      user: { id: 'u1', username: 'alice_dev' },
    });
    const client = {
      data: { userId: 'u1' },
      broadcast: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    } as any;
    const request = { channelId: 'ch1' };

    await gateway.typingStart(client, request);

    expect(client.broadcast.emit).toHaveBeenCalledWith('typing-started', {
      channelId: 'ch1',
      userId: 'u1',
      username: 'alice_dev',
    });
  });

  it('should broadcast typing-stopped and clear presence', async () => {
    const client = {
      data: { userId: 'u1' },
      broadcast: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    } as any;
    const request = { channelId: 'ch1' };

    const result = await gateway.typingStop(client, request);

    expect(rateLimitService.consume).toHaveBeenCalledWith({
      key: 'ws:typing-stop:u1',
      limit: 10,
      windowSeconds: 10,
    });
    expect(typingService.stopTyping).toHaveBeenCalledWith('ch1', 'u1');
    expect(client.broadcast.to).toHaveBeenCalledWith('ch1');
    expect(client.broadcast.emit).toHaveBeenCalledWith('typing-stopped', {
      channelId: 'ch1',
      userId: 'u1',
    });
    expect(result).toEqual({ success: true, channelId: 'ch1' });
  });

  it('should normalize errors on typing-start failure', async () => {
    rateLimitService.consume.mockRejectedValueOnce(
      new Error('Too many WebSocket requests.'),
    );
    const client = {
      data: { userId: 'u1' },
      broadcast: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    } as any;
    const request = { channelId: 'ch1' };

    const result = await gateway.typingStart(client, request);

    expect(errorNormalizer.normalize).toHaveBeenCalledWith(
      expect.any(Error),
      'typing-start',
    );
    expect(result).toEqual({ error: true });
  });

  it('should broadcast message-read when the read cursor advances', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { channelId: 'ch1', lastReadMessageId: 'msg2' };

    const result = await gateway.messageRead(client, request as any);

    expect(rateLimitService.consume).toHaveBeenCalledWith({
      key: 'ws:message-read:u1',
      limit: 20,
      windowSeconds: 10,
    });
    expect(commandService.markChannelRead).toHaveBeenCalledWith(
      'ch1',
      'u1',
      'msg2',
    );
    expect(mockServer.to).toHaveBeenCalledWith('ch1');
    expect(mockServer.emit).toHaveBeenCalledWith('message-read', {
      channelId: 'ch1',
      userId: 'u1',
      lastReadMessageId: 'msg2',
      lastReadAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(result).toEqual({
      success: true,
      channelId: 'ch1',
      lastReadMessageId: 'msg2',
      lastReadAt: new Date('2026-01-01T00:00:00.000Z'),
      unreadCount: 0,
    });
  });

  it('should mark the whole channel read when no cursor message is given', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { channelId: 'ch1' };

    await gateway.messageRead(client, request as any);

    expect(commandService.markChannelRead).toHaveBeenCalledWith(
      'ch1',
      'u1',
      undefined,
    );
  });

  it('should normalize errors on message-read failure', async () => {
    commandService.markChannelRead.mockRejectedValueOnce(
      new Error('Read cursor message belongs to another channel.'),
    );
    const client = { data: { userId: 'u1' } } as any;
    const request = { channelId: 'ch1', lastReadMessageId: 'msg2' };

    const result = await gateway.messageRead(client, request as any);

    expect(errorNormalizer.normalize).toHaveBeenCalledWith(
      expect.any(Error),
      'message-read',
    );
    expect(result).toEqual({ error: true });
  });
});
