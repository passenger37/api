import { Prisma } from '@prisma/client';

export class RelationshipStatsQuery {
  static build(currentUserId: string, targetUserId: string) {
    return Prisma.sql`

      SELECT

        (
          SELECT COUNT(*)
          FROM "Follow"
          WHERE "followingId" = ${targetUserId}
        ) AS "followersCount",

        (
          SELECT COUNT(*)
          FROM "Follow"
          WHERE "followerId" = ${targetUserId}
        ) AS "followingCount",

        (
          SELECT COUNT(*)
          FROM "Follow" f1
          INNER JOIN "Follow" f2
            ON f1."followingId" = f2."followingId"
          WHERE
            f1."followerId" = ${currentUserId}
          AND
            f2."followerId" = ${targetUserId}
        ) AS "mutualConnectionsCount";

    `;
  }
}
