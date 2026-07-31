import {
  Injectable,
  Body,
  Delete,
  Param,
  Post,
  Put,
  Get,
} from '@nestjs/common';

import { CreateRoleDto, QueryRolesDto, UpdateRoleDto } from '../dto';

import { RoleResponseDto } from '../dto/response/role-response.dto';

import { RoleQueryService } from './role-query.service';
import { RoleCommandService } from './role-command.service';
@Injectable()
export class RolesService {
  constructor(
    private readonly roleQueryService: RoleQueryService,
    private readonly roleCommandService: RoleCommandService,
  ) {}

  getRoleById(id: string): Promise<RoleResponseDto> {
    return this.roleQueryService.getRoleById(id);
  }

  getRoleByName(name: string): Promise<RoleResponseDto> {
    return this.roleQueryService.getRoleByName(name);
  }

  getRoles(query: QueryRolesDto): Promise<RoleResponseDto[]> {
    return this.roleQueryService.getRoles(query);
  }

  create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.roleCommandService.create(dto);
  }

  update(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    return this.roleCommandService.update(id, dto);
  }

  delete(id: string): Promise<RoleResponseDto> {
    return this.roleCommandService.delete(id);
  }
}
