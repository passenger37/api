import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { FeedMessageQueryBuilder } from '../queries/feed-message.query';

import type {
  FeedCursor,
  FeedMessageParams,
} from '../queries/feed-message.query';

import type { FeedMessageRow } from '../database/rows/feed-message.row';

const FEED_AUTHOR_USER_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,

  username: true,

  displayName: true,

  avatarUrl: true,
});

@Injectable()
export class FeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMemberServers(userId: string): Promise<string[]> {
    const members = await this.prisma.serverMember.findMany({
      where: {
        userId,
        removedAt: null,
      },

      select: {
        serverId: true,
      },
    });

    return members.map((member) => member.serverId);
  }

  async findMemberServerChannels(
    serverIds: string[],
  ): Promise<Array<{ id: string; serverId: string; type: string }>> {
    return this.prisma.serverChannel.findMany({
      where: {
        serverId: {
          in: serverIds,
        },
      },

      select: {
        id: true,
        serverId: true,
        type: true,
      },
    });
  }

  async findFollowedUserIds(userId: string): Promise<string[]> {
    const follows = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
      },

      select: {
        followingId: true,
      },
    });

    return follows.map((follow) => follow.followingId);
  }

  async findFeedPage(params: FeedMessageParams): Promise<FeedMessageRow[]> {
    return this.prisma.$queryRaw<FeedMessageRow[]>(
      FeedMessageQueryBuilder.build(params),
    );
  }

  async findFeedCursor(messageId: string): Promise<FeedCursor | null> {
    const message = await this.prisma.channelMessage.findUnique({
      where: {
        id: messageId,
      },

      select: {
        id: true,
        createdAt: true,
      },
    });

    if (!message) {
      return null;
    }

    return {
      createdAt: message.createdAt,
      id: message.id,
    };
  }

  async hydrateMessages(ids: string[]) {
    return this.prisma.channelMessage.findMany({
      where: {
        id: {
          in: ids,
        },
      },

      include: {
        author: {
          include: {
            user: {
              select: FEED_AUTHOR_USER_SELECT,
            },
          },
        },

        channel: {
          include: {
            server: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }
}
