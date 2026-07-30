import { Injectable, NotFoundException } from '@nestjs/common';

import { UsersRepository } from '../repositories/users.repository';

import {
  CurrentUserDto,
  PublicUserProfileDto,
  UserResponseDto,
} from '../responses';

import { UserMapper } from '../mappers';

import { PaginationMapper } from '../../../common/pagination/mappers/pagination.mapper';

import { QueryUsersDto } from '../dto/query-users.dto';

import { PaginatedResponseDto } from '../../../common/pagination';

@Injectable()
export class UserQueryService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByIdentifier(identifier: string) {
    return this.usersRepository.findByEmailOrUsername(identifier);
  }

  async findById(id: string) {
    return this.usersRepository.findById(id);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findByUsername(username: string) {
    return this.usersRepository.findByUsername(username);
  }

  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return UserMapper.toResponse(user);
  }

  async getCurrentProfile(userId: string): Promise<CurrentUserDto> {
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

  async getUsers(
    query: QueryUsersDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const result = await this.usersRepository.findMany(query);

    return PaginationMapper.toResponse(result, UserMapper.toResponse);
  }
}
