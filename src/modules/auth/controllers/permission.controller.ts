import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';

import { PermissionService } from '../services/permission.service';

import { AssignPermissionDto } from '../dto/assign-permission.dto';
import { RemovePermissionDto } from '../dto/remove-permission.dto';

@ApiTags('Permissions')
@ApiBearerAuth('JWT')
@Controller({
  path: 'permissions',
  version: '1',
})
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @Permissions('permissions.read')
  findAll() {
    return this.permissionService.findAll();
  }

  @Get(':id')
  @Permissions('permissions.read')
  findOne(@Param('id') id: string) {
    return this.permissionService.findById(id);
  }

  @Post('assign')
  @Permissions('permissions.assign')
  assignPermission(@Body() dto: AssignPermissionDto) {
    return this.permissionService.assignPermissionToRole(
      dto.roleId,
      dto.permissionId,
    );
  }

  @Delete('remove')
  @Permissions('permissions.remove')
  removePermission(@Body() dto: RemovePermissionDto) {
    return this.permissionService.removePermissionFromRole(
      dto.roleId,
      dto.permissionId,
    );
  }
}
