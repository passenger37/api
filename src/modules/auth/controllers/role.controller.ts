import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';

import { RoleService } from '../services/role.service';

import { AssignRoleDto } from '../dto/assign-role.dto';
import { RemoveRoleDto } from '../dto/remove-role.dto';

@ApiTags('Roles')
@ApiBearerAuth('JWT')
@Controller({
  path: 'roles',
  version: '1',
})
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
  ) {}

  @Get()
  @Permissions('roles.read')
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  @Permissions('roles.read')
  findOne(
    @Param('id') id: string,
  ) {
    return this.roleService.findById(id);
  }

  @Post('assign')
  @Permissions('roles.assign')
  assignRole(
    @Body() dto: AssignRoleDto,
  ) {
    return this.roleService.assignRole(
      dto.userId,
      dto.roleId,
    );
  }

  @Delete('remove')
  @Permissions('roles.remove')
  removeRole(
    @Body() dto: RemoveRoleDto,
  ) {
    return this.roleService.removeRole(
      dto.userId,
      dto.roleId,
    );
  }
}