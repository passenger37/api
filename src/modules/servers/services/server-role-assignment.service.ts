import { Injectable } from '@nestjs/common';
import { Prisma, ServerPermission } from '@prisma/client';
import { ServerRoleAssignmentRepository } from '../repositories/server-role-assignment.repository';

@Injectable()
export class ServerRoleAssignmentService {
  constructor(
    private readonly assignmentRepository: ServerRoleAssignmentRepository,
  ) {}

  async assignRole(
    memberId: string,
    roleId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const exists = await this.assignmentRepository.exists(memberId, roleId, tx);

    if (exists) {
      return;
    }

    await this.assignmentRepository.create(
      {
        member: {
          connect: {
            id: memberId,
          },
        },

        role: {
          connect: {
            id: roleId,
          },
        },
      },
      tx,
    );
  }
  async getRoles(memberId: string, tx?: Prisma.TransactionClient) {
    return this.assignmentRepository.findRoles(memberId, tx);
  }

  async hasRole(
    memberId: string,
    roleName: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const role = await this.assignmentRepository.findRole(
      memberId,
      roleName,
      tx,
    );

    return !!role;
  }

  async getMemberPermissions(
    memberId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Set<ServerPermission>> {
    const assignments = await this.assignmentRepository.findMemberPermissions(
      memberId,
      tx,
    );

    const permissions = new Set<ServerPermission>();

    for (const assignment of assignments) {
      for (const permission of assignment.role.permissions) {
        permissions.add(permission.permission);
      }
    }

    return permissions;
  }
}
