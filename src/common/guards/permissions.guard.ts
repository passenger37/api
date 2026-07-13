import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthorizationService } from '../../modules/auth/services/authorization.service';

@Injectable()
export class PermissionsGuard
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        'permissions',
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'User not authenticated',
      );
    }

    const userPermissions =
      await this.authorizationService.getUserPermissions(
        user.id,
      );

    const hasPermissions =
      requiredPermissions.every(permission =>
        userPermissions.includes(permission),
      );

    if (!hasPermissions) {
      throw new ForbiddenException(
        'Insufficient permissions',
      );
    }

    return true;
  }
}