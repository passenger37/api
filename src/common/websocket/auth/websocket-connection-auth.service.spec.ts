import { JwtService } from '@nestjs/jwt';

import { UserStatus } from '@prisma/client';

import { UserQueryService } from '../../../modules/users/services/user-query.service';
import { WebSocketConnectionAuthService } from './websocket-connection-auth.service';

describe('WebSocketConnectionAuthService', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  const userQueryService = {
    findById: jest.fn(),
  } as unknown as UserQueryService;

  const service = new WebSocketConnectionAuthService(
    jwtService,
    userQueryService,
  );

  const client = {
    handshake: { auth: {} as Record<string, unknown> },
    data: {} as Record<string, unknown>,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    client.handshake.auth = {};
    client.data = {};
  });

  it('returns null when there is no token', async () => {
    await expect(service.authenticate(client as never)).resolves.toBeNull();
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('returns null for an invalid or expired token', async () => {
    client.handshake.auth = { token: 'bad-token' };
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('exp'));

    await expect(service.authenticate(client as never)).resolves.toBeNull();
  });

  it('returns null for a token without a subject', async () => {
    client.handshake.auth = { token: 'good-token' };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: undefined });

    await expect(service.authenticate(client as never)).resolves.toBeNull();
  });

  it('returns null when the user is missing, suspended or deleted', async () => {
    client.handshake.auth = { token: 'good-token' };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1' });
    (userQueryService.findById as jest.Mock).mockResolvedValue({
      status: UserStatus.SUSPENDED,
      deletedAt: null,
    });

    await expect(service.authenticate(client as never)).resolves.toBeNull();
  });

  it('sets client.data.userId and returns the user for an active account', async () => {
    client.handshake.auth = { token: 'good-token' };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1' });
    (userQueryService.findById as jest.Mock).mockResolvedValue({
      status: UserStatus.ACTIVE,
      deletedAt: null,
    });

    await expect(service.authenticate(client as never)).resolves.toEqual({
      userId: 'user-1',
    });
    expect(client.data.userId).toBe('user-1');
  });
});
