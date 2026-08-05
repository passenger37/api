import { Injectable, ForbiddenException } from '@nestjs/common';
import { ServerPermission } from '@prisma/client';
import { ServerMemberQueryService } from './server-member-query.service';
import { ServerRoleAssignmentService } from './server-role-assignment.service';

@Injectable()
export class ServerPermissionService {
  constructor(
    private readonly roleAssignmentService: ServerRoleAssignmentService,
    private readonly memberQueryService: ServerMemberQueryService,
  ) {}

  async hasPermission(
    serverId: string,
    userId: string,
    permission: ServerPermission,
  ): Promise<boolean> {
    const member = await this.memberQueryService.getMemberWithRoles(
      serverId,
      userId,
    );

    if (!member) {
      return false;
    }

    for (const assignment of member.roles) {
      const role = assignment.role;

      const permissions = role.permissions.map((p) => p.permission);

      if (permissions.includes(ServerPermission.ADMINISTRATOR)) {
        return true;
      }

      if (permissions.includes(permission)) {
        return true;
      }
    }

    return false;
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
}
