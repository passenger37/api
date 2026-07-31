import { Injectable } from '@nestjs/common';

import { CreateRoleDto, UpdateRoleDto } from '../dto';

import { RoleResponseDto } from '../responses';

import { RoleMapper } from '../mappers';

import { RoleDomainService } from './role-domain.service';

@Injectable()
export class RoleCommandService {
  constructor(private readonly roleDomainService: RoleDomainService) {}

  // =====================================================
  // Create
  // =====================================================

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const role = await this.roleDomainService.create(dto);

    return RoleMapper.toResponse(role);
  }

  // =====================================================
  // Update
  // =====================================================

  async update(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.roleDomainService.update(id, dto);

    return RoleMapper.toResponse(role);
  }

  // =====================================================
  // Delete
  // =====================================================

  async delete(id: string): Promise<RoleResponseDto> {
    const role = await this.roleDomainService.delete(id);

    return RoleMapper.toResponse(role);
  }
}
