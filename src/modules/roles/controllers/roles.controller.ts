import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Put,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RolesService } from '../services/roles.service';

import { CreateRoleDto, QueryRolesDto, UpdateRoleDto } from '../dto';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // =====================================================
  // Create
  // =====================================================

  @Post()
  @ApiOperation({
    summary: 'Create role',
  })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  // =====================================================
  // Get All
  // =====================================================

  @Get()
  @ApiOperation({
    summary: 'Get roles',
  })
  getRoles(@Query() query: QueryRolesDto) {
    return this.rolesService.getRoles(query);
  }

  // =====================================================
  // Get By Id
  // =====================================================

  @Get(':id')
  @ApiOperation({
    summary: 'Get role by id',
  })
  getRoleById(@Param('id') id: string) {
    return this.rolesService.getRoleById(id);
  }

  // =====================================================
  // Update
  // =====================================================

  @Patch(':id')
  @ApiOperation({
    summary: 'Update role',
  })
  update(
    @Param('id') id: string,

    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  // =====================================================
  // Delete
  // =====================================================

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete role',
  })
  delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }
}
