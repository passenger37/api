import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { SystemRole } from '../constants/system-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<SystemRole[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (
      !requiredRoles ||
      requiredRoles.length === 0
    ) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'Authentication required.',
      );
    }

    // User.roles comes from Prisma include
    const userRoles =
      user.roles?.map(
        (userRole: any) =>
          userRole.role.name,
      ) ?? [];

    const hasRole =
      requiredRoles.some((role) =>
        userRoles.includes(role),
      );

    if (!hasRole) {
      throw new ForbiddenException(
        'Insufficient role.',
      );
    }

    return true;
  }
}