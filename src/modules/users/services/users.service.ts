import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { UsersRepository } from '../repositories/users.repository';

import { UserResponseDto } from '../responses';

import { UserMapper } from '../mappers';
import { CreateUserDto } from '../dto/create-user.dto';
import { SearchUsersRequest } from '../dto/request/search-users.request';

import { UserValidationService } from './user-validation.service';
import { UserProfileService } from './user-profile.service';
import { UserQueryService } from './user-query.service';
import { UserCommandService } from './user-command.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

import { PasswordService } from '../../security/services/password.service';

import { UserFactory } from '../factories/user.factory';
import { UpdateMyProfileRequest } from '../dto/request/update-my-profile.request';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userValidationService: UserValidationService,
    private readonly passwordService: PasswordService,
    private readonly userFactory: UserFactory,
    private readonly userProfileService: UserProfileService,
    private readonly queryService: UserQueryService,
    private readonly commandService: UserCommandService,
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

  async getMyProfile(userId: string) {
    return this.queryService.getMyProfile(userId);
  }

  // =====================================================
  // Update My Profile
  // =====================================================

  async updateMyProfile(userId: string, request: UpdateMyProfileRequest) {
    return this.commandService.updateMyProfile(userId, request);
  }

  // =====================================================
  // Get Public Profile
  // =====================================================

  async getPublicProfile(username: string) {
    return this.queryService.getPublicProfile(username);
  }

  // =====================================================
  // Search Users
  // =====================================================

  async searchUsers(request: SearchUsersRequest) {
    return this.queryService.searchUsers(request);
  }

  // =====================================================
  // Suggested Users
  // =====================================================

  async getSuggestedUsers(
    currentUserId: string,
    pagination: PaginationQueryDto,
  ) {
    return this.queryService.getSuggestedUsers(currentUserId, pagination);
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    await this.commandService.followUser(followerId, followingId);
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await this.commandService.unfollowUser(followerId, followingId);
  }
}
