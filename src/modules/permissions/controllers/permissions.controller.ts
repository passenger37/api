import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import {
  CreatePermissionDto,
  QueryPermissionsDto,
  UpdatePermissionDto,
} from '../dto';

import { PermissionsService } from '../services';

@ApiTags('Permissions')
@Controller({
  path: 'permissions',
  version: '1',
})
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // ==========================================
  // Queries
  // ==========================================

  @Get()
  @ApiOperation({
    summary: 'Get permissions',
  })
  getPermissions(@Query() query: QueryPermissionsDto) {
    return this.permissionsService.getPermissions(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get permission by id',
  })
  @ApiParam({
    name: 'id',
  })
  getPermissionById(@Param('id') id: string) {
    return this.permissionsService.getPermissionById(id);
  }

  @Get('name/:name')
  @ApiOperation({
    summary: 'Get permission by name',
  })
  getPermissionByName(@Param('name') name: string) {
    return this.permissionsService.getPermissionByName(name);
  }

  // ==========================================
  // Commands
  // ==========================================

  @Post()
  @ApiOperation({
    summary: 'Create permission',
  })
  create(
    @Body()
    dto: CreatePermissionDto,
  ) {
    return this.permissionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update permission',
  })
  update(
    @Param('id') id: string,

    @Body()
    dto: UpdatePermissionDto,
  ) {
    return this.permissionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete permission',
  })
  delete(@Param('id') id: string) {
    return this.permissionsService.delete(id);
  }
}
