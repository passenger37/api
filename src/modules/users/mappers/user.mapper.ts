import { User } from '@prisma/client';

import {
  CurrentUserDto,
  PublicUserProfileDto,
  UserResponseDto,
} from '../responses';
import { FollowerResponse } from '../dto/response/follower.response';
import { UserSummaryResponseDto } from '../../users/dto/response/user-summary-response.dto';

import { MyProfileResponse } from '../dto/response/my-profile.response';
import { PublicProfileResponse } from '../dto/response/public-profile.response';
import { SearchUserResponse } from '../dto/response/search-user.response';

import { PaginationResponseDto } from 'src/common/dto/pagination-response.dto';

export class UserMapper {
  static toResponse(user: User): UserResponseDto {
    return {
      id: user.id,

      username: user.username,

      displayName: user.displayName,

      avatarUrl: user.avatarUrl,

      coverImageUrl: user.coverImageUrl,

      bio: user.bio,

      isVerified: user.isVerified,

      status: user.status,

      createdAt: user.createdAt,

      updatedAt: user.updatedAt,
    };
  }

  static toCurrentUser(user: User): CurrentUserDto {
    return {
      ...UserMapper.toResponse(user),

      email: user.email,

      phoneNumber: user.phoneNumber,

      dateOfBirth: user.dateOfBirth,

      gender: user.gender,

      country: user.country,

      state: user.state,

      city: user.city,

      language: user.language,

      timezone: user.timezone,

      isPrivate: user.isPrivate,

      lastSeenAt: user.lastSeenAt,
    };
  }

  static toPublicProfile(user: User): PublicUserProfileDto {
    return {
      ...UserMapper.toResponse(user),

      followersCount: 0,

      followingCount: 0,

      postsCount: 0,
    };
  }

  toSummary(entity: User): UserSummaryResponseDto {
    return {
      id: entity.id,
      username: entity.username,
      displayName: entity.displayName,
      avatarUrl: entity.avatarUrl,
    };
  }

  toSummaryList(entities: User[]): UserSummaryResponseDto[] {
    return entities.map((entity) => this.toSummary(entity));
  }

  static toMyProfileResponse(user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    bio: string | null;
    website: string | null;
    phoneNumber: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    language: string;
    timezone: string;
    country: string | null;
    state: string | null;
    city: string | null;
    location: string | null;
    isPrivate: boolean;
    isVerified: boolean;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): MyProfileResponse {
    return {
      id: user.id,

      email: user.email,

      username: user.username,

      displayName: user.displayName,

      avatarUrl: user.avatarUrl,

      coverImageUrl: user.coverImageUrl,

      bio: user.bio,

      website: user.website,

      phoneNumber: user.phoneNumber,

      dateOfBirth: user.dateOfBirth,

      gender: user.gender,

      language: user.language,

      timezone: user.timezone,

      country: user.country,

      state: user.state,

      city: user.city,

      location: user.location,

      isPrivate: user.isPrivate,

      isVerified: user.isVerified,

      status: user.status,

      createdAt: user.createdAt,

      updatedAt: user.updatedAt,
    };
  }

  // =====================================================
  // Public Profile
  // =====================================================

  static toPublicProfileResponse(user: {
    id: string;

    username: string;

    displayName: string;

    avatarUrl: string | null;

    coverImageUrl: string | null;

    bio: string | null;

    website: string | null;

    country: string | null;

    state: string | null;

    city: string | null;

    isVerified: boolean;

    createdAt: Date;
  }): PublicProfileResponse {
    return {
      id: user.id,

      username: user.username,

      displayName: user.displayName,

      avatarUrl: user.avatarUrl,

      coverImageUrl: user.coverImageUrl,

      bio: user.bio,

      website: user.website,

      country: user.country,

      state: user.state,

      city: user.city,

      isVerified: user.isVerified,

      createdAt: user.createdAt,
    };
  }

  // =====================================================
  // Search User
  // =====================================================

  static toSearchUserResponse(user: {
    id: string;

    username: string;

    displayName: string;

    avatarUrl: string | null;

    isVerified: boolean;
  }): SearchUserResponse {
    return {
      id: user.id,

      username: user.username,

      displayName: user.displayName,

      avatarUrl: user.avatarUrl,

      isVerified: user.isVerified,
    };
  }

  // =====================================================
  // Search Users
  // =====================================================

  static toSearchUsersResponse(
    users: Array<{
      id: string;

      username: string;

      displayName: string;

      avatarUrl: string | null;

      isVerified: boolean;
    }>,
    page: number,
    pageSize: number,
    total: number,
  ): PaginationResponseDto<SearchUserResponse> {
    const items = users.map((user) => this.toSearchUserResponse(user));

    return {
      items,

      page,

      pageSize,

      total,

      totalPages: Math.ceil(total / pageSize),

      hasNext: page * pageSize < total,

      hasPrevious: page > 1,
    };
  }

  static toFollowerResponse(follow: any): FollowerResponse {
    return {
      id: follow.follower.id,

      username: follow.follower.username,

      displayName: follow.follower.displayName,

      avatarUrl: follow.follower.avatarUrl,

      isVerified: follow.follower.isVerified,
    };
  }

  static toFollowersResponse(
    followers: any[],
    page: number,
    pageSize: number,
    total: number,
  ) {
    return {
      items: followers.map(UserMapper.toFollowerResponse),

      page,

      pageSize,

      total,

      totalPages: Math.ceil(total / pageSize),

      hasNext: page * pageSize < total,

      hasPrevious: page > 1,
    };
  }
}
