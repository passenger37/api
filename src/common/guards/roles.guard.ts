import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { AuthorizationService } from '../../modules/authorization/services/authorization.service';

import { ROLES_KEY } from '../decorators/roles.decorator';

import { SystemRole } from '../constants/system-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,

    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    for (const role of requiredRoles) {
      const allowed = await this.authorizationService.hasRole(
        request.user.id,
        role,
      );

      if (!allowed) {
        throw new ForbiddenException('Insufficient role.');
      }
    }

    return true;

    // const authorizationContext =
    //   await this.authorizationService.getAuthorizationContext(
    //     request.user.id,
    //   );

    // const userRoles =
    //   authorizationContext.roles.map(
    //     role => role.name,
    //   );

    // const hasRole =
    //   requiredRoles.some(role =>
    //     userRoles.includes(role),
    //   );

    // if (!hasRole) {
    //   throw new ForbiddenException(
    //     'Insufficient role.',
    //   );
    // }
  }
}
