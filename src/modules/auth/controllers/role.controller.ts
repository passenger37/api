import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth
} from '@nestjs/swagger';

import {
  CreateRoleDto,
  UpdateRoleDto,
} from '../dto';

import { RoleService } from '../services/role.service';

import { Authorize } from '../../../common/decorators';

@ApiTags('Roles')
@ApiBearerAuth('JWT')
@Controller({
  path: 'roles',
  version: '1',
})
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
  ) {}

  @Get()
  @Authorize('roles.read')
  @ApiOperation({
    summary: 'Get all roles',
  })
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  @Authorize('roles.read')
  @ApiOperation({
    summary: 'Get role by id',
  })
  findById(
    @Param('id') id: string,
  ) {
    return this.roleService.findById(id);
  }

  @Post()
  @Authorize('roles.create')
  @ApiOperation({
    summary: 'Create role',
  })
  create(
    @Body()
    dto: CreateRoleDto,
  ) {
    return this.roleService.create(dto);
  }

  @Patch(':id')
  @Authorize('roles.update')
  @ApiOperation({
    summary: 'Update role',
  })
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateRoleDto,
  ) {
    return this.roleService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  @Authorize('roles.delete')
  @ApiOperation({
    summary: 'Delete role',
  })
  delete(
    @Param('id')
    id: string,
  ) {
    return this.roleService.delete(id);
  }
}