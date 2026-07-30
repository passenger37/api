import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';

import { UserResponseDto } from '../responses';

import { UserDomainService } from './user-domain.service';
import { UserProfileDomainService } from './user-profile-domain.service';

@Injectable()
export class UserCommandService {
  constructor(
    private readonly userDomainService: UserDomainService,
    private readonly userProfileDomainService: UserProfileDomainService,
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
}
