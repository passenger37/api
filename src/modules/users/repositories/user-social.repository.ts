import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/database/prisma.service';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

import { SEARCH_USER_SELECT } from './user.select';

@Injectable()
export class UserSocialRepository {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // Follow
  // =====================================================

  async followUser(followerId: string, followingId: string) {
    return this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  async unfollowUser(followerId: string, followingId: string) {
    return this.prisma.follow.delete({
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
  // TODO:
  // Will be implemented using
  // raw SQL + Query Objects
  // in Lecture 20.11
  // =====================================================
}
