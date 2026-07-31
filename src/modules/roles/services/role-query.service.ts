import { Injectable, NotFoundException } from '@nestjs/common';

import { RoleMapper } from '../mappers';

import { RolesRepository } from '../repositories/roles.repository';

import { QueryRolesDto } from '../dto';

import { RoleResponseDto } from '../dto/response/role-response.dto';

@Injectable()
export class RoleQueryService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  // =====================================================
  // Get Role By Id
  // =====================================================

  async getRoleById(id: string): Promise<RoleResponseDto> {
    const role = await this.rolesRepository.findById(id);

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    return RoleMapper.toResponse(role);
  }

  // =====================================================
  // Get Role By Name
  // =====================================================

  async getRoleByName(name: string): Promise<RoleResponseDto> {
    const role = await this.rolesRepository.findByName(name);

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    return RoleMapper.toResponse(role);
  }

  // =====================================================
  // Get All Roles
  // =====================================================

  async getRoles(query: QueryRolesDto): Promise<RoleResponseDto[]> {
    // Pagination, search and sorting
    // will be implemented in a later lecture.

    const roles = await this.rolesRepository.findMany();

    return RoleMapper.toResponseList(roles);
  }
}
