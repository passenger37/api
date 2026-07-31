import { Injectable } from '@nestjs/common';

import {
  AssignPermissionToRoleDto,
  AssignPermissionsToRoleDto,
  RemovePermissionFromRoleDto,
  ReplaceRolePermissionsDto,
} from '../dto';

import { RolePermissionCommandService } from './role-permission-command.service';
import { RolePermissionQueryService } from './role-permission-query.service';

@Injectable()
export class RolePermissionsService {
  constructor(
    private readonly commandService: RolePermissionCommandService,
    private readonly queryService: RolePermissionQueryService,
  ) {}

  // =====================================================
  // Query
  // =====================================================

  findById(id: string) {
    return this.queryService.findById(id);
  }

  getPermissionsByRole(roleId: string) {
    return this.queryService.getPermissionsByRole(roleId);
  }

  getRolesByPermission(permissionId: string) {
    return this.queryService.getRolesByPermission(permissionId);
  }

  // =====================================================
  // Commands
  // =====================================================

  assign(dto: AssignPermissionToRoleDto) {
    return this.commandService.assign(dto);
  }

  remove(dto: RemovePermissionFromRoleDto) {
    return this.commandService.remove(dto);
  }

  assignMany(dto: AssignPermissionsToRoleDto) {
    return this.commandService.assignMany(dto);
  }

  replace(dto: ReplaceRolePermissionsDto) {
    return this.commandService.replace(dto);
  }
}
