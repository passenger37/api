import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UsersRepository } from '../repositories/users.repository';
import { UpdateMyProfileData } from '../domain/update-my-profile.interface';
import { UserSocialRepository } from '../repositories/user-social.repository';

@Injectable()
export class UserValidationService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly socialRepository: UserSocialRepository,
  ) {}

  // =====================================================
  // Create User Validation
  // =====================================================

  async validateUniqueUser(email: string, username: string): Promise<void> {
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

  // =====================================================
  // Profile Update Validation
  // =====================================================

  async validateProfileUpdate(
    userId: string,
    _data: UpdateMyProfileData,
  ): Promise<void> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    // -----------------------------------------------------
    // Future validations
    // -----------------------------------------------------
    //
    // validateUsernameAvailable()
    // validatePhoneNumberAvailable()
    // validateAvatarOwnership()
    // validateCoverImageOwnership()
    // validateLanguage()
    // validateTimezone()
    // validateCountry()
    // -----------------------------------------------------
  }

  async validateUserExists(userId: string): Promise<void> {
    const exists = await this.usersRepository.existsById(userId);

    if (!exists) {
      throw new NotFoundException('User not found.');
    }
  }

  validateNotSelfFollow(followerId: string, followingId: string): void {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself.');
    }
  }

  async validateNotAlreadyFollowing(
    followerId: string,
    followingId: string,
  ): Promise<void> {
    const exists = await this.socialRepository.existsFollow(
      followerId,
      followingId,
    );

    if (exists) {
      throw new ConflictException('You are already following this user.');
    }
  }

  async validateAlreadyFollowing(
    followerId: string,
    followingId: string,
  ): Promise<void> {
    const exists = await this.socialRepository.existsFollow(
      followerId,
      followingId,
    );

    if (!exists) {
      throw new NotFoundException('Follow relationship not found.');
    }
  }

  // =====================================================
  // Block Validation
  // =====================================================

  validateCannotBlockSelf(blockerId: string, blockedId: string): void {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself.');
    }
  }

  async validateNotAlreadyBlocked(
    blockerId: string,
    blockedId: string,
  ): Promise<void> {
    const exists = await this.socialRepository.existsBlock(
      blockerId,
      blockedId,
    );

    if (exists) {
      throw new ConflictException('User is already blocked.');
    }
  }

  async validateBlockExists(
    blockerId: string,
    blockedId: string,
  ): Promise<void> {
    const exists = await this.socialRepository.existsBlock(
      blockerId,
      blockedId,
    );

    if (!exists) {
      throw new NotFoundException('Block relationship not found.');
    }
  }
}
