import { Prisma } from '@prisma/client';

export const SERVER_MEMBER_WITH_ROLES_INCLUDE = {
  roles: {
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
    },
  },
} satisfies Prisma.ServerMemberInclude;

export const SERVER_MEMBER_WITH_USER_INCLUDE = {
  user: true,
} satisfies Prisma.ServerMemberInclude;

export const SERVER_MEMBER_FULL_INCLUDE = {
  user: true,

  server: true,

  roles: {
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
    },
  },
} satisfies Prisma.ServerMemberInclude;
