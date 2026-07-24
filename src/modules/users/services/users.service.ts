import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { UserMapper } from '../mappers/user.mapper';
import { UsersRepository } from '../repositories/users.repository';
import { UserResponseDto, CurrentUserDto, PublicUserProfileDto } from '../responses';


import { QueryUsersDto } from '../dto/query-users.dto';
import { PaginatedResult, PaginatedResponseDto} from '../../../common/pagination';
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  // =====================================================
  // Create
  // =====================================================

  async create(
    data: Prisma.UserCreateInput,
  ) {
    return this.usersRepository.create(data);
  }

  // =====================================================
  // Read
  // =====================================================

  async findByIdentifier(
    identifier: string,
  ) {
    return this.usersRepository.findByEmailOrUsername(
      identifier,
    );
  }

  async findById(
    id: string,
  ) {
    return this.usersRepository.findById(id);
  }

  async findByUsername(
    username: string,
  ) {
    return this.usersRepository.findByUsername(
      username,
    );
  }

  async findByEmail(
    email: string,
  ) {
    return this.usersRepository.findByEmail(
      email,
    );
  }

  async getUserById(
    userId: string,
  ): Promise<UserResponseDto> {
    const user =
      await this.usersRepository.findById(
        userId,
      );

    if (!user) {
      throw new NotFoundException(
        'User not found.',
      );
    }

    return UserMapper.toResponse(user);
  }

  async getCurrentUser(
  userId: string,
): Promise<CurrentUserDto> {
  const user =
    await this.usersRepository.findById(
      userId,
    );

  if (!user) {
    throw new NotFoundException(
      'User not found.',
    );
  }

  return UserMapper.toCurrentUser(
    user,
  );
}

async getPublicProfile(
  username: string,
): Promise<PublicUserProfileDto> {
  const user =
    await this.usersRepository.findByUsername(
      username,
    );

  if (!user) {
    throw new NotFoundException(
      'User not found.',
    );
  }

  return UserMapper.toPublicProfile(
    user,
  );
}

// =====================================================
// Query
// =====================================================

async getUsers(
  query: QueryUsersDto,
): Promise<PaginatedResponseDto<UserResponseDto>> {
  const result =
    await this.usersRepository.findMany(
      query,
    );

return {
  items: result.items.map(user =>
    UserMapper.toResponse(user),
  ),

  total: result.total,
};
}
}