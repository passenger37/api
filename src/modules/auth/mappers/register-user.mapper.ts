import { Prisma } from '@prisma/client';

import { RegisterDto } from '../dto/register.dto';

export class RegisterUserMapper {
  static toPrismaCreate(
    dto: RegisterDto,
    passwordHash: string,
  ): Prisma.UserCreateInput {
    return {
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      passwordHash,
    };
  }
}