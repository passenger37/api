import { Prisma } from '@prisma/client';

export const MY_PROFILE_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,

  email: true,

  username: true,

  displayName: true,

  avatarUrl: true,

  coverImageUrl: true,

  bio: true,

  website: true,

  phoneNumber: true,

  dateOfBirth: true,

  gender: true,

  language: true,

  timezone: true,

  country: true,

  state: true,

  city: true,

  location: true,

  isPrivate: true,

  isVerified: true,

  status: true,

  roles: {
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
  },

  createdAt: true,

  updatedAt: true,
});

export const PUBLIC_PROFILE_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,

  username: true,

  displayName: true,

  avatarUrl: true,

  coverImageUrl: true,

  bio: true,

  website: true,

  country: true,

  state: true,

  city: true,

  isVerified: true,

  createdAt: true,
});

export const SEARCH_USER_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,

  username: true,

  displayName: true,

  avatarUrl: true,

  isVerified: true,
});
