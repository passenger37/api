import { ForbiddenException, Injectable } from '@nestjs/common';

import { ServerMemberRepository } from '../repositories/server-member.repository';
import { ServerRoleRepository } from '../repositories/server-role.repository';

@Injectable()
export class ServerHierarchyService {
  constructor(
    private readonly memberRepository: ServerMemberRepository,
    private readonly roleRepository: ServerRoleRepository,
  ) {}

  async getHighestRole(serverId: string, userId: string) {
    return this.memberRepository.findHighestRole(serverId, userId);
  }

  async requireHigherRole(
    serverId: string,
    actorId: string,
    targetRolePosition: number,
  ) {
    const actorHighest = await this.getHighestRole(serverId, actorId);

    if (!actorHighest) {
      throw new ForbiddenException('No server role found.');
    }

    if (actorHighest.position <= targetRolePosition) {
      throw new ForbiddenException(
        'Cannot manage a role equal to or higher than your highest role.',
      );
    }
  }

  async requireManageRole(
    serverId: string,
    actorId: string,
    targetRoleId: string,
  ) {
    const actorHighest = await this.getHighestRole(serverId, actorId);

    if (!actorHighest) {
      throw new ForbiddenException('No server role found.');
    }

    const targetRole = await this.roleRepository.findById(targetRoleId);

    if (!targetRole) {
      throw new ForbiddenException('Role not found.');
    }

    if (actorHighest.position <= targetRole.position) {
      throw new ForbiddenException(
        'You cannot manage a role equal to or higher than your highest role.',
      );
    }
  }
}
