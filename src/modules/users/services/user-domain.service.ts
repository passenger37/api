import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { UsersRepository } from '../repositories/users.repository';

import { CreateUserDto } from '../dto/create-user.dto';

import { UserResponseDto } from '../responses';

import { CreateUserMapper, UserMapper } from '../mappers';

import { UserFactory } from '../factories/user.factory';

import { UserValidationService } from './user-validation.service';

import { PasswordService } from '../../security/services/password.service';

@Injectable()
export class UserDomainService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userValidationService: UserValidationService,
    private readonly passwordService: PasswordService,
    private readonly userFactory: UserFactory,
  ) {}

  // =====================================================
  // Registration
  // =====================================================

  async createForRegistration(input: Prisma.UserCreateInput) {
    await this.userValidationService.validateUniqueUser(
      input.email,
      input.username,
    );

    return this.usersRepository.create(input);
  }

  // =====================================================
  // Admin Create User
  // =====================================================

  async createByAdmin(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.userValidationService.validateUniqueUser(
      dto.email,
      dto.username,
    );

    const passwordHash = await this.passwordService.hash(dto.password);

    const input = this.userFactory.createForRegistration(dto, passwordHash);

    const user = await this.usersRepository.create(input);

    return UserMapper.toResponse(user);
  }
}
