import { Injectable } from '@nestjs/common';

import { Prisma, PrismaClient, User, UserStatus } from '@prisma/client';

import { PrismaService } from '../../../core/database/prisma.service';

import { QueryUsersDto } from '../dto/query-users.dto';

import { PaginatedResult } from '../../../common/pagination/interfaces/paginated-result.interface';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    const where = this.buildWhereClause(query);

    const page = query.page ?? 1;

    const pageSize = query.pageSize ?? 20;

    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,

        skip,

        take: pageSize,

        orderBy: {
          createdAt: 'desc',
        },
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

  async updateProfile() {
    throw new Error('Not implemented yet.');
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
    const where = this.buildWhereClause(query);

    return this.prisma.user.count({
      where,
    });
  }

  // =====================================================
  // Private Helpers
  // =====================================================

  private buildWhereClause(query: QueryUsersDto): Prisma.UserWhereInput {
    return {
      ...(query.status && {
        status: query.status,
      }),

      ...(query.search && {
        OR: [
          {
            username: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
          {
            displayName: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };
  }
}
