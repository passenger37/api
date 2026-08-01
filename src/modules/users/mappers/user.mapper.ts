import { User } from '@prisma/client';

import {
  CurrentUserDto,
  PublicUserProfileDto,
  UserResponseDto,
} from '../responses';

import { UserSummaryResponseDto } from '../../users/dto/response/user-summary-response.dto';
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
}
