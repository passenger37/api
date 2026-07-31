import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  AssignPermissionToRoleDto,
  AssignPermissionsToRoleDto,
  ReplaceRolePermissionsDto,
} from '../dto';

import { RolePermissionsService } from '../services';

@ApiTags('Role Permissions')
@Controller()
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  // =====================================================
  // Assign One Permission
  // =====================================================

  @Post('roles/:roleId/permissions')
  @ApiOperation({
    summary: 'Assign one permission to role',
  })
  assign(
    @Param('roleId')
    roleId: string,

    @Body()
    dto: AssignPermissionToRoleDto,
  ) {
    return this.rolePermissionsService.assign({
      roleId,
      permissionId: dto.permissionId,
    });
  }

  // =====================================================
  // Assign Multiple Permissions
  // =====================================================

  @Post('roles/:roleId/permissions/bulk')
  @ApiOperation({
    summary: 'Assign multiple permissions',
  })
  assignMany(
    @Param('roleId')
    roleId: string,

    @Body()
    dto: AssignPermissionsToRoleDto,
  ) {
    return this.rolePermissionsService.assignMany({
      roleId,
      permissionIds: dto.permissionIds,
    });
  }

  // =====================================================
  // Replace Permissions
  // =====================================================

  @Put('roles/:roleId/permissions')
  @ApiOperation({
    summary: 'Replace permissions',
  })
  replace(
    @Param('roleId')
    roleId: string,

    @Body()
    dto: ReplaceRolePermissionsDto,
  ) {
    return this.rolePermissionsService.replace({
      roleId,
      permissionIds: dto.permissionIds,
    });
  }

  // =====================================================
  // Remove Permission
  // =====================================================

  @Delete('roles/:roleId/permissions/:permissionId')
  @ApiOperation({
    summary: 'Remove permission',
  })
  remove(
    @Param('roleId')
    roleId: string,

    @Param('permissionId')
    permissionId: string,
  ) {
    return this.rolePermissionsService.remove({
      roleId,
      permissionId,
    });
  }

  // =====================================================
  // Permissions Of Role
  // =====================================================

  @Get('roles/:roleId/permissions')
  @ApiOperation({
    summary: 'Permissions of role',
  })
  getPermissions(
    @Param('roleId')
    roleId: string,
  ) {
    return this.rolePermissionsService.getPermissionsByRole(roleId);
  }

  // =====================================================
  // Roles Of Permission
  // =====================================================

  @Get('permissions/:permissionId/roles')
  @ApiOperation({
    summary: 'Roles of permission',
  })
  getRoles(
    @Param('permissionId')
    permissionId: string,
  ) {
    return this.rolePermissionsService.getRolesByPermission(permissionId);
  }
}
