import { Injectable, ForbiddenException } from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { ServerPermissionResolverService } from './server-permission-resolver.service';

@Injectable()
export class ServerPermissionService {
  private readonly CACHE_TTL_MS = 30_000;

  private readonly permissionCache = new Map<
    string,
    {
      permissions: Set<ServerPermission>;
      expiresAt: number;
    }
  >();
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

  clearUserCache(serverId: string, userId: string) {
    const prefix = `${serverId}:${userId}:`;

    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(prefix)) {
        this.permissionCache.delete(key);
      }
    }
  }

  async getPermissions(
    serverId: string,
    userId: string,
    channelId?: string,
  ): Promise<Set<ServerPermission>> {
    const cacheKey = this.getCacheKey(serverId, userId, channelId);

    const cached = this.permissionCache.get(cacheKey);

    if (cached) {
      if (cached.expiresAt > Date.now()) {
        return cached.permissions;
      }

      // Cache entry expired.
      this.permissionCache.delete(cacheKey);
    }

    const permissions = await this.resolver.resolvePermissions(
      serverId,
      userId,
      channelId,
    );

    this.permissionCache.set(cacheKey, {
      permissions: new Set(permissions),
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return new Set(permissions);
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
