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
  ) {
    return prisma.follow.create({
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
    });

    return !!follow;
  }

  // =====================================================
  // Followers
  // =====================================================

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
}
