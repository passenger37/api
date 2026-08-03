import { Injectable, NotFoundException } from '@nestjs/common';
import { Gender, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { UsersRepository } from '../repositories/users.repository';
import { UserSocialRepository } from '../repositories/user-social.repository';

import { UserDomainService } from './user-domain.service';
import { UserProfileDomainService } from './user-profile-domain.service';
import { UserValidationService } from './user-validation.service';

import { UserMapper } from '../mappers/user.mapper';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';

import { UpdateMyProfileRequest } from '../dto/request/update-my-profile.request';
import { UpdateMyProfileData } from '../domain/update-my-profile.interface';

import { UserResponseDto } from '../responses';

import { FollowActionResponse } from '../dto/response/follow-action.response';
import { FollowActionResult } from '../enums/follow-action-result.enum';

@Injectable()
export class UserCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userDomainService: UserDomainService,
    private readonly userProfileDomainService: UserProfileDomainService,
    private readonly repository: UsersRepository,
    private readonly validation: UserValidationService,
    private readonly socialRepository: UserSocialRepository,
  ) {}

  // =====================================================
  // Registration
  // =====================================================

  async createForRegistration(input: Prisma.UserCreateInput) {
    return this.userDomainService.createForRegistration(input);
  }

  async createByAdmin(dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userDomainService.createByAdmin(dto);
  }

  // =====================================================
  // Profile
  // =====================================================

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
    return this.userProfileDomainService.updateProfile(userId, dto);
  }

  async updateMyProfile(userId: string, request: UpdateMyProfileRequest) {
    const data: UpdateMyProfileData = {
      ...request,

      dateOfBirth: request.dateOfBirth
        ? new Date(request.dateOfBirth)
        : undefined,

      gender: request.gender as Gender | undefined,
    };

    await this.validation.validateProfileUpdate(userId, data);

    const user = await this.repository.updateMyProfile(userId, data);

    return UserMapper.toMyProfileResponse(user);
  }

  // =====================================================
  // Follow User
  // =====================================================

  async followUser(
    followerId: string,
    followingId: string,
  ): Promise<FollowActionResponse> {
    await this.validation.validateUserExists(followingId);

    this.validation.validateCannotFollowSelf(followerId, followingId);

    await this.validation.validateNotAlreadyFollowing(followerId, followingId);

    await this.validation.validateNotAlreadyRequested(followerId, followingId);

    const targetUser = await this.repository.findById(followingId);

    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (targetUser.isPrivate) {
        await this.socialRepository.sendFollowRequest(
          followerId,
          followingId,
          tx,
        );

        return {
          status: FollowActionResult.REQUEST_SENT,
        };
      }

      await this.socialRepository.followUser(followerId, followingId, tx);

      return {
        status: FollowActionResult.FOLLOWED,
      };
    });
  }

  // =====================================================
  // Unfollow User
  // =====================================================

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await this.validation.validateUserExists(followingId);

    await this.validation.validateFollowExists(followerId, followingId);

    await this.prisma.$transaction(async (tx) => {
      await this.socialRepository.unfollowUser(followerId, followingId, tx);
    });
  }

  // =====================================================
  // Block User
  // =====================================================

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.validation.validateUserExists(blockedId);

    this.validation.validateCannotBlockSelf(blockerId, blockedId);

    await this.validation.validateNotAlreadyBlocked(blockerId, blockedId);

    await this.prisma.$transaction(async (tx) => {
      await this.socialRepository.blockUser(blockerId, blockedId, tx);

      await this.socialRepository.removeFollowRelationship(
        blockerId,
        blockedId,
        tx,
      );
    });
  }

  // =====================================================
  // Unblock User
  // =====================================================

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.validation.validateUserExists(blockedId);

    await this.validation.validateBlockExists(blockerId, blockedId);

    await this.prisma.$transaction(async (tx) => {
      await this.socialRepository.unblockUser(blockerId, blockedId, tx);
    });
  }

  // =====================================================
  // Mute User
  // =====================================================

  async muteUser(muterId: string, mutedId: string): Promise<void> {
    await this.validation.validateUserExists(mutedId);

    this.validation.validateCannotMuteSelf(muterId, mutedId);

    await this.validation.validateNotAlreadyMuted(muterId, mutedId);

    await this.prisma.$transaction(async (tx) => {
      await this.socialRepository.muteUser(muterId, mutedId, tx);
    });
  }

  // =====================================================
  // Unmute User
  // =====================================================

  async unmuteUser(muterId: string, mutedId: string): Promise<void> {
    await this.validation.validateUserExists(mutedId);

    await this.validation.validateMuteExists(muterId, mutedId);

    await this.prisma.$transaction(async (tx) => {
      await this.socialRepository.unmuteUser(muterId, mutedId, tx);
    });
  }

  // =====================================================
  // Cancel Follow Request
  // =====================================================

  async cancelFollowRequest(
    requesterId: string,
    receiverId: string,
  ): Promise<void> {
    await this.validation.validateUserExists(receiverId);

    await this.validation.validateFollowRequestExists(requesterId, receiverId);

    await this.prisma.$transaction(async (tx) => {
      await this.socialRepository.cancelFollowRequest(
        requesterId,
        receiverId,
        tx,
      );
    });
  }
}
