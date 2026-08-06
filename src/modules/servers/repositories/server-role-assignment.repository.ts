import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ServerRoleAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ServerMemberRoleCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.serverMemberRole.create({
      data,
    });
  }

  async findRoleIdsByMember(memberId: string): Promise<string[]> {
    const assignments = await this.prisma.serverMemberRole.findMany({
      where: {
        memberId,
      },
      select: {
        roleId: true,
      },
    });

    return assignments.map((a) => a.roleId);
  }

  async exists(
    memberId: string,
    roleId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? this.prisma;

    const assignment = await client.serverMemberRole.findUnique({
      where: {
        memberId_roleId: {
          memberId,
          roleId,
        },
      },
    });

    return !!assignment;
  }

  async findRoles(memberId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.serverMemberRole.findMany({
      where: {
        memberId,
      },

      include: {
        role: true,
      },
    });
  }

  async findRole(
    memberId: string,
    roleName: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.serverMemberRole.findFirst({
      where: {
        memberId,

        role: {
          name: roleName,
        },
      },

      include: {
        role: true,
      },
    });
  }

  async findMemberPermissions(memberId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.serverMemberRole.findMany({
      where: {
        memberId,
      },

      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });
  }

  async countMembers(roleId: string): Promise<number> {
    return this.prisma.serverMemberRole.count({
      where: {
        roleId,
      },
    });
  }

  async assignRole(
    memberId: string,
    roleId: string,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return prisma.serverMemberRole.create({
      data: {
        memberId,
        roleId,
      },
    });
  }

  async removeRole(
    memberId: string,
    roleId: string,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return prisma.serverMemberRole.deleteMany({
      where: {
        memberId,
        roleId,
      },
    });
  }
}
