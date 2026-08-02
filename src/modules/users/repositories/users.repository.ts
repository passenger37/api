import { Injectable } from '@nestjs/common';

import { Prisma, PrismaClient, User, UserStatus } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { QueryUsersDto } from '../dto/query-users.dto';

import { PaginatedResult } from '../../../common/pagination/interfaces/paginated-result.interface';

import { UsersFilterBuilder } from '../builders/users-filter.builder';

import { UpdateMyProfileData } from '../domain/update-my-profile.interface';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}
  private readonly allowedFields: readonly (keyof Prisma.UserSelect)[] = [
    'id',
    'username',
    'displayName',
    'avatarUrl',
    'bio',
    'status',
    'createdAt',
    'updatedAt',
  ];
  // =====================================================
  // Create
  // =====================================================

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  // =====================================================
  // Read
  // =====================================================

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
  }

  // =====================================================
  // Query
  // =====================================================

  async findMany(query: QueryUsersDto): Promise<PaginatedResult<User>> {
    const where = UsersFilterBuilder.build(query);

    const page = query.page ?? 1;

    const pageSize = query.pageSize ?? 20;

    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: this.buildOrderBy(query),
        select: this.buildSelect(query),
      }),

      this.prisma.user.count({
        where,
      }),
    ]);

    return {
      items,
      total,
    };
  }

  async findManyByCursor(query: QueryUsersDto): Promise<PaginatedResult<User>> {
    const where = UsersFilterBuilder.build(query);

    const limit = query.limit ?? 20;

    const items = await this.prisma.user.findMany({
      where,

      take: limit,

      cursor: query.cursor
        ? {
            id: query.cursor,
          }
        : undefined,

      skip: query.cursor ? 1 : 0,

      orderBy: {
        id: 'asc',
      },
    });

    return {
      items,
      total: items.length,
    };
  }
  // =====================================================
  // Exists
  // =====================================================

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        id,
      },
    });

    return count > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        email,
      },
    });

    return count > 0;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        username,
      },
    });

    return count > 0;
  }

  // =====================================================
  // Update
  // =====================================================

  async updateProfile(userId: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data,
    });
  }

  async updatePreferences() {
    throw new Error('Not implemented yet.');
  }

  async updatePrivacy() {
    throw new Error('Not implemented yet.');
  }

  async updatePassword() {
    throw new Error('Not implemented yet.');
  }

  async updateStatus(userId: string, status: UserStatus): Promise<User> {
    throw new Error('Not implemented yet.');
  }

  async updateLastSeen() {
    throw new Error('Not implemented yet.');
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: {
        id,
      },
      data,
    });
  }

  // =====================================================
  // Delete
  // =====================================================

  async softDelete() {
    throw new Error('Not implemented yet.');
  }

  async restore() {
    throw new Error('Not implemented yet.');
  }

  // =====================================================
  // Utility
  // =====================================================

  async count(query: QueryUsersDto): Promise<number> {
    const where = UsersFilterBuilder.build(query);

    return this.prisma.user.count({
      where,
    });
  }

  // =====================================================
  // Private Helpers
  // =====================================================

  private buildOrderBy(
    query: QueryUsersDto,
  ): Prisma.UserOrderByWithRelationInput {
    return {
      [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
    };
  }

  private buildSelect(query: QueryUsersDto): Prisma.UserSelect | undefined {
    if (!query.fields) {
      return undefined;
    }

    const select: Prisma.UserSelect = {};

    const requestedFields = query.fields
      .split(',')
      .map((field) => field.trim());

    for (const field of requestedFields) {
      if (this.allowedFields.includes(field as keyof Prisma.UserSelect)) {
        select[field as keyof Prisma.UserSelect] = true;
      }
    }

    return Object.keys(select).length ? select : undefined;
  }

  async findMyProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,

        email: true,

        username: true,

        displayName: true,

        avatarUrl: true,

        coverImageUrl: true,

        bio: true,

        website: true,

        phoneNumber: true,

        dateOfBirth: true,

        gender: true,

        language: true,

        timezone: true,

        country: true,

        state: true,

        city: true,

        location: true,

        isPrivate: true,

        isVerified: true,

        status: true,

        createdAt: true,

        updatedAt: true,
      },
    });
  }

  async updateMyProfile(userId: string, data: UpdateMyProfileData) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },

      data,

      select: {
        id: true,

        email: true,

        username: true,

        displayName: true,

        avatarUrl: true,

        coverImageUrl: true,

        bio: true,

        website: true,

        phoneNumber: true,

        dateOfBirth: true,

        gender: true,

        language: true,

        timezone: true,

        country: true,

        state: true,

        city: true,

        location: true,

        isPrivate: true,

        isVerified: true,

        status: true,

        createdAt: true,

        updatedAt: true,
      },
    });
  }

  // =====================================================
  // Find Public Profile
  // =====================================================

  async findPublicProfile(username: string) {
    return this.prisma.user.findUnique({
      where: {
        username,
      },

      select: {
        id: true,

        username: true,

        displayName: true,

        avatarUrl: true,

        coverImageUrl: true,

        bio: true,

        website: true,

        country: true,

        state: true,

        city: true,

        isVerified: true,

        createdAt: true,
      },
    });
  }
}
