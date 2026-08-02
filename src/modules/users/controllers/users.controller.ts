import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Patch,
  UseGuards,
  Put,
  Delete,
  Req,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { UpdateMyProfileRequest } from '../dto/request/update-my-profile.request';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { PublicUserProfileDto, UserResponseDto } from '../responses';

import { QueryUsersDto, SortOrder, UserSortBy } from '../dto/query-users.dto';
import { PaginatedResponseDto } from '../../../common/pagination/dto/paginated-response.dto';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { UsersService } from '../services/users.service';
import { UserQueryService } from '../services/user-query.service';
import { UserProfileDomainService } from '../services/user-profile-domain.service';

import { Public } from '../../../common/decorators/public.decorator';
import type { JwtUser } from '../../auth/interfaces/jwt-user.interface';
@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userQueryService: UserQueryService,
    private readonly userProfileDomainService: UserProfileDomainService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  async getCurrentUser(@CurrentUser() user: { id: string }) {
    return this.userQueryService.getCurrentProfile(user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Get users',
  })
  @ApiOkResponse({
    description: 'Paginated users list.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    required: false,
  })
  @ApiQuery({
    name: 'status',
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: UserSortBy,
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: SortOrder,
  })
  @ApiQuery({
    name: 'fields',
    required: false,
    example: 'id,username,displayName',
  })
  async getUsers(
    @Query()
    query: QueryUsersDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    return this.userQueryService.getUsers(query);
  }

  @Get('profile/:username')
  @ApiOperation({
    summary: 'Get public user profile',
  })
  @ApiParam({
    name: 'username',
    description: 'User username',
    example: 'anandsingh',
  })
  @ApiOkResponse({
    type: PublicUserProfileDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  @Public()
  async getPublicProfile(
    @Param('username')
    username: string,
  ) {
    console.log('PROFILE:', username);
    return this.usersService.getPublicProfile(username);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
  })
  @ApiOkResponse({
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found.',
  })
  async getUserById(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
  ) {
    return this.userQueryService.getUserById(id);
  }

  @Permissions('users:create')
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Create a new user',
  })
  @ApiCreatedResponse({
    type: UserResponseDto,
  })
  @Post()
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createByAdmin(dto);
  }

  @Patch('me/profile')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateUserProfileDto,
  ) {
    console.log('   -----------------', user);
    return this.userProfileDomainService.updateProfile(user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: { id: string }) {
    return this.usersService.getMyProfile(user.id);
  }

  @Patch('me')
  updateMyProfile(
    @CurrentUser('id') userId: string,

    @Body()
    request: UpdateMyProfileRequest,
  ) {
    return this.usersService.updateMyProfile(userId, request);
  }
}
