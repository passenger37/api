import { DmGateway } from './dm.gateway';

describe('DmGateway Integration', () => {
  let gateway: DmGateway;
  let errorNormalizer: any;
  let rateLimit: any;
  let commandService: any;
  let queryService: any;
  let e2eeCommandService: any;
  let reactionCommandService: any;
  let connectionAuth: any;
  let connectionLimit: any;
  let typingService: any;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(() => {
    errorNormalizer = { normalize: jest.fn().mockReturnValue({ error: true }) };
    rateLimit = { consume: jest.fn().mockResolvedValue(undefined) };
    commandService = {
      open: jest.fn().mockResolvedValue({
        id: 'dm1',
        userAId: 'u1',
        userBId: 'u2',
      }),
      send: jest.fn().mockResolvedValue({
        message: { id: 'msg1', content: 'hi' },
        deduplicated: false,
      }),
      markRead: jest.fn().mockResolvedValue({
        channelId: 'dm1',
        lastReadMessageId: 'msg2',
        lastReadAt: new Date('2026-01-01T00:00:00.000Z'),
        unreadCount: 0,
      }),
      assertNotBlockedForChannel: jest.fn().mockResolvedValue(undefined),
      edit: jest.fn().mockResolvedValue({ id: 'msg1', version: 2 }),
      delete: jest.fn().mockResolvedValue({ success: true, messageId: 'msg1' }),
    };
    queryService = {
      getHistory: jest.fn().mockResolvedValue([{ id: 'msg2' }]),
      getMessagesAfter: jest.fn().mockResolvedValue([{ id: 'msg2' }]),
      getChannel: jest.fn().mockResolvedValue({
        id: 'dm1',
        userAId: 'u1',
        userBId: 'u2',
      }),
    };
    e2eeCommandService = {
      sendText: jest.fn().mockResolvedValue({
        message: { id: 'msg3', isE2ee: true },
        envelopes: [{ id: 'env1' }],
        deduplicated: false,
      }),
    };
    reactionCommandService = {
      addReaction: jest.fn().mockResolvedValue({
        messageId: 'msg1',
        userId: 'u1',
        emoji: '🔥',
      }),
      removeReaction: jest.fn().mockResolvedValue({
        messageId: 'msg1',
        userId: 'u1',
        emoji: '🔥',
      }),
    };
    connectionAuth = {
      authenticate: jest.fn().mockResolvedValue({ userId: 'u1' }),
    };
    connectionLimit = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    };
    typingService = {
      startTyping: jest.fn().mockResolvedValue(undefined),
      stopTyping: jest.fn().mockResolvedValue(undefined),
    };

    gateway = new DmGateway(
      errorNormalizer,
      rateLimit,
      commandService,
      queryService,
      e2eeCommandService,
      reactionCommandService,
      connectionAuth,
      connectionLimit,
      typingService,
    );

    // @ts-ignore
    gateway.server = mockServer;
  });

  it('should open a DM and join the dm room', async () => {
    const client = { join: jest.fn(), data: { userId: 'u1' } } as any;
    const request = { targetUserId: 'u2' };

    const result = await gateway.open(client, request);

    expect(rateLimit.consume).toHaveBeenCalledWith({
      key: 'ws:dm-open:u1',
      limit: 30,
      windowSeconds: 10,
    });
    expect(commandService.open).toHaveBeenCalledWith('u1', 'u2');
    expect(client.join).toHaveBeenCalledWith('dm:dm1');
    expect(result).toEqual({
      success: true,
      event: 'dm-open',
      channelId: 'dm1',
      partnerUserId: 'u2',
    });
  });

  it('should send a message and echo the created payload', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = {
      channelId: 'dm1',
      content: 'hi',
      clientMessageId: 'client-1',
    };

    const result = await gateway.send(client, request);

    expect(rateLimit.consume).toHaveBeenCalledWith({
      key: 'ws:dm-send:u1',
      limit: 20,
      windowSeconds: 10,
    });
    expect(commandService.send).toHaveBeenCalledWith(
      'dm1',
      'u1',
      'hi',
      'client-1',
      undefined,
      undefined,
    );
    expect(result).toEqual({
      success: true,
      event: 'dm-send',
      deliveryState: 'created',
      data: { id: 'msg1', content: 'hi' },
      deduplicated: false,
    });
  });

  it('should open an end-to-end encrypted DM and join the room', async () => {
    commandService.open.mockResolvedValue({
      id: 'dm1',
      userAId: 'u1',
      userBId: 'u2',
      mode: 'PRIVATE_E2EE',
    });
    const client = { join: jest.fn(), data: { userId: 'u1' } } as any;
    const request = { targetUserId: 'u2' };

    const result = await gateway.openE2ee(client, request);

    expect(commandService.open).toHaveBeenCalledWith(
      'u1',
      'u2',
      'PRIVATE_E2EE',
    );
    expect(client.join).toHaveBeenCalledWith('dm:dm1');
    expect(result).toEqual({
      success: true,
      event: 'dm-e2ee-open',
      channelId: 'dm1',
      mode: 'PRIVATE_E2EE',
      partnerUserId: 'u2',
    });
  });

  it('should relay an E2EE message and echo the envelope payload', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request: any = {
      channelId: 'dm1',
      senderDeviceId: 'dev1',
      protocolVersion: 1,
      envelopes: [
        {
          recipientDeviceId: 'dev2',
          sessionId: 'sess1',
          type: 'PRE_KEY',
          ciphertext: 'cipher',
        },
      ],
    };

    const result = await gateway.sendE2ee(client, request);

    expect(rateLimit.consume).toHaveBeenCalledWith({
      key: 'ws:dm-e2ee-send:u1',
      limit: 20,
      windowSeconds: 10,
    });
    expect(e2eeCommandService.sendText).toHaveBeenCalledWith('u1', request);
    expect(result).toEqual({
      success: true,
      event: 'dm-e2ee-send',
      deliveryState: 'created',
      message: { id: 'msg3', isE2ee: true },
      envelopes: [{ id: 'env1' }],
      deduplicated: false,
    });
  });

  it('should sync full history when no anchor is supplied', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { channelId: 'dm1' };

    const result = await gateway.sync(client, request);

    expect(queryService.getHistory).toHaveBeenCalledWith('dm1', 'u1');
    expect(queryService.getMessagesAfter).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      event: 'dm-sync',
      channelId: 'dm1',
      messages: [{ id: 'msg2' }],
    });
  });

  it('should replay messages after the last known anchor', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { channelId: 'dm1', lastKnownMessageId: 'msg1' };

    const result = await gateway.sync(client, request);

    expect(queryService.getMessagesAfter).toHaveBeenCalledWith(
      'dm1',
      'u1',
      'msg1',
    );
    expect(result).toEqual(
      expect.objectContaining({ messages: [{ id: 'msg2' }] }),
    );
  });

  it('should advance the read cursor and echo the state', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { channelId: 'dm1', lastReadMessageId: 'msg2' };

    const result = await gateway.read(client, request);

    expect(rateLimit.consume).toHaveBeenCalledWith({
      key: 'ws:dm-read:u1',
      limit: 20,
      windowSeconds: 10,
    });
    expect(commandService.markRead).toHaveBeenCalledWith('dm1', 'u1', 'msg2');
    expect(result).toEqual({
      success: true,
      event: 'dm-read',
      channelId: 'dm1',
      lastReadMessageId: 'msg2',
      lastReadAt: new Date('2026-01-01T00:00:00.000Z'),
      unreadCount: 0,
    });
  });

  it('should start typing and broadcast to the dm room', async () => {
    const broadcast = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    const client = {
      data: { userId: 'u1' },
      broadcast,
    } as any;
    const request = { channelId: 'dm1' };

    const result = await gateway.typingStart(client, request);

    expect(rateLimit.consume).toHaveBeenCalledWith({
      key: 'ws:dm:typing-start:u1',
      limit: 10,
      windowSeconds: 10,
    });
    expect(queryService.getChannel).toHaveBeenCalledWith('dm1', 'u1');
    expect(commandService.assertNotBlockedForChannel).toHaveBeenCalledWith(
      'dm1',
      'u1',
    );
    expect(typingService.startTyping).toHaveBeenCalledWith('dm1', 'u1');
    expect(broadcast.to).toHaveBeenCalledWith('dm:dm1');
    expect(broadcast.emit).toHaveBeenCalledWith('dm-typing-started', {
      channelId: 'dm1',
      userId: 'u1',
    });
    expect(result).toEqual({ success: true, channelId: 'dm1' });
  });

  it('should stop typing and broadcast to the dm room', async () => {
    const broadcast = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    const client = {
      data: { userId: 'u1' },
      broadcast,
    } as any;
    const request = { channelId: 'dm1' };

    const result = await gateway.typingStop(client, request);

    expect(rateLimit.consume).toHaveBeenCalledWith({
      key: 'ws:dm:typing-stop:u1',
      limit: 10,
      windowSeconds: 10,
    });
    expect(queryService.getChannel).toHaveBeenCalledWith('dm1', 'u1');
    expect(commandService.assertNotBlockedForChannel).toHaveBeenCalledWith(
      'dm1',
      'u1',
    );
    expect(typingService.stopTyping).toHaveBeenCalledWith('dm1', 'u1');
    expect(broadcast.to).toHaveBeenCalledWith('dm:dm1');
    expect(broadcast.emit).toHaveBeenCalledWith('dm-typing-stopped', {
      channelId: 'dm1',
      userId: 'u1',
    });
    expect(result).toEqual({ success: true, channelId: 'dm1' });
  });

  it('should normalize errors on typing start failure', async () => {
    queryService.getChannel.mockRejectedValueOnce(new Error('Channel denied.'));
    const client = { data: { userId: 'u1' } } as any;
    const request = { channelId: 'dm1' };

    const result = await gateway.typingStart(client, request);

    expect(errorNormalizer.normalize).toHaveBeenCalledWith(
      expect.any(Error),
      'dm:typing-start',
    );
    expect(result).toEqual({ error: true });
  });

  it('should edit a message', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = {
      messageId: 'msg1',
      content: 'updated',
      expectedVersion: 1,
    };

    const result = await gateway.edit(client, request);

    expect(rateLimit.consume).toHaveBeenCalledWith({
      key: 'ws:dm-edit:u1',
      limit: 30,
      windowSeconds: 10,
    });
    expect(commandService.edit).toHaveBeenCalledWith(
      'msg1',
      'u1',
      'updated',
      1,
    );
    expect(result).toEqual({
      success: true,
      event: 'dm-edit',
      message: { id: 'msg1', version: 2 },
    });
  });

  it('should delete a message', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { messageId: 'msg1' };

    const result = await gateway.deleteMessage(client, request);

    expect(commandService.delete).toHaveBeenCalledWith('msg1', 'u1');
    expect(result).toEqual({
      success: true,
      event: 'dm-delete',
    });
  });

  it('should add a reaction and report it', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { messageId: 'msg1', emoji: '🔥' };

    const result = await gateway.reactionAdd(client, request);

    expect(reactionCommandService.addReaction).toHaveBeenCalledWith(
      'msg1',
      'u1',
      '🔥',
    );
    expect(result).toEqual({
      success: true,
      event: 'dm-reaction-add',
      messageId: 'msg1',
      userId: 'u1',
      emoji: '🔥',
    });
  });

  it('should remove a reaction and report it', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { messageId: 'msg1', emoji: '🔥' };

    const result = await gateway.reactionRemove(client, request);

    expect(reactionCommandService.removeReaction).toHaveBeenCalledWith(
      'msg1',
      'u1',
      '🔥',
    );
    expect(result).toEqual({
      success: true,
      event: 'dm-reaction-remove',
      messageId: 'msg1',
      userId: 'u1',
      emoji: '🔥',
    });
  });

  it('should broadcast message created events to the dm room', () => {
    gateway.broadcastMessageCreated('dm1', { id: 'msg1' });

    expect(mockServer.to).toHaveBeenCalledWith('dm:dm1');
    expect(mockServer.emit).toHaveBeenCalledWith('dm-message-created', {
      id: 'msg1',
    });
  });

  it('should normalize errors on send failure', async () => {
    commandService.send.mockRejectedValueOnce(new Error('Channel denied.'));
    const client = { data: { userId: 'u1' } } as any;
    const request = { channelId: 'dm1', content: 'hi' };

    const result = await gateway.send(client, request);

    expect(errorNormalizer.normalize).toHaveBeenCalledWith(
      expect.any(Error),
      'dm-send',
    );
    expect(result).toEqual({ error: true });
  });

  it('should reject an unauthenticated connection outright', async () => {
    connectionAuth.authenticate.mockResolvedValue(null);
    const client = { disconnect: jest.fn(), emit: jest.fn() } as any;

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(connectionLimit.acquire).not.toHaveBeenCalled();
  });

  it('should disconnect a user over the connection cap', async () => {
    connectionLimit.acquire.mockResolvedValueOnce(false);
    const client = { disconnect: jest.fn(), emit: jest.fn() } as any;

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ statusCode: 429 }),
    );
  });

  it('should release the connection slot on disconnect', async () => {
    const client = { data: { userId: 'u1' } } as any;

    await gateway.handleDisconnect(client);

    expect(connectionLimit.release).toHaveBeenCalledWith('u1');
  });
});
