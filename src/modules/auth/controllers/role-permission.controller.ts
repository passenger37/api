import { Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { Authorize } from '../../../common/decorators';

import { RoleService } from '../services/role.service';

@ApiBearerAuth('JWT')
@ApiTags('Role Permissions')
@Controller({
  path: 'roles',
  version: '1',
})
export class RolePermissionController {
  constructor(private readonly roleService: RoleService) {}

  @Get(':roleId/permissions')
  @Authorize('roles.read')
  @ApiOperation({
    summary: 'Get permissions assigned to a role',
  })
  getPermissions(
    @Param('roleId')
    roleId: string,
  ) {
    return this.roleService.getPermissions(roleId);
  }

  @Post(':roleId/permissions/:permissionId')
  @Authorize('roles.update')
  @ApiOperation({
    summary: 'Assign permission to role',
  })
  assignPermission(
    @Param('roleId')
    roleId: string,

    @Param('permissionId')
    permissionId: string,
  ) {
    return this.roleService.assignPermission(roleId, permissionId);
  }

  @Delete(':roleId/permissions/:permissionId')
  @Authorize('roles.update')
  @ApiOperation({
    summary: 'Remove permission from role',
  })
  removePermission(
    @Param('roleId')
    roleId: string,

    @Param('permissionId')
    permissionId: string,
  ) {
    return this.roleService.removePermission(roleId, permissionId);
  }
}
