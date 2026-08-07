import { Injectable } from '@nestjs/common';
import { ServerPermission } from '@prisma/client';

import { ServerMemberQueryService } from './server-member-query.service';
import { ServerChannelPermissionOverwriteRepository } from '../repositories/server-channel-permission-overwrite.repository';

@Injectable()
export class ServerPermissionResolverService {
  constructor(
    private readonly memberQueryService: ServerMemberQueryService,
    private readonly overwriteRepository: ServerChannelPermissionOverwriteRepository,
  ) {}

  async resolvePermissions(
    serverId: string,
    userId: string,
    channelId?: string,
  ): Promise<Set<ServerPermission>> {
    const member = await this.memberQueryService.getMemberWithRoles(
      serverId,
      userId,
    );

    if (!member) {
      return new Set<ServerPermission>();
    }

    const permissions = new Set<ServerPermission>();

    // -----------------------------
    // Base Role Permissions
    // -----------------------------
    for (const assignment of member.roles) {
      for (const permission of assignment.role.permissions) {
        permissions.add(permission.permission);
      }
    }

    // -----------------------------
    // Administrator Shortcut
    // -----------------------------
    if (permissions.has(ServerPermission.ADMINISTRATOR)) {
      return new Set(Object.values(ServerPermission));
    }

    // -----------------------------
    // Server-level check only
    // -----------------------------
    if (!channelId) {
      return permissions;
    }

    // -----------------------------
    // Channel Overwrites
    // -----------------------------
    const overwrites =
      await this.overwriteRepository.findAllForChannel(channelId);

    // -----------------------------
    // Role Overwrites
    // -----------------------------
    for (const overwrite of overwrites) {
      if (!overwrite.roleId) {
        continue;
      }

      const hasRole = member.roles.some(
        (role) => role.roleId === overwrite.roleId,
      );

      if (!hasRole) {
        continue;
      }

      if (overwrite.allow) {
        permissions.add(overwrite.permission);
      }

      if (overwrite.deny) {
        permissions.delete(overwrite.permission);
      }
    }

    // -----------------------------
    // Member Overwrites
    // -----------------------------
    for (const overwrite of overwrites) {
      if (overwrite.memberId !== member.id) {
        continue;
      }

      if (overwrite.allow) {
        permissions.add(overwrite.permission);
      }

      if (overwrite.deny) {
        permissions.delete(overwrite.permission);
      }
    }

    return permissions;
  }
}
