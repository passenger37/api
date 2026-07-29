import { Prisma } from '@prisma/client';

import { QueryUsersDto } from '../dto/query-users.dto';

export class UsersFilterBuilder {
  static build(query: QueryUsersDto): Prisma.UserWhereInput {
    return {
      ...(query.status && {
        status: query.status,
      }),

      ...(query.verified !== undefined && {
        verified: query.verified,
      }),

      ...(query.search && {
        OR: [
          {
            username: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
          {
            displayName: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };
  }
}
