import { Injectable } from '@nestjs/common';

import { CreatePermissionDto, UpdatePermissionDto } from '../dto';

import { PermissionResponseDto } from '../dto/permission-response.dto';

import { PermissionMapper } from '../mappers';

import { PermissionDomainService } from './permission-domain.service';

@Injectable()
export class PermissionCommandService {
  constructor(
    private readonly permissionDomainService: PermissionDomainService,
  ) {}

  /**
   * Create Permission
   */
  async create(dto: CreatePermissionDto): Promise<PermissionResponseDto> {
    const permission = await this.permissionDomainService.create(dto);

    return PermissionMapper.toResponse(permission);
  }

  /**
   * Update Permission
   */
  async update(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const permission = await this.permissionDomainService.update(id, dto);

    return PermissionMapper.toResponse(permission);
  }

  /**
   * Delete Permission
   */
  async delete(id: string): Promise<void> {
    await this.permissionDomainService.delete(id);
  }
}
