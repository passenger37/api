import { Prisma } from '@prisma/client';

export interface MessageSearchCursor {
  createdAt: Date;
  id: string;
}

export interface MessageSearchParams {
  channelIds: string[];
  query: string;
  authorMemberId?: string;
  after?: Date;
  before?: Date;
  cursor?: MessageSearchCursor | null;
  take: number;
}

export class MessageSearchQueryBuilder {
  static build(params: MessageSearchParams) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`m."isDeleted" = false`,
      Prisma.sql`m."content" <> ''`,
      Prisma.sql`m."searchVector" @@ plainto_tsquery('english', ${params.query})`,
      Prisma.sql`m."channelId" IN (${Prisma.join(
        params.channelIds.map((id) => Prisma.sql`${id}`),
      )})`,
    ];

    if (params.authorMemberId) {
      conditions.push(
        Prisma.sql`m."authorMemberId" = ${params.authorMemberId}`,
      );
    }

    if (params.after) {
      conditions.push(Prisma.sql`m."createdAt" >= ${params.after}`);
    }

    if (params.before) {
      conditions.push(Prisma.sql`m."createdAt" <= ${params.before}`);
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
        m."parentMessageId",
        m."isEdited",
        m."editedAt",
        m."isDeleted",
        m."deletedAt",
        m."isPinned",
        m."pinnedAt",
        m."clientMessageId",
        m.version,
        m."messageSeq",
        m."createdAt",
        m."updatedAt"
      FROM "ChannelMessage" m
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY m."createdAt" DESC, m.id DESC
      LIMIT ${params.take}
    `;
  }
}
