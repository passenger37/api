import { Injectable } from '@nestjs/common';

import {
  CreatePermissionDto,
  QueryPermissionsDto,
  UpdatePermissionDto,
} from '../dto';

import { PermissionResponseDto } from '../dto/permission-response.dto';

import { PermissionQueryService } from './permission-query.service';
import { PermissionCommandService } from './permission-command.service';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly permissionQueryService: PermissionQueryService,
    private readonly permissionCommandService: PermissionCommandService,
  ) {}

  // ==========================================
  // Queries
  // ==========================================

  async getPermissions(
    query: QueryPermissionsDto,
  ): Promise<PermissionResponseDto[]> {
    return this.permissionQueryService.getPermissions(query);
  }

  async getPermissionById(id: string): Promise<PermissionResponseDto> {
    return this.permissionQueryService.getPermissionById(id);
  }

  async getPermissionByName(name: string): Promise<PermissionResponseDto> {
    return this.permissionQueryService.getPermissionByName(name);
  }

  // ==========================================
  // Commands
  // ==========================================

  async create(dto: CreatePermissionDto): Promise<PermissionResponseDto> {
    return this.permissionCommandService.create(dto);
  }

  async update(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionCommandService.update(id, dto);
  }

  async delete(id: string): Promise<void> {
    return this.permissionCommandService.delete(id);
  }
}
