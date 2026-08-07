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
    // -------------------------------------------------
    // Load Member with Roles
    // -------------------------------------------------

    const member = await this.memberQueryService.getMemberWithRoles(
      serverId,
      userId,
    );

    if (!member) {
      return new Set<ServerPermission>();
    }

    // -------------------------------------------------
    // Collect Base Role Permissions
    // -------------------------------------------------

    const permissions = new Set<ServerPermission>();

    for (const assignment of member.roles) {
      for (const permission of assignment.role.permissions) {
        permissions.add(permission.permission);
      }
    }

    // -------------------------------------------------
    // Administrator Shortcut
    // -------------------------------------------------

    if (permissions.has(ServerPermission.ADMINISTRATOR)) {
      return new Set<ServerPermission>(Object.values(ServerPermission));
    }

    // -------------------------------------------------
    // Server-Level Permissions Only
    // -------------------------------------------------

    if (!channelId) {
      return permissions;
    }

    // -------------------------------------------------
    // Load Only Required Overwrites
    // -------------------------------------------------

    const roleIds = member.roles.map((role) => role.roleId);

    const roleOverwrites = await this.overwriteRepository.findRoleOverwrites(
      channelId,
      roleIds,
    );

    const memberOverwrites =
      await this.overwriteRepository.findMemberOverwrites(channelId, member.id);

    // -------------------------------------------------
    // Apply Role Overwrites
    // -------------------------------------------------

    for (const overwrite of roleOverwrites) {
      if (overwrite.allow) {
        permissions.add(overwrite.permission);
      }

      if (overwrite.deny) {
        permissions.delete(overwrite.permission);
      }
    }

    // -------------------------------------------------
    // Apply Member Overwrites
    // -------------------------------------------------

    for (const overwrite of memberOverwrites) {
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
