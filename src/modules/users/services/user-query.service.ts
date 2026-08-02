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

import { PaginationResponseDto } from 'src/common/dto/pagination-response.dto';

import { SearchUsersRequest } from '../dto/request/search-users.request';

import { SearchUserResponse } from '../dto/response/search-user.response';

import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

import { FollowerResponse } from '../dto/response/follower.response';

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

  async getUsers(
    query: QueryUsersDto,
  ): Promise<PaginationResponseDto<UserResponseDto>> {
    const result = await this.usersRepository.findMany(query);

    return PaginationMapper.toResponse(
      result.items,
      result.total,
      query.page,
      query.pageSize,
      UserMapper.toResponse,
    );
  }
  async getMyProfile(userId: string) {
    const user = await this.usersRepository.findMyProfile(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return UserMapper.toMyProfileResponse(user);
  }

  // =====================================================
  // Get Public Profile
  // =====================================================

  async getPublicProfile(username: string) {
    const user = await this.usersRepository.findPublicProfile(username);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return UserMapper.toPublicProfileResponse(user);
  }

  // =====================================================
  // Search Users
  // =====================================================

  async searchUsers(
    request: SearchUsersRequest,
  ): Promise<PaginationResponseDto<SearchUserResponse>> {
    const { users, total } = await this.usersRepository.searchUsers(request);

    return UserMapper.toSearchUsersResponse(
      users,
      request.page,
      request.pageSize,
      total,
    );
  }

  // =====================================================
  // Suggested Users
  // =====================================================

  async getSuggestedUsers(
    currentUserId: string,
    pagination: PaginationQueryDto,
  ) {
    const { users, total } = await this.usersRepository.findSuggestedUsers(
      currentUserId,
      pagination.skip,
      pagination.take,
    );

    return UserMapper.toSearchUsersResponse(
      users,
      pagination.page,
      pagination.pageSize,
      total,
    );
  }

  async getFollowers(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginationResponseDto<FollowerResponse>> {
    await this.usersRepository.existsById(userId);

    const { followers, total } = await this.usersRepository.findFollowers(
      userId,
      pagination.skip,
      pagination.take,
    );

    return UserMapper.toFollowersResponse(
      followers,
      pagination.page,
      pagination.pageSize,
      total,
    );
  }
}
