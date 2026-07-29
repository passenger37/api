import { Prisma } from '@prisma/client';

import { CreateUserDto } from '../dto/create-user.dto';

export class CreateUserMapper {
  static toPrismaCreate(
    dto: CreateUserDto,
    passwordHash: string,
  ): Prisma.UserCreateInput {
    return {
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      passwordHash,
      bio: dto.bio,
      avatarUrl: dto.avatarUrl,
      status: dto.status,
    };
  }
}
