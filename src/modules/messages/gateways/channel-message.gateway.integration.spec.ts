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
    };
    validationService = {
      validateChannelAccess: jest.fn().mockResolvedValue(undefined),
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

    gateway = new ChannelMessageGateway(
      errorNormalizer,
      rateLimitService,
      queryService,
      reactionCommandService,
      validationService,
      reactionQueryService,
      queryService,
      commandService,
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
    expect(result.success).toBe(true);
  });

  it('should leave channel', async () => {
    const client = { leave: jest.fn(), data: { userId: 'u1' } } as any;
    const request = { channelId: 'ch1' };

    const result = await gateway.leaveChannel(client, request);

    expect(client.leave).toHaveBeenCalledWith('ch1');
    expect(result).toEqual({ success: true, channelId: 'ch1', userId: 'u1' });
  });
});
