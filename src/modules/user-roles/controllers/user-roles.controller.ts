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
  AssignRoleToUserDto,
  AssignRolesToUserDto,
  ReplaceUserRolesDto,
} from '../dto';

import { UserRolesService } from '../services/user-roles.service';

@ApiTags('users')
@Controller('user-roles')
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  // =====================================================
  // Assign One Role
  // =====================================================

  @Post(':userId/roles')
  @ApiOperation({
    summary: 'Assign one role to a user',
  })
  assign(@Param('userId') userId: string, @Body() dto: AssignRoleToUserDto) {
    return this.userRolesService.assign(userId, dto.roleId);
  }

  // =====================================================
  // Assign Multiple Roles
  // =====================================================

  @Post(':userId/roles/bulk')
  @ApiOperation({
    summary: 'Assign multiple roles to a user',
  })
  assignMany(
    @Param('userId') userId: string,
    @Body() dto: AssignRolesToUserDto,
  ) {
    return this.userRolesService.assignMany(userId, dto.roleIds);
  }

  // =====================================================
  // Replace All Roles
  // =====================================================

  @Put(':userId/roles')
  @ApiOperation({
    summary: 'Replace all roles of a user',
  })
  replace(@Param('userId') userId: string, @Body() dto: ReplaceUserRolesDto) {
    return this.userRolesService.replace(userId, dto.roleIds);
  }

  // =====================================================
  // Remove One Role
  // =====================================================

  @Delete(':userId/roles/:roleId')
  @ApiOperation({
    summary: 'Remove a role from a user',
  })
  remove(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.userRolesService.remove(userId, roleId);
  }

  // =====================================================
  // Find Assignment
  // =====================================================

  @Get('role-assignments/:id')
  @ApiOperation({
    summary: 'Get user-role assignment by id',
  })
  findById(@Param('id') id: string) {
    return this.userRolesService.findById(id);
  }

  // =====================================================
  // Get Roles Of User
  // =====================================================

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get all roles assigned to a user',
  })
  getRolesByUser(@Param('userId') userId: string) {
    return this.userRolesService.getRolesByUser(userId);
  }

  // =====================================================
  // Get Users Of Role
  // =====================================================

  @Get('/roles/:roleId/users')
  @ApiOperation({
    summary: 'Get all users assigned to a role',
  })
  getUsersByRole(@Param('roleId') roleId: string) {
    return this.userRolesService.getUsersByRole(roleId);
  }
}
