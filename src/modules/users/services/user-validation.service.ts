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

  // =====================================================
  // Validate Follow Exists
  // =====================================================

  async validateFollowExists(
    followerId: string,
    followingId: string,
  ): Promise<void> {
    const exists = await this.socialRepository.existsFollow(
      followerId,
      followingId,
    );

    if (!exists) {
      throw new NotFoundException('You are not following this user.');
    }
  }

  // =====================================================
  // Validate Cannot Mute Self
  // =====================================================

  validateCannotMuteSelf(muterId: string, mutedId: string): void {
    if (muterId === mutedId) {
      throw new BadRequestException('You cannot mute yourself.');
    }
  }

  // =====================================================
  // Validate Not Already Muted
  // =====================================================

  async validateNotAlreadyMuted(
    muterId: string,
    mutedId: string,
  ): Promise<void> {
    const exists = await this.socialRepository.existsMute(muterId, mutedId);

    if (exists) {
      throw new ConflictException('User is already muted.');
    }
  }

  // =====================================================
  // Validate Mute Exists
  // =====================================================

  async validateMuteExists(muterId: string, mutedId: string): Promise<void> {
    const exists = await this.socialRepository.existsMute(muterId, mutedId);

    if (!exists) {
      throw new NotFoundException('User is not muted.');
    }
  }

  // =====================================================
  // Validate Not Already Requested
  // =====================================================

  async validateNotAlreadyRequested(
    requesterId: string,
    receiverId: string,
  ): Promise<void> {
    const exists = await this.socialRepository.existsFollowRequest(
      requesterId,
      receiverId,
    );

    if (exists) {
      throw new ConflictException('Follow request already exists.');
    }
  }

  // =====================================================
  // Validate Follow Request Exists
  // =====================================================

  async validateFollowRequestExists(
    requesterId: string,
    receiverId: string,
  ): Promise<void> {
    const exists = await this.socialRepository.existsFollowRequest(
      requesterId,
      receiverId,
    );

    if (!exists) {
      throw new NotFoundException('Follow request not found.');
    }
  }

  // =====================================================
  // Validate Cannot Follow Self
  // =====================================================

  validateCannotFollowSelf(followerId: string, followingId: string): void {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself.');
    }
  }

  // =====================================================
  // User Circle Validation
  // =====================================================

  validateCannotAddSelfToCircle(ownerId: string, memberId: string): void {
    if (ownerId === memberId) {
      throw new BadRequestException('You cannot add yourself to the circle.');
    }
  }

  async validateAlreadyInCircle(
    ownerId: string,
    memberId: string,
  ): Promise<void> {
    const exists = await this.socialRepository.existsCircleMember(
      ownerId,
      memberId,
    );

    if (exists) {
      throw new ConflictException('User is already in your circle.');
    }
  }

  async validateNotInCircle(ownerId: string, memberId: string): Promise<void> {
    const exists = await this.socialRepository.existsCircleMember(
      ownerId,
      memberId,
    );

    if (!exists) {
      throw new NotFoundException('User is not in your circle.');
    }
  }
}
