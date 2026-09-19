import { PresenceGateway } from './presence.gateway';
import { PresenceStatus } from '../services/presence.service';

describe('PresenceGateway Integration', () => {
  let gateway: PresenceGateway;
  let presenceService: any;
  let rateLimitService: any;
  let errorNormalizer: any;
  let connectionAuth: any;
  let connectionLimit: any;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(() => {
    presenceService = {
      markOnline: jest.fn().mockResolvedValue({
        userId: 'u1',
        status: PresenceStatus.ONLINE,
        lastSeen: 1700000000000,
      }),
      markOffline: jest.fn().mockResolvedValue({
        userId: 'u1',
        status: PresenceStatus.OFFLINE,
        lastSeen: 1700000000000,
      }),
      setStatus: jest.fn().mockResolvedValue({
        userId: 'u1',
        status: PresenceStatus.IDLE,
        lastSeen: 1700000000000,
      }),
      getVisibleStatus: jest.fn().mockResolvedValue({
        userId: 'u2',
        status: PresenceStatus.OFFLINE,
        lastSeen: null,
      }),
    };
    rateLimitService = { consume: jest.fn().mockResolvedValue(undefined) };
    errorNormalizer = { normalize: jest.fn().mockReturnValue({ error: true }) };
    connectionAuth = {
      authenticate: jest.fn().mockResolvedValue({ userId: 'u1' }),
    };
    connectionLimit = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    };

    gateway = new PresenceGateway(
      errorNormalizer,
      presenceService,
      rateLimitService,
      connectionAuth,
      connectionLimit,
    );

    // @ts-ignore
    gateway.server = mockServer;
  });

  it('should reject an unauthenticated connection before joining presence', async () => {
    connectionAuth.authenticate.mockResolvedValue(null);
    const client = {
      join: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      data: {},
    } as any;

    await gateway.handleConnection(client);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(presenceService.markOnline).not.toHaveBeenCalled();
  });

  it('should disconnect a user over the connection cap', async () => {
    connectionLimit.acquire.mockResolvedValueOnce(false);
    const client = {
      join: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      data: {},
    } as any;

    await gateway.handleConnection(client);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ statusCode: 429 }),
    );
  });

  it('should join the presence room and mark online on connection', async () => {
    const client = {
      join: jest.fn(),
      data: { userId: 'u1' },
      broadcast: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    } as any;

    gateway.handleConnection(client);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(client.join).toHaveBeenCalledWith('presence');
    expect(presenceService.markOnline).toHaveBeenCalledWith('u1');
    expect(client.broadcast.to).toHaveBeenCalledWith('presence');
    expect(client.broadcast.emit).toHaveBeenCalledWith('presence-change', {
      userId: 'u1',
      status: PresenceStatus.ONLINE,
      lastSeen: 1700000000000,
    });
  });

  it('should mark offline and broadcast on disconnect', async () => {
    const client = {
      data: { userId: 'u1' },
      broadcast: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    } as any;

    await gateway.handleDisconnect(client);

    expect(connectionLimit.release).toHaveBeenCalledWith('u1');
    expect(presenceService.markOffline).toHaveBeenCalledWith('u1');
    expect(client.broadcast.emit).toHaveBeenCalledWith('presence-change', {
      userId: 'u1',
      status: PresenceStatus.OFFLINE,
      lastSeen: 1700000000000,
    });
  });

  it('should broadcast presence-change on set-presence', async () => {
    const client = {
      data: { userId: 'u1' },
      broadcast: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    } as any;

    const result = await gateway.setPresence(client, {
      status: PresenceStatus.IDLE,
    });

    expect(rateLimitService.consume).toHaveBeenCalledWith({
      key: 'ws:set-presence:u1',
      limit: 10,
      windowSeconds: 10,
    });
    expect(presenceService.setStatus).toHaveBeenCalledWith(
      'u1',
      PresenceStatus.IDLE,
    );
    expect(client.broadcast.to).toHaveBeenCalledWith('presence');
    expect(client.broadcast.emit).toHaveBeenCalledWith('presence-change', {
      userId: 'u1',
      status: PresenceStatus.IDLE,
      lastSeen: 1700000000000,
    });
    expect(result).toEqual({
      success: true,
      presence: {
        userId: 'u1',
        status: PresenceStatus.IDLE,
        lastSeen: 1700000000000,
      },
    });
  });

  it('should not broadcast when set to invisible', async () => {
    presenceService.setStatus.mockResolvedValue({
      userId: 'u1',
      status: PresenceStatus.INVISIBLE,
      lastSeen: 1700000000000,
    });
    const client = {
      data: { userId: 'u1' },
      broadcast: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    } as any;

    const result = await gateway.setPresence(client, {
      status: PresenceStatus.INVISIBLE,
    });

    expect(client.broadcast.to).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('should return visible presence via get-presence', async () => {
    const client = { data: { userId: 'u1' } } as any;

    const result = await gateway.getPresence(client, { userId: 'u2' });

    expect(rateLimitService.consume).toHaveBeenCalledWith({
      key: 'ws:get-presence:u1',
      limit: 20,
      windowSeconds: 10,
    });
    expect(presenceService.getVisibleStatus).toHaveBeenCalledWith('u2');
    expect(result).toEqual({
      success: true,
      presence: {
        userId: 'u2',
        status: PresenceStatus.OFFLINE,
        lastSeen: null,
      },
    });
  });

  it('should normalize errors on set-presence failure', async () => {
    rateLimitService.consume.mockRejectedValueOnce(
      new Error('Too many WebSocket requests.'),
    );
    const client = {
      data: { userId: 'u1' },
      broadcast: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    } as any;

    const result = await gateway.setPresence(client, {
      status: PresenceStatus.IDLE,
    });

    expect(errorNormalizer.normalize).toHaveBeenCalledWith(
      expect.any(Error),
      'set-presence',
    );
    expect(result).toEqual({ error: true });
  });
});
