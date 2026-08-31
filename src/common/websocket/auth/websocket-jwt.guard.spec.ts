import { UnauthorizedException } from '@nestjs/common';

import { WebSocketJwtGuard } from './websocket-jwt.guard';
import { WebSocketConnectionAuthService } from './websocket-connection-auth.service';

describe('WebSocketJwtGuard', () => {
  const connectionAuth = {
    authenticate: jest.fn(),
  } as unknown as WebSocketConnectionAuthService;

  const guard = new WebSocketJwtGuard(connectionAuth);

  const client = {
    handshake: { auth: {} as Record<string, unknown> },
    data: {} as Record<string, unknown>,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    client.data = {};
  });

  it('rejects an unauthenticated handshake', async () => {
    (connectionAuth.authenticate as jest.Mock).mockResolvedValue(null);

    await expect(
      guard.canActivate({
        switchToWs: () => ({ getClient: () => client }),
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('passes an authenticated handshake through', async () => {
    (connectionAuth.authenticate as jest.Mock).mockResolvedValue({
      userId: 'user-1',
    });

    await expect(
      guard.canActivate({
        switchToWs: () => ({ getClient: () => client }),
      } as never),
    ).resolves.toBe(true);
    expect(connectionAuth.authenticate).toHaveBeenCalledWith(client);
  });
});
