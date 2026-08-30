import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';

import { PermissionVersionGuard } from './permission-version.guard';
import { AuthorizationService } from '../../modules/authorization/services/authorization.service';

describe('PermissionVersionGuard', () => {
  const authorizationService = {
    getAuthorizationContext: jest.fn(),
  } as unknown as AuthorizationService;

  const request: { user?: { id: string; permissionVersion: number } } = {};
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    request.user = { id: 'user-1', permissionVersion: 3 };
  });

  it('allows a user whose permission version is current', async () => {
    (
      authorizationService.getAuthorizationContext as jest.Mock
    ).mockResolvedValue({ permissionVersion: 3 });

    const guard = new PermissionVersionGuard(authorizationService);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('requires re-authentication when the permission version changed', async () => {
    (
      authorizationService.getAuthorizationContext as jest.Mock
    ).mockResolvedValue({ permissionVersion: 4 });

    const guard = new PermissionVersionGuard(authorizationService);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an unauthenticated request', async () => {
    delete request.user;

    const guard = new PermissionVersionGuard(authorizationService);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authorizationService.getAuthorizationContext).not.toHaveBeenCalled();
  });
});
