import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { UsersRepository } from '../repositories/users.repository';

import { CreateUserDto } from '../dto/create-user.dto';

import { UserResponseDto } from '../responses';

import { UserMapper } from '../mappers';

import { UserFactory } from '../factories/user.factory';

import { UserValidationService } from './user-validation.service';

import { PasswordService } from '../../security/services/password.service';

import { SearchService } from '../../search/services/search.service';

@Injectable()
export class UserDomainService {
  private readonly logger = new Logger(UserDomainService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userValidationService: UserValidationService,
    private readonly passwordService: PasswordService,
    private readonly userFactory: UserFactory,
    private readonly searchService: SearchService,
  ) {}

  // =====================================================
  // Registration
  // =====================================================

  async createForRegistration(input: Prisma.UserCreateInput) {
    await this.userValidationService.validateUniqueUser(
      input.email,
      input.username,
    );

    const user = await this.usersRepository.create(input);

    await this.indexUser(user);

    return user;
  }

  // =====================================================
  // Admin Create User
  // =====================================================

  async createByAdmin(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.userValidationService.validateUniqueUser(
      dto.email,
      dto.username,
    );

    const passwordHash = await this.passwordService.hash(dto.password);

    const input = this.userFactory.createForRegistration(dto, passwordHash);

    const user = await this.usersRepository.create(input);

    await this.indexUser(user);

    return UserMapper.toResponse(user);
  }

  private async indexUser(user: {
    id: string;
    username: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: Date;
  }) {
    try {
      await this.searchService.indexUser(user.id, {
        username: user.username,
        displayName: user.displayName ?? user.username,
        bio: user.bio || undefined,
        avatarUrl: user.avatarUrl || undefined,
        createdAt: user.createdAt,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to index user ${user.id} in search: ${(error as Error).message}`,
      );
    }
  }
}
