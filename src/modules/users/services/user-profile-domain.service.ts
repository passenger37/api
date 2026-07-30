import { Injectable, NotFoundException } from '@nestjs/common';

import { UsersRepository } from '../repositories/users.repository';

import {
  UserResponseDto,
  CurrentUserDto,
  PublicUserProfileDto,
} from '../responses';

import { UserMapper } from '../mappers';
import { UserProfileFactory } from '../factories';

import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';

@Injectable()
export class UserProfileDomainService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userProfileFactory: UserProfileFactory,
  ) {}

  // =====================================================
  // User
  // =====================================================

  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return UserMapper.toResponse(user);
  }

  // =====================================================
  // Current User
  // =====================================================

  async getCurrentProfile(userId: string): Promise<CurrentUserDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return UserMapper.toCurrentUser(user);
  }

  // =====================================================
  // Public Profile
  // =====================================================

  async getPublicProfile(username: string): Promise<PublicUserProfileDto> {
    const user = await this.usersRepository.findByUsername(username);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return UserMapper.toPublicProfile(user);
  }

  // =====================================================
  // Update Profile
  // =====================================================

  async updateProfile(
    userId: string,
    dto: UpdateUserProfileDto,
  ): Promise<UserResponseDto> {
    const existingUser = await this.usersRepository.findById(userId);

    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    const updateData = this.userProfileFactory.createUpdateInput(dto);

    const updatedUser = await this.usersRepository.updateProfile(
      userId,
      updateData,
    );

    return UserMapper.toResponse(updatedUser);
  }
}
