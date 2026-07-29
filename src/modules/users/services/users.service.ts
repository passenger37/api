import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { UsersRepository } from '../repositories/users.repository';

import {
  UserResponseDto,
  CurrentUserDto,
  PublicUserProfileDto,
} from '../responses';

import { UserMapper, CreateUserMapper } from '../mappers';

import { PaginationMapper } from '../../../common/pagination/mappers/pagination.mapper';

import { QueryUsersDto } from '../dto/query-users.dto';
import { CreateUserDto } from '../dto/create-user.dto';

import { PaginatedResponseDto } from '../../../common/pagination';

import { UserValidationService } from './user-validation.service';

import { PasswordService } from '../../security/services/password.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userValidationService: UserValidationService,
    private readonly passwordService: PasswordService,
  ) {}

  // =====================================================
  // Registration (Auth Module)
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

    const input = CreateUserMapper.toPrismaCreate(dto, passwordHash);

    const user = await this.usersRepository.create(input);

    return UserMapper.toResponse(user);
  }

  // =====================================================
  // Read
  // =====================================================

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

  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return UserMapper.toResponse(user);
  }

  async getCurrentUser(userId: string): Promise<CurrentUserDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return UserMapper.toCurrentUser(user);
  }

  async getPublicProfile(username: string): Promise<PublicUserProfileDto> {
    const user = await this.usersRepository.findByUsername(username);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return UserMapper.toPublicProfile(user);
  }

  // =====================================================
  // Query
  // =====================================================

  async getUsers(
    query: QueryUsersDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const result = await this.usersRepository.findMany(query);

    return PaginationMapper.toResponse(result, UserMapper.toResponse);
  }
}
