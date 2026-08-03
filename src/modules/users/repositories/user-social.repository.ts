import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

import { SEARCH_USER_SELECT } from './user.select';

import { Prisma } from '@prisma/client';

import { MutualConnectionsQuery } from '../queries/mutual-connections.query';

import { MutualConnectionRow } from '../database/rows/mutual-connection.row';

import { RelationshipStatsQuery } from '../queries/relationship-stats.query';

import { UserRelationshipStatsRow } from '../database/rows/user-relationship-stats.row';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;
@Injectable()
export class UserSocialRepository {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // Follow
  // =====================================================

  async followUser(
    followerId: string,
    followingId: string,
    prisma: PrismaExecutor = this.prisma,
  ): Promise<void> {
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  async unfollowUser(
    followerId: string,
    followingId: string,
    prisma: PrismaExecutor = this.prisma,
  ) {
    return prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  }

  async existsFollow(
    followerId: string,
    followingId: string,
  ): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
      select: {
        id: true,
      },
    });

    return !!follow;
  }
  // =====================================================
  // Remove Follow Relationship
  // =====================================================

  async removeFollowRelationship(
    userA: string,
    userB: string,
    prisma: PrismaExecutor = this.prisma,
  ) {
    return prisma.follow.deleteMany({
      where: {
        OR: [
          {
            followerId: userA,
            followingId: userB,
          },
          {
            followerId: userB,
            followingId: userA,
          },
        ],
      },
    });
  }

  async countFollowers(userId: string): Promise<number> {
    return this.prisma.follow.count({
      where: {
        followingId: userId,
      },
    });
  }

  async findFollowers(userId: string, pagination: PaginationQueryDto) {
    const where = {
      followingId: userId,
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.follow.findMany({
        where,

        skip: pagination.skip,

        take: pagination.take,

        orderBy: {
          createdAt: 'desc',
        },

        include: {
          follower: {
            select: SEARCH_USER_SELECT,
          },
        },
      }),

      this.prisma.follow.count({
        where,
      }),
    ]);

    return {
      users,
      total,
    };
  }

  // =====================================================
  // Following
  // =====================================================

  async countFollowing(userId: string): Promise<number> {
    return this.prisma.follow.count({
      where: {
        followerId: userId,
      },
    });
  }

  async findFollowing(userId: string, pagination: PaginationQueryDto) {
    const where = {
      followerId: userId,
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.follow.findMany({
        where,

        skip: pagination.skip,

        take: pagination.take,

        orderBy: {
          createdAt: 'desc',
        },

        include: {
          following: {
            select: SEARCH_USER_SELECT,
          },
        },
      }),

      this.prisma.follow.count({
        where,
      }),
    ]);

    return {
      users,
      total,
    };
  }

  // =====================================================
  // Suggested Users
  // =====================================================

  async findSuggestedUsers(
    currentUserId: string,
    pagination: PaginationQueryDto,
  ) {
    const followedUsers = await this.prisma.follow.findMany({
      where: {
        followerId: currentUserId,
      },

      select: {
        followingId: true,
      },
    });

    const excludedIds = [
      currentUserId,
      ...followedUsers.map((x) => x.followingId),
    ];

    const where = {
      id: {
        notIn: excludedIds,
      },
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,

        skip: pagination.skip,

        take: pagination.take,

        orderBy: {
          createdAt: 'desc',
        },

        select: SEARCH_USER_SELECT,
      }),

      this.prisma.user.count({
        where,
      }),
    ]);

    return {
      users,
      total,
    };
  }

  // =====================================================
  // Mutual Connections
  // =====================================================

  async findMutualConnections(
    currentUserId: string,
    targetUserId: string,
    pagination: PaginationQueryDto,
  ) {
    const query = MutualConnectionsQuery.build(
      currentUserId,
      targetUserId,
      pagination.skip,
      pagination.take,
    );

    const users = await this.prisma.$queryRaw<MutualConnectionRow[]>(query);

    const totalResult = await this.prisma.$queryRaw<
      { count: bigint }[]
    >(Prisma.sql`

      SELECT COUNT(*) AS count

      FROM "Follow" f1

      INNER JOIN "Follow" f2
      ON f1."followingId" = f2."followingId"

      WHERE

          f1."followerId" = ${currentUserId}

      AND

          f2."followerId" = ${targetUserId}

  `);

    return {
      users,
      total: Number(totalResult[0]?.count ?? 0),
    };
  }

  // =====================================================
  // Relationship Statistics
  // =====================================================

  async getRelationshipStats(
    currentUserId: string,
    targetUserId: string,
  ): Promise<UserRelationshipStatsRow> {
    const query = RelationshipStatsQuery.build(currentUserId, targetUserId);

    const [result] =
      await this.prisma.$queryRaw<UserRelationshipStatsRow[]>(query);

    return result;
  }

  // =====================================================
  // Block
  // =====================================================

  async blockUser(
    blockerId: string,
    blockedId: string,
    prisma: PrismaExecutor = this.prisma,
  ) {
    return prisma.block.create({
      data: {
        blockerId,
        blockedId,
      },
    });
  }

  async unblockUser(
    blockerId: string,
    blockedId: string,
    prisma: PrismaExecutor = this.prisma,
  ) {
    return prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });
  }

  async existsBlock(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    return !!block;
  }

  // =====================================================
  // Find Blocked Users
  // =====================================================

  async findBlockedUsers(blockerId: string, skip: number, take: number) {
    const [blockedUsers, total] = await this.prisma.$transaction([
      this.prisma.block.findMany({
        where: {
          blockerId,
        },
        include: {
          blocked: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),

      this.prisma.block.count({
        where: {
          blockerId,
        },
      }),
    ]);

    return {
      blockedUsers,
      total,
    };
  }

  // =====================================================
  // Mute User
  // =====================================================

  async muteUser(
    muterId: string,
    mutedId: string,
    prisma: PrismaExecutor = this.prisma,
  ) {
    return prisma.mute.create({
      data: {
        muterId,
        mutedId,
      },
    });
  }

  // =====================================================
  // Unmute User
  // =====================================================

  async unmuteUser(
    muterId: string,
    mutedId: string,
    prisma: PrismaExecutor = this.prisma,
  ) {
    return prisma.mute.delete({
      where: {
        muterId_mutedId: {
          muterId,
          mutedId,
        },
      },
    });
  }

  // =====================================================
  // Exists Mute
  // =====================================================

  async existsMute(muterId: string, mutedId: string): Promise<boolean> {
    const mute = await this.prisma.mute.findUnique({
      where: {
        muterId_mutedId: {
          muterId,
          mutedId,
        },
      },
      select: {
        id: true,
      },
    });

    return !!mute;
  }

  // =====================================================
  // Find Muted Users
  // =====================================================

  async findMutedUsers(muterId: string, skip: number, take: number) {
    const [mutedUsers, total] = await this.prisma.$transaction([
      this.prisma.mute.findMany({
        where: {
          muterId,
        },
        include: {
          muted: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),

      this.prisma.mute.count({
        where: {
          muterId,
        },
      }),
    ]);

    return {
      mutedUsers,
      total,
    };
  }

  // =====================================================
  // Send Follow Request
  // =====================================================

  async sendFollowRequest(
    requesterId: string,
    receiverId: string,
    prisma: PrismaExecutor = this.prisma,
  ) {
    return prisma.followRequest.create({
      data: {
        requesterId,
        receiverId,
      },
    });
  }

  // =====================================================
  // Cancel Follow Request
  // =====================================================

  async cancelFollowRequest(
    requesterId: string,
    receiverId: string,
    prisma: PrismaExecutor = this.prisma,
  ): Promise<void> {
    await prisma.followRequest.delete({
      where: {
        requesterId_receiverId: {
          requesterId,
          receiverId,
        },
      },
    });
  }

  // =====================================================
  // Exists Follow Request
  // =====================================================

  async existsFollowRequest(
    requesterId: string,
    receiverId: string,
  ): Promise<boolean> {
    const request = await this.prisma.followRequest.findUnique({
      where: {
        requesterId_receiverId: {
          requesterId,
          receiverId,
        },
      },
      select: {
        id: true,
      },
    });

    return !!request;
  }

  // =====================================================
  // Accept Follow Request
  // =====================================================

  async acceptFollowRequest(
    requesterId: string,
    receiverId: string,
    prisma: PrismaExecutor = this.prisma,
  ): Promise<void> {
    await prisma.follow.create({
      data: {
        followerId: requesterId,
        followingId: receiverId,
      },
    });

    await prisma.followRequest.delete({
      where: {
        requesterId_receiverId: {
          requesterId,
          receiverId,
        },
      },
    });
  }
}
