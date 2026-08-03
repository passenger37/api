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
  HttpCode,
  HttpStatus,
  Delete,
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

import { SearchUsersRequest } from '../dto/request/search-users.request';

import { UpdateMyProfileRequest } from '../dto/request/update-my-profile.request';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { PublicUserProfileDto, UserResponseDto } from '../responses';
import { BlockedUserResponse } from '../dto/response/blocked-user.response';

import { QueryUsersDto, SortOrder, UserSortBy } from '../dto/query-users.dto';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { UsersService } from '../services/users.service';
import { UserQueryService } from '../services/user-query.service';
import { UserProfileDomainService } from '../services/user-profile-domain.service';

import { Public } from '../../../common/decorators/public.decorator';
import type { JwtUser } from '../../auth/interfaces/jwt-user.interface';

import { PaginationResponseDto } from 'src/common/dto/pagination-response.dto';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FollowerResponse } from '../dto/response/follower.response';
import { MutedUserResponse } from '../dto/response/muted-user.response';
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
  ): Promise<PaginationResponseDto<UserResponseDto>> {
    return this.userQueryService.getUsers(query);
  }

  // =====================================================
  // Search Users
  // =====================================================

  @Get('search')
  @ApiOperation({
    summary: 'Search users',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    example: 'anand',
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
  @ApiOkResponse({
    description: 'Users retrieved successfully.',
  })
  @Public()
  async searchUsers(
    @Query()
    request: SearchUsersRequest,
  ) {
    return this.usersService.searchUsers(request);
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

  @Post(':userId/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async followUser(
    @CurrentUser() user: JwtPayload,

    @Param('userId')
    followingId: string,
  ): Promise<void> {
    await this.usersService.followUser(user.sub, followingId);
  }

  @Delete(':userId/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async unfollowUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId') followingId: string,
  ): Promise<void> {
    await this.usersService.unfollowUser(user.sub, followingId);
  }

  @Get(':userId/followers')
  @ApiOperation({
    summary: 'Get followers of a user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
  })
  @ApiOkResponse({
    description: 'Followers retrieved successfully.',
    type: PaginationResponseDto,
  })
  @Public()
  async getFollowers(
    @Param('userId')
    userId: string,

    @Query()
    pagination: PaginationQueryDto,
  ): Promise<PaginationResponseDto<FollowerResponse>> {
    return this.usersService.getFollowers(userId, pagination);
  }

  @Get(':userId/following')
  @ApiOperation({
    summary: 'Get users followed by a user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
  })
  @ApiOkResponse({
    description: 'Following list retrieved successfully.',
    type: PaginationResponseDto,
  })
  @Public()
  async getFollowing(
    @Param('userId')
    userId: string,

    @Query()
    pagination: PaginationQueryDto,
  ): Promise<PaginationResponseDto<FollowerResponse>> {
    return this.usersService.getFollowing(userId, pagination);
  }

  @Get(':userId/mutual-connections')
  getMutualConnections(
    @CurrentUser() user: JwtPayload,

    @Param('userId') userId: string,

    @Query() pagination: PaginationQueryDto,
  ) {
    return this.usersService.getMutualConnections(user.sub, userId, pagination);
  }

  // =====================================================
  // Relationship Statistics
  // =====================================================

  @Get(':userId/stats')
  getRelationshipStats(
    @CurrentUser() user: JwtPayload,

    @Param('userId') userId: string,
  ) {
    return this.usersService.getRelationshipStats(user.sub, userId);
  }

  // =====================================================
  // Block User
  // =====================================================

  @Post(':userId/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  async blockUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.usersService.blockUser(user.sub, userId);
  }

  // =====================================================
  // Unblock User
  // =====================================================

  @Delete(':userId/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblockUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.usersService.unblockUser(user.sub, userId);
  }

  // =====================================================
  // Blocked Users
  // =====================================================

  @Get('me/blocked')
  async getBlockedUsers(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginationResponseDto<BlockedUserResponse>> {
    return this.usersService.getBlockedUsers(user.sub, pagination);
  }

  // =====================================================
  // Mute User
  // =====================================================

  @Post(':userId/mute')
  @HttpCode(HttpStatus.NO_CONTENT)
  async muteUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.usersService.muteUser(user.sub, userId);
  }

  // =====================================================
  // Unmute User
  // =====================================================

  @Delete(':userId/mute')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unmuteUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.usersService.unmuteUser(user.sub, userId);
  }

  // =====================================================
  // Get Muted Users
  // =====================================================

  @Get('me/muted')
  async getMutedUsers(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginationResponseDto<MutedUserResponse>> {
    return this.usersService.getMutedUsers(user.sub, pagination);
  }
}
