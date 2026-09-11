import { RealtimeGateway } from './realtime.gateway';
import { RealtimePresenceStatus, RealtimePresencePrivacy } from '../types/realtime.types';

describe('RealtimeGateway Integration', () => {
  let gateway: RealtimeGateway;
  let errorNormalizer: any;
  let rateLimit: any;
  let presenceService: any;
  let typingService: any;
  let accessService: any;
  let bridge: any;
  let connectionAuth: any;
  let connectionLimit: any;
  let commentAuthorizationService: any;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(() => {
    errorNormalizer = { normalize: jest.fn().mockReturnValue({ error: true }) };
    rateLimit = { consume: jest.fn().mockResolvedValue(undefined) };
    presenceService = {
      attachSession: jest.fn().mockResolvedValue(undefined),
      detachSession: jest.fn().mockResolvedValue(undefined),
      heartbeat: jest.fn().mockResolvedValue(undefined),
      setStatus: jest.fn().mockResolvedValue({
        userId: 'u1',
        status: RealtimePresenceStatus.ONLINE,
        lastSeen: Date.now(),
        sessionCount: 1,
        privacy: RealtimePresencePrivacy.EVERYONE,
      }),
      getVisibleStatus: jest.fn().mockResolvedValue({
        userId: 'u1',
        status: RealtimePresenceStatus.ONLINE,
        lastSeen: Date.now(),
        sessionCount: 1,
      }),
      getStatus: jest.fn().mockResolvedValue({
        userId: 'u1',
        status: RealtimePresenceStatus.ONLINE,
        lastSeen: Date.now(),
        sessionCount: 1,
        privacy: RealtimePresencePrivacy.EVERYONE,
      }),
      canViewerSeePresence: jest.fn().mockResolvedValue(true),
    };
    typingService = {
      startTyping: jest.fn().mockResolvedValue({ channelId: 'c1', userId: 'u1' }),
      stopTyping: jest.fn().mockResolvedValue({ channelId: 'c1', userId: 'u1' }),
    };
    accessService = {
      validateChannelAccess: jest.fn().mockResolvedValue({
        channelId: 'c1',
        serverId: 's1',
        username: 'testuser',
      }),
    };
    bridge = { registerHandler: jest.fn(), publish: jest.fn().mockResolvedValue(undefined) };
    connectionAuth = { authenticate: jest.fn().mockResolvedValue({ userId: 'u1' }) };
    connectionLimit = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    };
    commentAuthorizationService = {
      resolvePostType: jest.fn().mockResolvedValue('PERSONAL'),
      resolvePost: jest.fn().mockResolvedValue({
        postId: 'p1',
        postType: 'PERSONAL',
        authorId: 'u1',
      }),
      assertCanAccessPost: jest.fn().mockResolvedValue(undefined),
    };

    gateway = new RealtimeGateway(
      errorNormalizer,
      rateLimit,
      presenceService,
      typingService,
      accessService,
      bridge,
      connectionAuth,
      connectionLimit,
      commentAuthorizationService as any,
    );

    // @ts-ignore
    gateway.server = mockServer;

    // Initialize bridge handlers
    gateway.onModuleInit();
  });

  it('should connect authenticated user, attach session, join rooms, publish online', async () => {
    const client = { disconnect: jest.fn(), emit: jest.fn(), join: jest.fn(), data: {}, id: 's1' } as any;

    await gateway.handleConnection(client);

    expect(connectionAuth.authenticate).toHaveBeenCalledWith(client);
    expect(connectionLimit.acquire).toHaveBeenCalledWith('u1');
    expect(presenceService.attachSession).toHaveBeenCalledWith('u1', 's1');
    expect(client.join).toHaveBeenCalledWith('rt:user:u1');
    expect(client.join).toHaveBeenCalledWith('realtime');
    expect(bridge.publish).toHaveBeenCalledWith(expect.objectContaining({
      type: 'presence:online',
      presence: expect.objectContaining({ userId: 'u1' }),
    }));
  });

  it('should reject unauthenticated connection', async () => {
    connectionAuth.authenticate.mockResolvedValueOnce(null);
    const client = { disconnect: jest.fn(), emit: jest.fn() } as any;

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(connectionLimit.acquire).not.toHaveBeenCalled();
  });

  it('should disconnect user over connection cap', async () => {
    connectionLimit.acquire.mockResolvedValueOnce(false);
    const client = { disconnect: jest.fn(), emit: jest.fn() } as any;

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.emit).toHaveBeenCalledWith('error', expect.objectContaining({ statusCode: 429 }));
  });

  it('should release connection slot on disconnect and publish offline', async () => {
    const client = { data: { userId: 'u1' }, id: 's1' } as any;

    await gateway.handleDisconnect(client);

    expect(connectionLimit.release).toHaveBeenCalledWith('u1');
    expect(presenceService.detachSession).toHaveBeenCalledWith('u1', 's1');
    expect(bridge.publish).toHaveBeenCalledWith(expect.objectContaining({
      type: 'presence:offline',
    }));
  });

  it('should handle heartbeat and return presence', async () => {
    const client = { data: { userId: 'u1' }, id: 's1' } as any;

    const result = await gateway.heartbeat(client);

    expect(rateLimit.consume).toHaveBeenCalledWith({
      key: 'ws:heartbeat:u1',
      limit: 30,
      windowSeconds: 10,
    });
    expect(presenceService.heartbeat).toHaveBeenCalledWith('u1', 's1');
    expect(result.success).toBe(true);
    expect(result.event).toBe('heartbeat');
  });

  it('should set presence and publish update', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { status: RealtimePresenceStatus.DND, privacy: RealtimePresencePrivacy.EVERYONE };

    const result = await gateway.setPresence(client, request as any);

    expect(rateLimit.consume).toHaveBeenCalledWith({
      key: 'ws:presence-set:u1',
      limit: 10,
      windowSeconds: 10,
    });
    expect(presenceService.setStatus).toHaveBeenCalledWith('u1', RealtimePresenceStatus.DND, RealtimePresencePrivacy.EVERYONE);
    expect(bridge.publish).toHaveBeenCalledWith(expect.objectContaining({
      type: 'presence:update',
    }));
    expect(result.success).toBe(true);
  });

  it('should get visible presence of another user', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { userId: 'u2' };

    const result = await gateway.getPresence(client, request as any);

    expect(presenceService.getVisibleStatus).toHaveBeenCalledWith('u2');
    expect(result.success).toBe(true);
    expect(result.presence.userId).toBe('u1'); // from mock
  });

  it('should subscribe to presence and enforce privacy', async () => {
    const client = { data: { userId: 'u1' }, join: jest.fn() } as any;
    const request = { userId: 'u2' };

    const result = await gateway.subscribePresence(client, request as any);

    expect(presenceService.canViewerSeePresence).toHaveBeenCalledWith('u2', 'u1');
    expect(client.join).toHaveBeenCalledWith('rt:user:u2');
    expect(result.success).toBe(true);
  });

  it('should reject presence subscribe when privacy blocks', async () => {
    presenceService.canViewerSeePresence.mockResolvedValueOnce(false);
    const client = { data: { userId: 'u1' }, join: jest.fn() } as any;
    const request = { userId: 'u2' };

    const result = await gateway.subscribePresence(client, request as any);

    expect(errorNormalizer.normalize).toHaveBeenCalled();
    expect(result).toEqual({ error: true });
  });

  it('should unsubscribe from presence', async () => {
    const client = { data: { userId: 'u1' }, leave: jest.fn() } as any;
    const request = { userId: 'u2' };

    const result = await gateway.unsubscribePresence(client, request as any);

    expect(client.leave).toHaveBeenCalledWith('rt:user:u2');
    expect(result.success).toBe(true);
  });

  it('should join channel after validating access', async () => {
    const client = { data: { userId: 'u1' }, join: jest.fn() } as any;
    const request = { channelId: 'c1' };

    const result = await gateway.joinChannel(client, request as any);

    expect(accessService.validateChannelAccess).toHaveBeenCalledWith('c1', 'u1');
    expect(client.join).toHaveBeenCalledWith('rt:channel:c1');
    expect(result.success).toBe(true);
  });

  it('should leave channel', async () => {
    const client = { data: { userId: 'u1' }, leave: jest.fn() } as any;
    const request = { channelId: 'c1' };

    const result = await gateway.leaveChannel(client, request as any);

    expect(client.leave).toHaveBeenCalledWith('rt:channel:c1');
    expect(result.success).toBe(true);
  });

  it('should join a post room after validating access', async () => {
    const client = { data: { userId: 'u1' }, join: jest.fn() } as any;
    const request = { postId: 'p1' };

    const result = await gateway.joinPost(client, request as any);

    expect(commentAuthorizationService.resolvePostType).toHaveBeenCalledWith('p1');
    expect(commentAuthorizationService.assertCanAccessPost).toHaveBeenCalled();
    expect(client.join).toHaveBeenCalledWith('rt:post:p1');
    expect(result.success).toBe(true);
  });

  it('should leave a post room', async () => {
    const client = { data: { userId: 'u1' }, leave: jest.fn() } as any;
    const request = { postId: 'p1' };

    const result = await gateway.leavePost(client, request as any);

    expect(client.leave).toHaveBeenCalledWith('rt:post:p1');
    expect(result.success).toBe(true);
  });

  it('should start typing after validating access', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { channelId: 'c1' };

    const result = await gateway.typingStart(client, request as any);

    expect(accessService.validateChannelAccess).toHaveBeenCalledWith('c1', 'u1');
    expect(typingService.startTyping).toHaveBeenCalledWith('c1', 'u1');
    expect(bridge.publish).toHaveBeenCalledWith(expect.objectContaining({
      type: 'typing:start',
      channelId: 'c1',
      userId: 'u1',
      username: 'testuser',
    }));
    expect(result.success).toBe(true);
  });

  it('should stop typing after validating access', async () => {
    const client = { data: { userId: 'u1' } } as any;
    const request = { channelId: 'c1' };

    const result = await gateway.typingStop(client, request as any);

    expect(accessService.validateChannelAccess).toHaveBeenCalledWith('c1', 'u1');
    expect(typingService.stopTyping).toHaveBeenCalledWith('c1', 'u1');
    expect(bridge.publish).toHaveBeenCalledWith(expect.objectContaining({
      type: 'typing:stop',
      channelId: 'c1',
      userId: 'u1',
    }));
    expect(result.success).toBe(true);
  });

  it('should normalize errors on failure', async () => {
    rateLimit.consume.mockRejectedValueOnce(new Error('Rate limited'));
    const client = { data: { userId: 'u1' } } as any;

    const result = await gateway.heartbeat(client);

    expect(errorNormalizer.normalize).toHaveBeenCalledWith(expect.any(Error), 'heartbeat');
    expect(result).toEqual({ error: true });
  });

  it('should forward presence:online/offline/update to local clients via bridge handler', () => {
    mockServer.to.mockClear();
    mockServer.emit.mockClear();

    const presence = { userId: 'u1', status: RealtimePresenceStatus.ONLINE, lastSeen: 1000, sessionCount: 1 };

    const handler = bridge.registerHandler.mock.calls[0][0];
    handler({ type: 'presence:online', presence });

    expect(mockServer.to).toHaveBeenCalledWith('rt:user:u1');
    expect(mockServer.emit).toHaveBeenCalledWith('presence:online', expect.any(Object));
    expect(mockServer.to).toHaveBeenCalledWith('realtime');
  });

  it('should forward presence:update to user room only when INVISIBLE', () => {
    mockServer.to.mockClear();
    mockServer.emit.mockClear();

    const presence = { userId: 'u1', status: RealtimePresenceStatus.INVISIBLE, lastSeen: 1000, sessionCount: 1 };

    const handler = bridge.registerHandler.mock.calls[0][0];
    handler({ type: 'presence:update', presence });

    expect(mockServer.to).toHaveBeenCalledWith('rt:user:u1');
    expect(mockServer.to).not.toHaveBeenCalledWith('realtime');
  });

  it('should forward typing:start/stop to channel room', () => {
    mockServer.to.mockClear();
    mockServer.emit.mockClear();

    const handler = bridge.registerHandler.mock.calls[0][0];
    handler({ type: 'typing:start', channelId: 'c1', userId: 'u1', username: 'test' });

    expect(mockServer.to).toHaveBeenCalledWith('rt:channel:c1');
    expect(mockServer.emit).toHaveBeenCalledWith('typing:start', expect.any(Object));
  });

  it('should forward comment events to the post room', () => {
    mockServer.to.mockClear();
    mockServer.emit.mockClear();

    const handler = bridge.registerHandler.mock.calls[0][0];
    handler({
      type: 'comment:created',
      postId: 'p1',
      postType: 'PERSONAL',
      commentId: 'c1',
      comment: { id: 'c1' },
    });

    expect(mockServer.to).toHaveBeenCalledWith('rt:post:p1');
    expect(mockServer.emit).toHaveBeenCalledWith('comment:created', expect.any(Object));
  });
});