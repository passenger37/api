import { Injectable, NotFoundException } from '@nestjs/common';

import { UsersRepository } from '../repositories/users.repository';
import { UserSocialRepository } from '../repositories/user-social.repository';

import { FollowStateResponse } from '../dto/response/follow-state.response';
import { FollowStateStatus } from '../enums/follow-state-status.enum';

import {
  CurrentUserDto,
  PublicUserProfileDto,
  UserResponseDto,
} from '../responses';

import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginationResponseDto } from 'src/common/dto/pagination-response.dto';

import { FollowerResponse } from '../dto/response/follower.response';
import { UserRelationshipStatsResponse } from '../dto/response/user-relationship-stats.response';
import { BlockedUserResponse } from '../dto/response/blocked-user.response';
import { MutedUserResponse } from '../dto/response/muted-user.response';
import { CircleMemberResponse } from '../dto/response/circle-member.response';

import { UserMapper } from '../mappers/user.mapper';
import { SearchUsersRequest } from '../dto/request/search-users.request';
import { SearchUserResponse } from '../dto/response/search-user.response';
import { PaginationMapper } from 'src/common/pagination/mappers/pagination.mapper';
import { QueryUsersDto } from '../dto/query-users.dto';

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

    const [followersCount, followingCount] = await Promise.all([
      this.socialRepository.countFollowers(user.id),
      this.socialRepository.countFollowing(user.id),
    ]);

    return UserMapper.toPublicProfileResponse(user, {
      followersCount,
      followingCount,
    });
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

  async getFollowState(
    currentUserId: string,
    targetUserId: string,
  ): Promise<FollowStateResponse> {
    const targetExists = await this.usersRepository.existsById(targetUserId);

    if (!targetExists) {
      throw new NotFoundException('User not found.');
    }

    const [isFollowing, hasRequest] = await Promise.all([
      this.socialRepository.existsFollow(currentUserId, targetUserId),
      this.socialRepository.existsFollowRequest(currentUserId, targetUserId),
    ]);

    const status = isFollowing
      ? FollowStateStatus.FOLLOWED
      : hasRequest
        ? FollowStateStatus.REQUESTED
        : FollowStateStatus.NOT_FOLLOWING;

    return { status };
  }

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

  async getCircleMembers(
    ownerId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginationResponseDto<CircleMemberResponse>> {
    const exists = await this.usersRepository.existsById(ownerId);

    if (!exists) {
      throw new NotFoundException('User not found.');
    }

    const { members, total } = await this.socialRepository.findCircleMembers(
      ownerId,
      pagination.skip,
      pagination.take,
    );

    return UserMapper.toCircleMembersResponse(
      members,
      pagination.page,
      pagination.pageSize,
      total,
    );
  }
}
