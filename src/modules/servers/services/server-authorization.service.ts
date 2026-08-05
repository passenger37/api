import { ForbiddenException, Injectable } from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { ServerPermissionService } from './server-permission.service';

@Injectable()
export class ServerAuthorizationService {
  constructor(private readonly permissionService: ServerPermissionService) {}

  async requirePermission(
    serverId: string,
    userId: string,
    permission: ServerPermission,
  ) {
    await this.permissionService.requirePermission(
      serverId,
      userId,
      permission,
    );
  }
}
