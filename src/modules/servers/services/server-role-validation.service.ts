import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ServerRoleRepository } from '../repositories/server-role.repository';
import { ServerRoleAssignmentRepository } from '../repositories/server-role-assignment.repository';
import { ServerRole } from '@prisma/client';

@Injectable()
export class ServerRoleValidationService {
  constructor(
    private readonly roleRepository: ServerRoleRepository,
    private readonly assignmentRepository: ServerRoleAssignmentRepository,
  ) {}

  async validateUniqueName(serverId: string, name: string) {
    const exists = await this.roleRepository.existsByName(serverId, name);

    if (exists) {
      throw new BadRequestException('Role name already exists.');
    }
  }

  async validateRoleExists(roleId: string) {
    const exists = await this.roleRepository.exists(roleId);

    if (!exists) {
      throw new NotFoundException('Role not found.');
    }
  }

  async validateRoleHasNoMembers(roleId: string) {
    const count = await this.assignmentRepository.countMembers(roleId);

    if (count > 0) {
      throw new BadRequestException(
        'Cannot delete a role that still has members.',
      );
    }
  }

  async validateNotDefaultRole(role: ServerRole) {
    if (role.position === 0) {
      throw new BadRequestException('Default role cannot be deleted.');
    }
  }
}
