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

import { UserSocialRepository } from '../repositories/user-social.repository';

import { UserRelationshipStatsResponse } from '../dto/response/user-relationship-stats.response';

import { BlockedUserResponse } from '../dto/response/blocked-user.response';

import { MutedUserResponse } from '../dto/response/muted-user.response';

@Injectable()
export class UserQueryService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly socialRepository: UserSocialRepository,
  ) {}

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
  ): Promise<PaginationResponseDto<SearchUserResponse>> {
    const { users, total } = await this.socialRepository.findSuggestedUsers(
      currentUserId,
      pagination,
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
    const exists = await this.usersRepository.existsById(userId);

    if (!exists) {
      throw new NotFoundException('User not found.');
    }

    const { users, total } = await this.socialRepository.findFollowers(
      userId,
      pagination,
    );

    return UserMapper.toFollowersResponse(
      users,
      pagination.page,
      pagination.pageSize,
      total,
    );
  }

  async getFollowing(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginationResponseDto<FollowerResponse>> {
    const exists = await this.usersRepository.existsById(userId);

    if (!exists) {
      throw new NotFoundException('User not found.');
    }

    const { users, total } = await this.socialRepository.findFollowing(
      userId,
      pagination,
    );

    return UserMapper.toFollowingListResponse(
      users,
      pagination.page,
      pagination.pageSize,
      total,
    );
  }

  async getMutualConnections(
    currentUserId: string,
    targetUserId: string,
    pagination: PaginationQueryDto,
  ) {
    const exists = await this.usersRepository.existsById(targetUserId);

    if (!exists) {
      throw new NotFoundException('User not found.');
    }

    const { users, total } = await this.socialRepository.findMutualConnections(
      currentUserId,
      targetUserId,
      pagination,
    );

    return UserMapper.toMutualConnectionsResponse(
      users,
      pagination.page,
      pagination.pageSize,
      total,
    );
  }

  // =====================================================
  // Relationship Statistics
  // =====================================================

  async getRelationshipStats(
    currentUserId: string,
    targetUserId: string,
  ): Promise<UserRelationshipStatsResponse> {
    const exists = await this.usersRepository.existsById(targetUserId);

    if (!exists) {
      throw new NotFoundException('User not found.');
    }

    const row = await this.socialRepository.getRelationshipStats(
      currentUserId,
      targetUserId,
    );

    return UserMapper.toRelationshipStatsResponse(row);
  }

  // =====================================================
  // Blocked Users
  // =====================================================

  async getBlockedUsers(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginationResponseDto<BlockedUserResponse>> {
    const exists = await this.usersRepository.existsById(userId);

    if (!exists) {
      throw new NotFoundException('User not found.');
    }

    const { blockedUsers, total } =
      await this.socialRepository.findBlockedUsers(
        userId,
        pagination.skip,
        pagination.take,
      );

    return UserMapper.toBlockedUsersResponse(
      blockedUsers,
      pagination.page,
      pagination.pageSize,
      total,
    );
  }

  // =====================================================
  // Muted Users
  // =====================================================

  async getMutedUsers(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginationResponseDto<MutedUserResponse>> {
    const exists = await this.usersRepository.existsById(userId);

    if (!exists) {
      throw new NotFoundException('User not found.');
    }

    const { mutedUsers, total } = await this.socialRepository.findMutedUsers(
      userId,
      pagination.skip,
      pagination.take,
    );

    return UserMapper.toMutedUsersResponse(
      mutedUsers,
      pagination.page,
      pagination.pageSize,
      total,
    );
  }

  // =====================================================
  // Incoming Follow Requests
  // =====================================================

  async getIncomingFollowRequests(
    receiverId: string,
    pagination: PaginationQueryDto,
  ) {
    const { requests, total } =
      await this.socialRepository.findIncomingFollowRequests(
        receiverId,
        pagination,
      );

    return UserMapper.toFollowRequestResponse(
      requests,
      pagination.page,
      pagination.pageSize,
      total,
    );
  }

  // =====================================================
  // Outgoing Follow Requests
  // =====================================================

  async getOutgoingFollowRequests(
    requesterId: string,
    pagination: PaginationQueryDto,
  ) {
    const { requests, total } =
      await this.socialRepository.findOutgoingFollowRequests(
        requesterId,
        pagination,
      );

    return UserMapper.toOutgoingFollowRequestsResponse(
      requests,
      pagination.page,
      pagination.pageSize,
      total,
    );
  }
}
