import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

import { AuthorizedRequest } from '../interfaces/authorized-request.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions required
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthorizedRequest>();

    if (!request.user) {
      throw new ForbiddenException('User not authenticated.');
    }

    if (!request.authorization) {
      throw new ForbiddenException('Authorization context not found.');
    }

    const permissions = new Set(
      request.authorization.roles.flatMap((role) =>
        role.permissions.map((permission) => permission.name),
      ),
    );

    const allowed = requiredPermissions.every((permission) =>
      permissions.has(permission),
    );

    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions.');
    }

    return true;
  }
}
