import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UserQueryService } from '../../users/services/user-query.service';
import { WebSocketJwtGuard } from './websocket-jwt.guard';

describe('WebSocketJwtGuard', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  const userQueryService = {
    findById: jest.fn(),
  } as unknown as UserQueryService;

  const guard = new WebSocketJwtGuard(
    jwtService as never,
    userQueryService as never,
  );

  const client = {
    handshake: { auth: {} as Record<string, unknown> },
    data: {} as Record<string, unknown>,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    client.data = {};
  });

  it('rejects a connection without a token', async () => {
    await expect(
      guard.canActivate({
        switchToWs: () => ({ getClient: () => client }),
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid or expired token', async () => {
    client.handshake.auth = { token: 'token' };
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
      new UnauthorizedException(),
    );

    await expect(
      guard.canActivate({
        switchToWs: () => ({ getClient: () => client }),
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('authenticates a valid token for an active user', async () => {
    client.handshake.auth = { token: 'token' };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1' });
    (userQueryService.findById as jest.Mock).mockResolvedValue({
      status: 'ACTIVE',
      deletedAt: null,
    });

    await expect(
      guard.canActivate({
        switchToWs: () => ({ getClient: () => client }),
      } as never),
    ).resolves.toBe(true);
    expect(client.data.userId).toBe('user-1');
  });

  it.each([
    ['missing', null],
    ['suspended', { status: 'SUSPENDED', deletedAt: null }],
    ['deleted', { status: 'DELETED', deletedAt: new Date() }],
  ])('rejects a valid token for a %s user', async (_label, user) => {
    client.handshake.auth = { token: 'token' };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1' });
    (userQueryService.findById as jest.Mock).mockResolvedValue(user);

    await expect(
      guard.canActivate({
        switchToWs: () => ({ getClient: () => client }),
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
