import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';

import { SuperAdminGuard } from './super-admin.guard';
import { AuthorizationService } from '../../modules/authorization/services/authorization.service';
import { SystemRole } from '../constants/system-role.enum';

describe('SuperAdminGuard', () => {
  const authorizationService = {
    hasRole: jest.fn(),
  } as unknown as AuthorizationService;

  const request: { user?: { id: string } } = {};
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
    request.user = { id: 'user-1' };
  });

  it('allows a user who holds the SUPER_ADMIN role', async () => {
    (authorizationService.hasRole as jest.Mock).mockResolvedValue(true);

    const guard = new SuperAdminGuard(authorizationService);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authorizationService.hasRole).toHaveBeenCalledWith(
      'user-1',
      SystemRole.SUPER_ADMIN,
    );
  });

  it('rejects a user without the role', async () => {
    (authorizationService.hasRole as jest.Mock).mockResolvedValue(false);

    const guard = new SuperAdminGuard(authorizationService);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects an unauthenticated request', async () => {
    delete request.user;

    const guard = new SuperAdminGuard(authorizationService);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(authorizationService.hasRole).not.toHaveBeenCalled();
  });
});
