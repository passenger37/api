import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';

import { UserResponseDto } from '../responses';

import { UserDomainService } from './user-domain.service';
import { UserProfileDomainService } from './user-profile-domain.service';
import { UsersRepository } from '../repositories/users.repository';

import { UpdateMyProfileRequest } from '../dto/request/update-my-profile.request';

import { UpdateMyProfileData } from '../domain/update-my-profile.interface';
import { UserMapper } from '../mappers/user.mapper';
import { UserValidationService } from './user-validation.service';
import { Gender } from '@prisma/client';

@Injectable()
export class UserCommandService {
  constructor(
    private readonly userDomainService: UserDomainService,
    private readonly userProfileDomainService: UserProfileDomainService,
    private readonly repository: UsersRepository,
    private readonly validation: UserValidationService,
  ) {}

  async createForRegistration(input: Prisma.UserCreateInput) {
    return this.userDomainService.createForRegistration(input);
  }

  async createByAdmin(dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userDomainService.createByAdmin(dto);
  }

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
}
