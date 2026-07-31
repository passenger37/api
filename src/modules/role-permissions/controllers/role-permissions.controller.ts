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
  RemovePermissionFromRoleDto,
  ReplaceRolePermissionsDto,
} from '../dto';

import { RolePermissionsService } from '../services/role-permissions.service';

@ApiTags('Role Permissions')
@Controller('role-permissions')
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  // =====================================================
  // Assign one permission
  // =====================================================

  @Post()
  @ApiOperation({
    summary: 'Assign a permission to a role',
  })
  assign(
    @Body()
    dto: AssignPermissionToRoleDto,
  ) {
    return this.rolePermissionsService.assign(dto);
  }

  // =====================================================
  // Assign multiple permissions
  // =====================================================

  @Post('bulk')
  @ApiOperation({
    summary: 'Assign multiple permissions to a role',
  })
  assignMany(
    @Body()
    dto: AssignPermissionsToRoleDto,
  ) {
    return this.rolePermissionsService.assignMany(dto);
  }

  // =====================================================
  // Replace permissions
  // =====================================================

  @Put('replace')
  @ApiOperation({
    summary: 'Replace role permissions',
  })
  replace(
    @Body()
    dto: ReplaceRolePermissionsDto,
  ) {
    return this.rolePermissionsService.replace(dto);
  }

  // =====================================================
  // Remove permission
  // =====================================================

  @Delete()
  @ApiOperation({
    summary: 'Remove permission from role',
  })
  remove(
    @Body()
    dto: RemovePermissionFromRoleDto,
  ) {
    return this.rolePermissionsService.remove(dto);
  }

  // =====================================================
  // Find assignment
  // =====================================================

  @Get(':id')
  @ApiOperation({
    summary: 'Get role permission assignment',
  })
  findById(
    @Param('id')
    id: string,
  ) {
    return this.rolePermissionsService.findById(id);
  }

  // =====================================================
  // Permissions of role
  // =====================================================

  @Get('role/:roleId')
  @ApiOperation({
    summary: 'Get permissions of a role',
  })
  getPermissionsByRole(
    @Param('roleId')
    roleId: string,
  ) {
    return this.rolePermissionsService.getPermissionsByRole(roleId);
  }

  // =====================================================
  // Roles of permission
  // =====================================================

  @Get('permission/:permissionId')
  @ApiOperation({
    summary: 'Get roles assigned to a permission',
  })
  getRolesByPermission(
    @Param('permissionId')
    permissionId: string,
  ) {
    return this.rolePermissionsService.getRolesByPermission(permissionId);
  }
}
