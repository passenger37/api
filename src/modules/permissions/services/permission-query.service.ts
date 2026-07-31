import { Injectable, NotFoundException } from '@nestjs/common';

import { PermissionsRepository } from '../repositories';

import { QueryPermissionsDto } from '../dto';

import { PermissionResponseDto } from '../dto';

import { PermissionMapper } from '../mappers';

@Injectable()
export class PermissionQueryService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  /**
   * Get permission by id
   */
  async getPermissionById(id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionsRepository.findById(id);

    if (!permission) {
      throw new NotFoundException('Permission not found.');
    }

    return PermissionMapper.toResponse(permission);
  }

  /**
   * Get permission by name
   */
  async getPermissionByName(name: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionsRepository.findByName(name);

    if (!permission) {
      throw new NotFoundException('Permission not found.');
    }

    return PermissionMapper.toResponse(permission);
  }

  /**
   * Get all permissions
   */
  async getPermissions(
    query: QueryPermissionsDto,
  ): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionsRepository.findMany(query);

    return PermissionMapper.toResponseList(permissions);
  }
}
