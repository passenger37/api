import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { SessionsService } from '../../modules/sessions/services/sessions.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const sessionsService = {
    findBySessionId: jest.fn(),
  } as unknown as SessionsService;
  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;
  const request: {
    cookies: Record<string, string>;
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
    configService.get = jest.fn().mockReturnValue('nexus_session');
    request.cookies = { nexus_session: 'session-id' };
    delete request.user;
  });

  it('authenticates an active, unexpired cookie session', async () => {
    sessionsService.findBySessionId = jest.fn().mockResolvedValue({
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-id',
        email: 'user@example.com',
        username: 'user',
        status: 'ACTIVE',
        deletedAt: null,
        permissionVersion: 1,
      },
    });

    const guard = new JwtAuthGuard(reflector, sessionsService, configService);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'user-id',
      sub: 'user-id',
      email: 'user@example.com',
      username: 'user',
      permissionVersion: 1,
    });
  });

  it.each([
    ['revoked', { isRevoked: true, expiresAt: new Date(Date.now() + 60_000) }],
    ['expired', { isRevoked: false, expiresAt: new Date(Date.now() - 60_000) }],
    [
      'suspended',
      { isRevoked: false, expiresAt: new Date(Date.now() + 60_000) },
    ],
  ])('does not authenticate a %s cookie session', async (_state, session) => {
    sessionsService.findBySessionId = jest.fn().mockResolvedValue({
      ...session,
      user: {
        id: 'user-id',
        email: 'user@example.com',
        username: 'user',
        status: 'SUSPENDED',
        deletedAt: null,
        permissionVersion: 1,
      },
    });
    const parentCanActivate = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockResolvedValue(false);
    const guard = new JwtAuthGuard(reflector, sessionsService, configService);

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(request).not.toHaveProperty('user');

    parentCanActivate.mockRestore();
  });

  it('reads the session cookie name from configuration', async () => {
    configService.get = jest.fn().mockReturnValue('custom_session');
    request.cookies = { custom_session: 'session-id' };

    sessionsService.findBySessionId = jest.fn().mockResolvedValue({
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-id',
        email: 'user@example.com',
        username: 'user',
        status: 'ACTIVE',
        deletedAt: null,
        permissionVersion: 1,
      },
    });

    const guard = new JwtAuthGuard(reflector, sessionsService, configService);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(configService.get).toHaveBeenCalledWith('session.cookie.name');
  });
});
