import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { UsersRepository } from '../repositories/users.repository';

import {
  UserResponseDto,
  CurrentUserDto,
  PublicUserProfileDto,
} from '../responses';

import { UserMapper } from '../mappers';

import { PaginationMapper } from '../../../common/pagination/mappers/pagination.mapper';

import { QueryUsersDto } from '../dto/query-users.dto';
import { CreateUserDto } from '../dto/create-user.dto';

import { PaginatedResponseDto } from '../../../common/pagination';

import { UserValidationService } from './user-validation.service';
import { UserProfileService } from './user-profile.service';

import { PasswordService } from '../../security/services/password.service';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';

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

  async findByIdentifier(identifier: string) {
    return this.usersRepository.findByEmailOrUsername(identifier);
  }

  async findById(id: string) {
    return this.usersRepository.findById(id);
  }

  async findByUsername(username: string) {
    return this.usersRepository.findByUsername(username);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async getUserById(userId: string) {
    return this.userProfileService.getUserById(userId);
  }

  async getCurrentUser(userId: string) {
    return this.userProfileService.getCurrentProfile(userId);
  }

  async getPublicProfile(username: string) {
    return this.userProfileService.getPublicProfile(username);
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
    return this.userProfileService.updateProfile(userId, dto);
  }

  async getUsers(
    query: QueryUsersDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const result = await this.usersRepository.findMany(query);

    return PaginationMapper.toResponse(result, UserMapper.toResponse);
  }
}
