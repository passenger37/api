import { Prisma } from '@prisma/client';

export interface FeedCursor {
  createdAt: Date;
  id: string;
}

export interface FeedMessageParams {
  channelIds: string[];
  userIds?: string[];
  cursor?: FeedCursor | null;
  take: number;
}

export class FeedMessageQueryBuilder {
  static build(params: FeedMessageParams) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`m."isDeleted" = false`,
      Prisma.sql`m."content" <> ''`,
      Prisma.sql`m."channelId" IN (${Prisma.join(
        params.channelIds.map((id) => Prisma.sql`${id}`),
      )})`,
    ];

    if (params.userIds && params.userIds.length > 0) {
      conditions.push(
        Prisma.sql`m."authorMemberId" IN (
          SELECT sm."id" FROM "ServerMember" sm
          WHERE sm."userId" IN (${Prisma.join(
            params.userIds.map((id) => Prisma.sql`${id}`),
          )})
        )`,
      );
    }

    if (params.cursor) {
      conditions.push(
        Prisma.sql`(m."createdAt", m.id) < (${params.cursor.createdAt}, ${params.cursor.id})`,
      );
    }

    return Prisma.sql`
      SELECT
        m.id,
        m.content,
        m."serverId",
        m."channelId",
        m."authorMemberId",
        m."messageSeq",
        m."isPinned",
        m."createdAt"
      FROM "ChannelMessage" m
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY m."createdAt" DESC, m.id DESC
      LIMIT ${params.take}
    `;
  }
}
