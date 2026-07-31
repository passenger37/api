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
  AssignPermissionsToRoleDto,
  AssignPermissionToRoleDto,
  ReplaceRolePermissionsDto,
} from '../dto';

import { RolePermissionsService } from '../services/role-permissions.service';

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
    summary: 'Assign a permission to a role',
  })
  assign(
    @Param('roleId') roleId: string,

    @Body()
    body: {
      permissionId: string;
    },
  ) {
    const dto: AssignPermissionToRoleDto = {
      roleId,
      permissionId: body.permissionId,
    };

    return this.rolePermissionsService.assign(dto);
  }

  // =====================================================
  // Assign Multiple Permissions
  // =====================================================

  @Post('roles/:roleId/permissions/bulk')
  @ApiOperation({
    summary: 'Assign multiple permissions to a role',
  })
  assignMany(
    @Param('roleId') roleId: string,

    @Body()
    body: {
      permissionIds: string[];
    },
  ) {
    const dto: AssignPermissionsToRoleDto = {
      roleId,
      permissionIds: body.permissionIds,
    };

    return this.rolePermissionsService.assignMany(dto);
  }

  // =====================================================
  // Replace Permissions
  // =====================================================

  @Put('roles/:roleId/permissions')
  @ApiOperation({
    summary: 'Replace all permissions of a role',
  })
  replace(
    @Param('roleId') roleId: string,

    @Body()
    body: {
      permissionIds: string[];
    },
  ) {
    const dto: ReplaceRolePermissionsDto = {
      roleId,
      permissionIds: body.permissionIds,
    };

    return this.rolePermissionsService.replace(dto);
  }

  // =====================================================
  // Remove Permission
  // =====================================================

  @Delete('roles/:roleId/permissions/:permissionId')
  @ApiOperation({
    summary: 'Remove permission from a role',
  })
  remove(
    @Param('roleId') roleId: string,

    @Param('permissionId') permissionId: string,
  ) {
    return this.rolePermissionsService.remove({
      roleId,
      permissionId,
    });
  }

  // =====================================================
  // Find Assignment
  // =====================================================

  @Get('role-permissions/:id')
  @ApiOperation({
    summary: 'Get role-permission assignment',
  })
  findById(@Param('id') id: string) {
    return this.rolePermissionsService.findById(id);
  }

  // =====================================================
  // Get Permissions of Role
  // =====================================================

  @Get('roles/:roleId/permissions')
  @ApiOperation({
    summary: 'Get all permissions of a role',
  })
  getPermissions(@Param('roleId') roleId: string) {
    return this.rolePermissionsService.getPermissionsByRole(roleId);
  }

  // =====================================================
  // Get Roles of Permission
  // =====================================================

  @Get('permissions/:permissionId/roles')
  @ApiOperation({
    summary: 'Get all roles assigned to a permission',
  })
  getRoles(@Param('permissionId') permissionId: string) {
    return this.rolePermissionsService.getRolesByPermission(permissionId);
  }
}
