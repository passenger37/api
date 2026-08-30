import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServerMember } from '@prisma/client';
import { SERVER_MEMBER_WITH_ROLES_INCLUDE } from './includes/server-member.includes';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ServerMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOwnerMembership(
    serverId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<ServerMember> {
    return tx.serverMember.create({
      data: {
        server: {
          connect: {
            id: serverId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async findByServerAndUser(
    serverId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ServerMember | null> {
    const client = tx ?? this.prisma;

    return client.serverMember.findFirst({
      where: {
        serverId,
        userId,
        removedAt: null,
      },
    });
  }

  async findByServerAndUserIncludingRemoved(
    serverId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ServerMember | null> {
    const client = tx ?? this.prisma;

    return client.serverMember.findFirst({
      where: {
        serverId,
        userId,
      },
    });
  }

  async findServersByUser(userId: string) {
    {
      return this.prisma.serverMember.findMany({
        where: {
          userId,
        },

        include: {
          server: true,
        },

        orderBy: {
          joinedAt: 'desc',
        },
      });
    }
  }

  async findByServerAndUserWithRoles(
    serverId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.serverMember.findFirst({
      where: {
        serverId,
        userId,
        removedAt: null,
      },

      include: SERVER_MEMBER_WITH_ROLES_INCLUDE,
    });
  }

  async countMembers(serverId: string): Promise<number> {
    return this.prisma.serverMember.count({
      where: {
        serverId,
        removedAt: null,
      },
    });
  }

  async findMembers(
    serverId: string,
    query: string | undefined,
    skip: number,
    take: number,
  ) {
    return this.prisma.serverMember.findMany({
      where: {
        serverId,
        removedAt: null,

        ...(query
          ? {
              OR: [
                {
                  nickname: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  user: {
                    username: {
                      contains: query,
                      mode: 'insensitive',
                    },
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        user: true,
      },

      orderBy: {
        joinedAt: 'desc',
      },

      skip,

      take,
    });
  }

  async countSearchMembers(serverId: string, query?: string): Promise<number> {
    return this.prisma.serverMember.count({
      where: {
        serverId,
        removedAt: null,

        ...(query
          ? {
              OR: [
                {
                  nickname: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  user: {
                    username: {
                      contains: query,
                      mode: 'insensitive',
                    },
                  },
                },
              ],
            }
          : {}),
      },
    });
  }

  async findOwner(serverId: string) {
    return this.prisma.serverMember.findFirst({
      where: {
        serverId,
        removedAt: null,

        roles: {
          some: {
            role: {
              name: 'Owner',
            },
          },
        },
      },

      include: {
        user: true,

        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async findHighestRole(serverId: string, userId: string) {
    const member = await this.prisma.serverMember.findFirst({
      where: {
        serverId,
        userId,
        removedAt: null,
      },

      include: {
        roles: {
          include: {
            role: true,
          },

          orderBy: {
            role: {
              position: 'desc',
            },
          },

          take: 1,
        },
      },
    });

    return member?.roles[0]?.role ?? null;
  }

  async findHighestRoleAny(serverId: string, userId: string) {
    const member = await this.prisma.serverMember.findFirst({
      where: {
        serverId,
        userId,
      },

      include: {
        roles: {
          include: {
            role: true,
          },

          orderBy: {
            role: {
              position: 'desc',
            },
          },

          take: 1,
        },
      },
    });

    return member?.roles[0]?.role ?? null;
  }

  async findById(id: string) {
    return this.prisma.serverMember.findUnique({
      where: {
        id,
      },
    });
  }
  async findByUser(serverId: string, userId: string) {
    return this.prisma.serverMember.findFirst({
      where: {
        serverId,
        userId,
        removedAt: null,
      },
    });
  }

  async findByServerAndUserWithUser(serverId: string, userId: string) {
    return this.prisma.serverMember.findFirst({
      where: {
        serverId,
        userId,
        removedAt: null,
      },

      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async create(
    data: Prisma.ServerMemberCreateInput,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return prisma.serverMember.create({
      data,
    });
  }

  async markRemoved(
    memberId: string,
    removedAt: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.serverMember.update({
      where: {
        id: memberId,
      },

      data: {
        removedAt,
      },
    });
  }

  async restoreMembership(memberId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.serverMember.update({
      where: {
        id: memberId,
      },

      data: {
        removedAt: null,
      },
    });
  }
}
