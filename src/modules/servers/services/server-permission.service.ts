import { Injectable, ForbiddenException } from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { ServerPermissionResolverService } from './server-permission-resolver.service';

@Injectable()
export class ServerPermissionService {
  private readonly permissionCache = new Map<string, Set<ServerPermission>>();

  constructor(private readonly resolver: ServerPermissionResolverService) {}

  private getCacheKey(
    serverId: string,
    userId: string,
    channelId?: string,
  ): string {
    return `${serverId}:${userId}:${channelId ?? 'server'}`;
  }

  clearCache(serverId: string, userId: string, channelId?: string) {
    this.permissionCache.delete(this.getCacheKey(serverId, userId, channelId));
  }

  async getPermissions(
    serverId: string,
    userId: string,
    channelId?: string,
  ): Promise<Set<ServerPermission>> {
    const cacheKey = this.getCacheKey(serverId, userId, channelId);

    const cached = this.permissionCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const permissions = await this.resolver.resolvePermissions(
      serverId,
      userId,
      channelId,
    );

    this.permissionCache.set(cacheKey, permissions);

    return permissions;
  }

  async hasPermission(
    serverId: string,
    userId: string,
    permission: ServerPermission,
    channelId?: string,
  ): Promise<boolean> {
    const permissions = await this.getPermissions(serverId, userId, channelId);

    return permissions.has(permission);
  }

  async requirePermission(
    serverId: string,
    userId: string,
    permission: ServerPermission,
    channelId?: string,
  ): Promise<void> {
    const allowed = await this.hasPermission(
      serverId,
      userId,
      permission,
      channelId,
    );

    if (!allowed) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }
}
