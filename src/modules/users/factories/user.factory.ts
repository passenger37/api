import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CreateUserDto } from '../dto/create-user.dto';
import { RegisterDto } from '../../auth/dto/register.dto';

@Injectable()
export class UserFactory {
  createForRegistration(
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

  createByAdmin(
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
