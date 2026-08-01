import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { AuthorizationService } from '../../modules/authorization/services/authorization.service';

import { RESOURCE_OWNER_KEY } from '../decorators/resource-owner.decorator';

import { ResourceOwnerOptions } from '../interfaces/resource-owner.interface';

@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,

    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<ResourceOwnerOptions>(
      RESOURCE_OWNER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated.');
    }

    const ownerId = request.params?.[options.param];

    if (!ownerId) {
      throw new ForbiddenException('Owner parameter not found.');
    }

    // Owner can always access
    if (ownerId === user.id) {
      return true;
    }

    // Optional admin bypass
    if (options.allowAdmins) {
      const isAdmin = await this.authorizationService.hasRole(user.id, 'ADMIN');

      if (isAdmin) {
        return true;
      }
    }

    throw new ForbiddenException('You do not own this resource.');
  }
}
