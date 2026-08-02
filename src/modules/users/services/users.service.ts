import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { UsersRepository } from '../repositories/users.repository';

import { UserResponseDto } from '../responses';

import { UserMapper } from '../mappers';
import { CreateUserDto } from '../dto/create-user.dto';

import { UserValidationService } from './user-validation.service';
import { UserProfileService } from './user-profile.service';

import { PasswordService } from '../../security/services/password.service';

import { UserFactory } from '../factories/user.factory';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userValidationService: UserValidationService,
    private readonly passwordService: PasswordService,
    private readonly userFactory: UserFactory,
    private readonly userProfileService: UserProfileService,
  ) {}

  async createForRegistration(input: Prisma.UserCreateInput) {
    await this.userValidationService.validateUniqueUser(
      input.email,
      input.username,
    );

    return this.usersRepository.create(input);
  }

  async createByAdmin(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.userValidationService.validateUniqueUser(
      dto.email,
      dto.username,
    );

    const passwordHash = await this.passwordService.hash(dto.password);

    const input = this.userFactory.createByAdmin(dto, passwordHash);

    const user = await this.usersRepository.create(input);

    return UserMapper.toResponse(user);
  }

  async getMyProfile(userId: string) {
    return this.queryService.getMyProfile(userId);
  }
}
