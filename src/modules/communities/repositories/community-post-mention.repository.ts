import { Injectable } from '@nestjs/common';
import { CommunityPostMention, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

export interface CommunityPostMentionInput {
  mentionedUserId: string;
  position: number;
  length: number;
}

@Injectable()
export class CommunityPostMentionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    postId: string,
    mentions: CommunityPostMentionInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPostMention[]> {
    const client = tx ?? this.prisma;

    const deduped: CommunityPostMentionInput[] = [];
    const seen = new Set<string>();

    for (const m of mentions) {
      if (!seen.has(m.mentionedUserId)) {
        seen.add(m.mentionedUserId);
        deduped.push(m);
      }
    }

    const creates = deduped.map((m) =>
      client.communityPostMention.create({
        data: {
          postId,
          mentionedUserId: m.mentionedUserId,
          position: m.position,
          length: m.length,
        },
      }),
    );

    if (tx) {
      return Promise.all(creates);
    }
    return this.prisma.$transaction(creates);
  }

  async listByPost(
    postId: string,
  ): Promise<Array<CommunityPostMention & { mentionedUser?: { id: string; username: string; displayName: string; avatarUrl: string | null } }>> {
    return this.prisma.communityPostMention.findMany({
      where: { postId },
      include: {
        mentionedUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  async listMentionedUserIds(postId: string): Promise<string[]> {
    const rows = await this.prisma.communityPostMention.findMany({
      where: { postId },
      select: { mentionedUserId: true },
    });

    return rows.map((r) => r.mentionedUserId);
  }

  async replaceForPost(
    postId: string,
    mentions: CommunityPostMentionInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<CommunityPostMention[]> {
    const client = tx ?? this.prisma;

    if (tx) {
      await client.communityPostMention.deleteMany({ where: { postId } });
      return this.createMany(postId, mentions, tx);
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.communityPostMention.deleteMany({ where: { postId } });
      return this.createMany(postId, mentions, transaction);
    });
  }

  async removeByPost(
    postId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;

    const result = await client.communityPostMention.deleteMany({
      where: { postId },
    });

    return result.count;
  }
}