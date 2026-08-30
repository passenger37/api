import { Prisma } from '@prisma/client';

import { FeedMessageQueryBuilder } from './feed-message.query';

interface RawSql {
  text: string;
  values: unknown[];
}

const raw = (sql: Prisma.Sql): RawSql =>
  sql as unknown as { text: string; values: unknown[] };

describe('FeedMessageQueryBuilder', () => {
  it('filters to non-deleted non-empty messages in the given channels', () => {
    const sql = raw(
      FeedMessageQueryBuilder.build({
        channelIds: ['ch-1', 'ch-2'],
        take: 26,
      }),
    );

    expect(sql.text).toContain('m."isDeleted" = false');
    expect(sql.text).toContain(`m."content" <> ''`);
    expect(sql.text).toContain('m."channelId" IN');
    expect(sql.text).toContain('ORDER BY m."createdAt" DESC, m.id DESC');
    expect(sql.values).toEqual(expect.arrayContaining(['ch-1', 'ch-2', 26]));
  });

  it('scopes to authors who are followed users when userIds provided', () => {
    const sql = raw(
      FeedMessageQueryBuilder.build({
        channelIds: ['ch-1'],
        userIds: ['user-2', 'user-3'],
        take: 26,
      }),
    );

    expect(sql.text).toContain('"ServerMember"');
    expect(sql.text).toContain(`sm."userId" IN`);
    expect(sql.values).toEqual(
      expect.arrayContaining(['ch-1', 'user-2', 'user-3', 26]),
    );
  });

  it('applies the composite (createdAt, id) cursor', () => {
    const cursor = {
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
      id: 'msg-9',
    };

    const sql = raw(
      FeedMessageQueryBuilder.build({
        channelIds: ['ch-1'],
        cursor,
        take: 26,
      }),
    );

    expect(sql.text).toContain('(m."createdAt", m.id) < (');
    expect(sql.values).toEqual(
      expect.arrayContaining([cursor.createdAt, 'msg-9']),
    );
  });
});
