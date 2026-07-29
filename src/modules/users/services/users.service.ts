import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { UsersRepository } from '../repositories/users.repository';

import { UserMapper } from '../mappers/user.mapper';
import { PaginationMapper } from '../../../common/pagination/mappers/pagination.mapper';

import {
  UserResponseDto,
  CurrentUserDto,
  PublicUserProfileDto,
} from '../responses';

import { QueryUsersDto } from '../dto/query-users.dto';
import { CreateUserDto } from '../dto/create-user.dto';

import { PaginatedResponseDto } from '../../../common/pagination';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  // =====================================================
  // Registration (Auth Module)
  // =====================================================

  async createForRegistration(input: Prisma.UserCreateInput) {
    await this.validateUniqueUser(input.email, input.username);

    return this.usersRepository.create(input);
  }

  // =====================================================
  // Admin User Creation
  // =====================================================

  async createByAdmin(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.validateUniqueUser(dto.email, dto.username);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.usersRepository.create({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      passwordHash,
      bio: dto.bio,
      avatarUrl: dto.avatarUrl,
      status: dto.status,
    });

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

  // =====================================================
  // Private Helpers
  // =====================================================

  private async validateUniqueUser(
    email: string,
    username: string,
  ): Promise<void> {
    const emailExists = await this.usersRepository.existsByEmail(email);

    if (emailExists) {
      throw new ConflictException('Email already exists.');
    }

    const usernameExists =
      await this.usersRepository.existsByUsername(username);

    if (usernameExists) {
      throw new ConflictException('Username already exists.');
    }
  }
}
