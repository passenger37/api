import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SessionsService } from '../../modules/sessions/services/sessions.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const sessionsService = {
    findBySessionId: jest.fn(),
  } as unknown as SessionsService;
  const request: {
    cookies: { nexus_session: string };
    user?: unknown;
  } = { cookies: { nexus_session: 'session-id' } };
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    reflector.getAllAndOverride = jest.fn().mockReturnValue(false);
    delete request.user;
  });

  it('authenticates an active, unexpired cookie session', async () => {
    sessionsService.findBySessionId = jest.fn().mockResolvedValue({
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'user-id', email: 'user@example.com', username: 'user' },
    });

    const guard = new JwtAuthGuard(reflector, sessionsService);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user-id',
      sub: 'user-id',
      email: 'user@example.com',
      username: 'user',
    });
  });

  it.each([
    ['revoked', { isRevoked: true, expiresAt: new Date(Date.now() + 60_000) }],
    ['expired', { isRevoked: false, expiresAt: new Date(Date.now() - 60_000) }],
  ])('does not authenticate a %s cookie session', async (_state, session) => {
    sessionsService.findBySessionId = jest.fn().mockResolvedValue({
      ...session,
      user: { id: 'user-id', email: 'user@example.com', username: 'user' },
    });
    const parentCanActivate = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockResolvedValue(false);
    const guard = new JwtAuthGuard(reflector, sessionsService);

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(request).not.toHaveProperty('user');

    parentCanActivate.mockRestore();
  });
});
