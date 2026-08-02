import { Prisma } from '@prisma/client';

export class MutualConnectionsQuery {
  static build(
    currentUserId: string,
    targetUserId: string,
    skip: number,
    take: number,
  ) {
    return Prisma.sql`

      SELECT

        u.id,
        u.username,
        u."displayName",
        u."avatarUrl",
        u."isVerified"

      FROM "Follow" f1

      INNER JOIN "Follow" f2
      ON f1."followingId" = f2."followingId"

      INNER JOIN "User" u
      ON u.id = f1."followingId"

      WHERE

          f1."followerId" = ${currentUserId}

      AND

          f2."followerId" = ${targetUserId}

      ORDER BY

          u."displayName" ASC

      LIMIT ${take}

      OFFSET ${skip}

    `;
  }
}
