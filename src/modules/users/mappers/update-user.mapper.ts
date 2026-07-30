import { Prisma } from '@prisma/client';

import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';

export class UpdateUserMapper {
  static toPrismaUpdate(dto: UpdateUserProfileDto): Prisma.UserUpdateInput {
    return {
      ...(dto.displayName !== undefined && {
        displayName: dto.displayName,
      }),

      ...(dto.bio !== undefined && {
        bio: dto.bio,
      }),

      ...(dto.avatarUrl !== undefined && {
        avatarUrl: dto.avatarUrl,
      }),

      ...(dto.location !== undefined && {
        location: dto.location,
      }),

      ...(dto.website !== undefined && {
        website: dto.website,
      }),

      ...(dto.coverImageUrl !== undefined && {
        coverImageUrl: dto.coverImageUrl,
      }),
    };
  }
}
