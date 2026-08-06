import { Injectable, ForbiddenException } from '@nestjs/common';
import { ServerPermission } from '@prisma/client';

import { ServerMemberQueryService } from './server-member-query.service';

@Injectable()
export class ServerPermissionService {
  /**
   * Cache:
   * Key = serverId:userId
   * Value = Set<ServerPermission>
   */
  private readonly permissionCache = new Map<string, Set<ServerPermission>>();

  constructor(private readonly memberQueryService: ServerMemberQueryService) {}

  private getCacheKey(serverId: string, userId: string): string {
    return `${serverId}:${userId}`;
  }

  async hasPermission(
    serverId: string,
    userId: string,
    permission: ServerPermission,
  ): Promise<boolean> {
    const cacheKey = this.getCacheKey(serverId, userId);

    const cached = this.permissionCache.get(cacheKey);

    if (cached) {
      return (
        cached.has(ServerPermission.ADMINISTRATOR) || cached.has(permission)
      );
    }

    const member = await this.memberQueryService.getMemberWithRoles(
      serverId,
      userId,
    );

    if (!member) {
      return false;
    }

    const permissionSet = new Set<ServerPermission>();

    for (const assignment of member.roles) {
      for (const rolePermission of assignment.role.permissions) {
        permissionSet.add(rolePermission.permission);
      }
    }

    this.permissionCache.set(cacheKey, permissionSet);

    return (
      permissionSet.has(ServerPermission.ADMINISTRATOR) ||
      permissionSet.has(permission)
    );
  }

  async requirePermission(
    serverId: string,
    userId: string,
    permission: ServerPermission,
  ): Promise<void> {
    const allowed = await this.hasPermission(serverId, userId, permission);

    if (!allowed) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }

  clearCache(serverId: string, userId: string): void {
    this.permissionCache.delete(this.getCacheKey(serverId, userId));
  }

  clearServerCache(serverId: string): void {
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${serverId}:`)) {
        this.permissionCache.delete(key);
      }
    }
  }

  clearAllCache(): void {
    this.permissionCache.clear();
  }
}
