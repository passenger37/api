import { Injectable } from '@nestjs/common';

import { UserRole, Role, User } from '@prisma/client';

import { UserRoleResponseDto } from '../dto/response/user-role-response.dto';

import { UserRoleWithRoleResponseDto } from '../dto/response/user-role-with-role-response.dto';
import { UserRoleWithUserResponseDto } from '../dto/response/user-role-with-user-response.dto';

import { RoleMapper } from '../../roles/mappers';
import { UserMapper } from '../../users/mappers';

@Injectable()
export class UserRoleMapper {
  constructor(
    private readonly roleMapper: RoleMapper,
    private readonly userMapper: UserMapper,
  ) {}

  // =====================================================
  // Basic
  // =====================================================

  toBasic(entity: UserRole): UserRoleResponseDto {
    return {
      id: entity.id,

      userId: entity.userId,

      roleId: entity.roleId,

      createdAt: entity.createdAt,
    };
  }

  // =====================================================
  // With Role
  // =====================================================

  toWithRole(
    entity: UserRole & {
      role: Role;
    },
  ): UserRoleWithRoleResponseDto {
    return {
      id: entity.id,

      createdAt: entity.createdAt,

      role: {
        id: entity.role.id,
        name: entity.role.name,
      },
    };
  }

  // =====================================================
  // With User
  // =====================================================

  toWithUser(
    entity: UserRole & {
      user: User;
    },
  ): UserRoleWithUserResponseDto {
    return {
      id: entity.id,

      createdAt: entity.createdAt,

      user: {
        id: entity.user.id,
        displayName: entity.user.displayName,
        email: entity.user.email,
      },
    };
  }

  // =====================================================
  // Lists
  // =====================================================

  toBasicList(entities: UserRole[]): UserRoleResponseDto[] {
    return entities.map((entity) => this.toBasic(entity));
  }

  toWithRoleList(
    entities: (UserRole & {
      role: Role;
    })[],
  ): UserRoleWithRoleResponseDto[] {
    return entities.map((entity) => this.toWithRole(entity));
  }

  toWithUserList(
    entities: (UserRole & {
      user: User;
    })[],
  ): UserRoleWithUserResponseDto[] {
    return entities.map((entity) => this.toWithUser(entity));
  }
}
