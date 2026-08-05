import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { ServerPermission } from '@prisma/client';

import { ServerPermissionService } from '../services/server-permission.service';
import { ServerMemberQueryService } from '../services/server-member-query.service';

import { SERVER_PERMISSION_KEY } from '../decorators/require-server-permission.decorator';

@Injectable()
export class ServerPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly memberQueryService: ServerMemberQueryService,
    private readonly permissionService: ServerPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<ServerPermission>(
      SERVER_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const userId = request.user?.id;
    const serverId = request.params.serverId;

    const member = await this.memberQueryService.getMember(serverId, userId);

    if (!member) {
      throw new ForbiddenException('You are not a member of this server.');
    }

    await this.permissionService.requirePermission(
      serverId,
      userId,
      permission,
    );

    return true;
  }
}
