import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { UserRolesRepository } from '../repositories';

@Injectable()
export class UserRoleDomainService {
  constructor(private readonly userRolesRepository: UserRolesRepository) {}

  // =====================================================
  // Assign One Role
  // =====================================================

  async assign(userId: string, roleId: string) {
    return this.userRolesRepository.create({
      user: {
        connect: {
          id: userId,
        },
      },

      role: {
        connect: {
          id: roleId,
        },
      },
    });
  }

  // =====================================================
  // Assign Multiple Roles
  // =====================================================

  async assignMany(userId: string, roleIds: string[]) {
    const data: Prisma.UserRoleCreateManyInput[] = roleIds.map((roleId) => ({
      userId,
      roleId,
    }));

    return this.userRolesRepository.createMany(data);
  }

  // =====================================================
  // Remove Role
  // =====================================================

  async remove(userId: string, roleId: string) {
    return this.userRolesRepository.deleteByUserAndRole(userId, roleId);
  }

  // =====================================================
  // Remove All Roles
  // =====================================================

  async removeAll(userId: string) {
    return this.userRolesRepository.deleteByUser(userId);
  }
}
